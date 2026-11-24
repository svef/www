import { and, eq, gte, inArray, isNull, lt } from 'drizzle-orm'
import { appendEntryEvent } from '../db/entry-event'
import { entryFile } from '../db/schema'
import { fieldEditability } from '../editability'
import { getField } from '../fields'
import { formatError } from '../messages'
import { AwardsError } from '../projects/errors'
import type { AwardsDb, Queryable } from '../projects/db-types'
import { requireLock } from '../projects/lock'
import { loadContext, requireRole, type Clock } from '../projects/service'
import { validateImageMeta, type FieldError } from '../validation'
import { cleanFileName, newObjectKey } from './keys'
import { inspectImage } from './inspect'
import { currentImage, loadProjectImage, toImage } from './queries'
import type { ObjectStore, ProjectImage } from './types'

/**
 * The presentation image: a presigned upload straight to the private bucket,
 * then the server looks at the object itself before it counts. `entry_file` goes
 * `pending` → `available` (1080 × 1080, PNG or JPG, at most 10 MB, judged on the bytes) or
 * `rejected` (with the exact reason, and the object deleted). A project has at most one live
 * image: a new one that becomes available soft-deletes the previous record and deletes its object.
 *
 * Every write needs the edit lock and the image's editability (an open request can unlock it
 * after intake closes), the same as autosave, and logs events.
 */

const FIELD_KEY = 'image'
/** The presigned PUT is valid this long. */
export const UPLOAD_URL_TTL_S = 300
/** The presigned GET for previews is valid this long. */
export const PREVIEW_URL_TTL_S = 300
/** A `pending` file older than this was never finished and is swept. */
export const PENDING_MAX_AGE_MS = 60 * 60 * 1000
/** Upload slots handed out per project per window, so a loop cannot fill the bucket. */
const MAX_PENDING = 10

type Message = { is: string; en: string }

export type ImageOutcome =
  | { status: 'available'; image: ProjectImage }
  | { status: 'rejected'; errors: { code: string; message: Message }[] }


/** Throws unless the image field can be changed now (intake open, or an open request unlocks it). */
async function assertEditable(tx: Queryable, projectId: string, now: Date) {
  const ctx = await loadContext(tx, projectId)
  const e = fieldEditability(getField(FIELD_KEY), {
    now,
    intakeClosesBefore: ctx.intakeClosesBefore,
    entries: ctx.entries.map((x) => ({ category: x.category, status: x.status })),
    requests: ctx.requests,
  })
  if (!e.editable)
    throw new AwardsError(
      e.reason === 'intake_closed' ? 'intake_closed' : 'invalid_input',
      e.reason === 'intake_closed'
        ? 'Submissions are closed, so the image can no longer be changed.'
        : 'The image cannot be changed.',
    )
  return ctx
}

const fieldErrors = (errors: FieldError[]) =>
  new AwardsError('invalid_input', errors[0]?.message.en ?? 'The image is not valid.', {
    fieldErrors: errors,
  })

/** Deletes objects after the transaction that dropped their records; a failure is logged, not fatal (the sweep is the net). */
async function dropObjects(store: ObjectStore, keys: string[]) {
  for (const key of keys) {
    try {
      await store.remove(key)
    } catch (e) {
      console.error('[awards] could not delete object', key, e)
    }
  }
}

// ── 1. Presign ──────────────────────────────────────────────────────────────

export type UploadSlot = {
  fileId: string
  url: string
  headers: Record<string, string>
  expiresInSeconds: number
}

/**
 * Hands out a presigned PUT for one file. The declared type and size are checked here so a
 * file that cannot be accepted is never uploaded; the server checks the bytes again in
 * `finalizeImageUpload`.
 */
export async function requestImageUpload(
  db: AwardsDb,
  store: ObjectStore,
  args: {
    userId: string
    projectId: string
    fileName: string
    contentType: string
    sizeBytes: number
  } & Clock,
): Promise<UploadSlot> {
  const { userId, projectId } = args
  const now = args.now ?? new Date()
  await requireRole(db, userId, projectId)
  const rule = getField(FIELD_KEY).validation!
  if (!Number.isInteger(args.sizeBytes) || args.sizeBytes <= 0)
    throw new AwardsError('invalid_input', 'The file is empty.')
  // Dimensions are only knowable from the bytes: pass the required ones through so only
  // the declared type and size can fail here.
  const declared = validateImageMeta({
    width: rule.width,
    height: rule.height,
    type: args.contentType,
    bytes: args.sizeBytes,
  })
  if (declared.length) throw fieldErrors(declared)

  const { fileId, key } = await db.transaction(async (tx) => {
    await requireLock(tx, { projectId, userId, now, ttlMs: args.ttlMs })
    const ctx = await assertEditable(tx, projectId, now)
    const since = new Date(now.getTime() - PENDING_MAX_AGE_MS)
    const open = await tx
      .select({ id: entryFile.id })
      .from(entryFile)
      .where(
        and(
          eq(entryFile.projectId, projectId),
          eq(entryFile.fieldKey, FIELD_KEY),
          eq(entryFile.status, 'pending'),
          isNull(entryFile.deletedAt),
          gte(entryFile.createdAt, since),
        ),
      )
    if (open.length >= MAX_PENDING)
      throw new AwardsError('invalid_input', 'Too many uploads are waiting. Try again later.')
    const r2Key = newObjectKey({
      editionYear: ctx.edition.year,
      projectId,
      contentType: args.contentType,
    })
    const [row] = await tx
      .insert(entryFile)
      .values({
        projectId,
        fieldKey: FIELD_KEY,
        r2Key,
        fileName: cleanFileName(args.fileName),
        contentType: args.contentType,
        sizeBytes: args.sizeBytes,
        status: 'pending',
      })
      .returning({ id: entryFile.id })
    return { fileId: row.id, key: r2Key }
  })

  const { url, headers } = await store.presignPut({
    key,
    contentType: args.contentType,
    sizeBytes: args.sizeBytes,
    expiresInSeconds: UPLOAD_URL_TTL_S,
  })
  return { fileId, url, headers, expiresInSeconds: UPLOAD_URL_TTL_S }
}

// ── 2/3. Finalize ───────────────────────────────────────────────────────────

/**
 * The server's look at an uploaded object. The type comes from the magic bytes, the size from
 * the bucket, the dimensions from the decoder. Good: `available`, the previous image is replaced.
 * Not good: `rejected` with the exact reason, and the object is deleted. Safe to call twice:
 * a file that is no longer `pending` just reports where it ended up.
 */
export async function finalizeImageUpload(
  db: AwardsDb,
  store: ObjectStore,
  args: { userId: string; projectId: string; fileId: string } & Clock,
): Promise<ImageOutcome> {
  const { userId, projectId, fileId } = args
  const now = args.now ?? new Date()
  await requireRole(db, userId, projectId)

  const file = await db.transaction(async (tx) => {
    await requireLock(tx, { projectId, userId, now, ttlMs: args.ttlMs })
    await assertEditable(tx, projectId, now)
    const [row] = await tx
      .select()
      .from(entryFile)
      .where(
        and(
          eq(entryFile.id, fileId),
          eq(entryFile.projectId, projectId),
          eq(entryFile.fieldKey, FIELD_KEY),
          isNull(entryFile.deletedAt),
        ),
      )
    if (!row) throw new AwardsError('not_found', 'Upload not found.')
    return row
  })
  if (file.status === 'available') return { status: 'available', image: toImage(file) }
  if (file.status === 'rejected')
    return {
      status: 'rejected',
      errors: [{ code: 'rejected', message: formatError('invalid') }],
    }

  const rule = getField(FIELD_KEY).validation!
  const head = await store.head(file.r2Key)
  if (!head)
    throw new AwardsError('upload_missing', 'The file did not arrive. Try uploading it again.')

  let errors: FieldError[] = []
  let real: { type: string; bytes: number } = { type: file.contentType, bytes: head.sizeBytes }
  if (head.sizeBytes > rule.maxBytes) {
    // Not read at all: it is refused on size alone.
    errors = validateImageMeta({
      width: rule.width,
      height: rule.height,
      type: file.contentType,
      bytes: head.sizeBytes,
    })
  } else {
    const bytes = await store.read(file.r2Key)
    if (!bytes)
      throw new AwardsError('upload_missing', 'The file did not arrive. Try uploading it again.')
    const seen = await inspectImage(bytes)
    if (!seen.ok) {
      errors = [
        {
          fieldKey: FIELD_KEY,
          path: [FIELD_KEY],
          code: 'imageType',
          message: formatError('imageType'),
        },
      ]
    } else {
      real = { type: seen.type, bytes: bytes.length }
      errors = validateImageMeta({
        width: seen.width,
        height: seen.height,
        type: seen.type,
        bytes: bytes.length,
      })
    }
  }

  if (errors.length) {
    // Delete first: if that fails the row stays pending and the sweep retries both.
    await store.remove(file.r2Key)
    await db.transaction(async (tx) => {
      const [row] = await tx
        .update(entryFile)
        .set({ status: 'rejected', updatedAt: now })
        .where(and(eq(entryFile.id, file.id), eq(entryFile.status, 'pending')))
        .returning({ id: entryFile.id })
      if (!row) return false
      await appendEntryEvent(tx, {
        projectId,
        actorUserId: userId,
        type: 'image_rejected',
        fieldKey: FIELD_KEY,
        data: {
          fileId: file.id,
          fileName: file.fileName,
          reasons: errors.map((e) => e.code),
          message: errors[0].message.en,
        },
      })
      return true
    })
    return { status: 'rejected', errors: errors.map((e) => ({ code: e.code, message: e.message })) }
  }

  const replaced: string[] = []
  const outcome = await db.transaction(async (tx) => {
    await requireLock(tx, { projectId, userId, now, ttlMs: args.ttlMs })
    const [row] = await tx
      .update(entryFile)
      .set({
        status: 'available',
        contentType: real.type,
        sizeBytes: real.bytes,
        updatedAt: now,
      })
      .where(and(eq(entryFile.id, file.id), eq(entryFile.status, 'pending')))
      .returning()
    // Finalized by someone else in the meantime: report that result.
    if (!row) return null
    const previous = await tx
      .select({ id: entryFile.id, r2Key: entryFile.r2Key })
      .from(entryFile)
      .where(
        and(
          eq(entryFile.projectId, projectId),
          eq(entryFile.fieldKey, FIELD_KEY),
          eq(entryFile.status, 'available'),
          isNull(entryFile.deletedAt),
        ),
      )
    const old = previous.filter((p) => p.id !== file.id)
    if (old.length) {
      await tx
        .update(entryFile)
        .set({ deletedAt: now, updatedAt: now })
        .where(
          inArray(
            entryFile.id,
            old.map((p) => p.id),
          ),
        )
      replaced.push(...old.map((p) => p.r2Key))
    }
    await appendEntryEvent(tx, {
      projectId,
      actorUserId: userId,
      type: 'image_uploaded',
      fieldKey: FIELD_KEY,
      data: {
        fileId: row.id,
        fileName: row.fileName,
        contentType: row.contentType,
        sizeBytes: row.sizeBytes,
        replacedFileIds: old.map((p) => p.id),
      },
    })
    return row
  })
  await dropObjects(store, replaced)
  if (!outcome) {
    const live = await loadProjectImage(db, projectId)
    if (live) return { status: 'available', image: live }
    return { status: 'rejected', errors: [{ code: 'rejected', message: formatError('invalid') }] }
  }
  return { status: 'available', image: toImage(outcome) }
}

// ── Remove ──────────────────────────────────────────────────────────────────

/** Removes the project's image (the records are soft-deleted, the objects deleted). */
export async function removeImage(
  db: AwardsDb,
  store: ObjectStore,
  args: { userId: string; projectId: string } & Clock,
): Promise<void> {
  const { userId, projectId } = args
  const now = args.now ?? new Date()
  await requireRole(db, userId, projectId)
  const keys: string[] = []
  await db.transaction(async (tx) => {
    await requireLock(tx, { projectId, userId, now, ttlMs: args.ttlMs })
    await assertEditable(tx, projectId, now)
    const rows = await tx
      .select()
      .from(entryFile)
      .where(
        and(
          eq(entryFile.projectId, projectId),
          eq(entryFile.fieldKey, FIELD_KEY),
          inArray(entryFile.status, ['available', 'pending']),
          isNull(entryFile.deletedAt),
        ),
      )
    if (!rows.length) return
    await tx
      .update(entryFile)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        inArray(
          entryFile.id,
          rows.map((r) => r.id),
        ),
      )
    keys.push(...rows.map((r) => r.r2Key))
    for (const r of rows.filter((x) => x.status === 'available'))
      await appendEntryEvent(tx, {
        projectId,
        actorUserId: userId,
        type: 'image_removed',
        fieldKey: FIELD_KEY,
        data: { fileId: r.id, fileName: r.fileName },
      })
  })
  await dropObjects(store, keys)
}

// ── Preview ─────────────────────────────────────────────────────────────────

/** A short-lived signed URL for the project's image, for anyone with access to the project. */
export async function imagePreviewUrl(
  db: AwardsDb,
  store: ObjectStore,
  args: { userId: string; projectId: string },
): Promise<string | null> {
  await requireRole(db, args.userId, args.projectId)
  const row = await currentImage(db, args.projectId)
  return row ? store.presignGet({ key: row.r2Key, expiresInSeconds: PREVIEW_URL_TTL_S }) : null
}

/** For the staff view: the signed URL for a file the caller already loaded. */
export function signedImageUrl(store: ObjectStore, r2Key: string): Promise<string> {
  return store.presignGet({ key: r2Key, expiresInSeconds: PREVIEW_URL_TTL_S })
}

// ── Orphans ─────────────────────────────────────────────────────────────────

/**
 * Rejects `pending` files older than an hour (the upload never finished, or its finalize
 * never came) and deletes their objects. Idempotent; safe to run from several places.
 */
export async function sweepPendingFiles(
  db: AwardsDb,
  store: ObjectStore,
  args: { now: Date; maxAgeMs?: number },
): Promise<{ swept: number }> {
  const cutoff = new Date(args.now.getTime() - (args.maxAgeMs ?? PENDING_MAX_AGE_MS))
  const stale = await db
    .select()
    .from(entryFile)
    .where(
      and(eq(entryFile.status, 'pending'), isNull(entryFile.deletedAt), lt(entryFile.createdAt, cutoff)),
    )
  let swept = 0
  for (const f of stale) {
    try {
      await store.remove(f.r2Key)
      await db.transaction(async (tx) => {
        const [row] = await tx
          .update(entryFile)
          .set({ status: 'rejected', updatedAt: args.now })
          .where(and(eq(entryFile.id, f.id), eq(entryFile.status, 'pending')))
          .returning({ id: entryFile.id })
        if (!row) return
        await appendEntryEvent(tx, {
          projectId: f.projectId,
          type: 'image_expired',
          fieldKey: f.fieldKey,
          data: { fileId: f.id, fileName: f.fileName },
        })
        swept += 1
      })
    } catch (e) {
      console.error('[awards] could not sweep pending file', f.id, e)
    }
  }
  return { swept }
}
