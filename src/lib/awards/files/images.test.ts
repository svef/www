// @vitest-environment node
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestDatabase, type TestDatabase } from '../db/test-database'
import * as schema from '../db/schema'
import { AwardsError } from '../projects/errors'
import { acquireEditLock, createProject, loadProject, setCategories } from '../projects/service'
import { png, jpeg } from './fixtures'
import {
  finalizeImageUpload,
  imagePreviewUrl,
  PENDING_MAX_AGE_MS,
  removeImage,
  requestImageUpload,
  sweepPendingFiles,
} from './images'
import type { ObjectStore } from './types'

/** An in-memory bucket: `put` plays the browser's PUT to the presigned URL. */
function fakeStore() {
  const objects = new Map<string, Buffer>()
  const store: ObjectStore = {
    presignPut: async ({ key, contentType, sizeBytes }) => ({
      url: `https://bucket.test/put/${key}?len=${sizeBytes}`,
      headers: { 'Content-Type': contentType },
    }),
    presignGet: async ({ key }) => `https://bucket.test/get/${key}`,
    head: async (key) => (objects.has(key) ? { sizeBytes: objects.get(key)!.length } : null),
    read: async (key) => objects.get(key) ?? null,
    remove: async (key) => void objects.delete(key),
  }
  return { store, objects }
}

const url = process.env.AWARDS_DATABASE_URL_UNPOOLED ?? process.env.AWARDS_DATABASE_URL

describe.skipIf(!url)('image upload service', () => {
  let pool: Pool
  let scratch: TestDatabase
  let db: ReturnType<typeof drizzle<typeof schema>>
  const T0 = new Date()
  const at = (ms: number) => new Date(T0.getTime() + ms)

  beforeAll(async () => {
    scratch = await createTestDatabase(url!)
    pool = new Pool({ connectionString: scratch.url, max: 8 })
    db = drizzle(pool, { schema })
  }, 60_000)
  afterAll(async () => {
    await pool?.end()
    await scratch?.drop()
  })

  let n = 0
  async function editing(now = T0) {
    const [u] = await db
      .insert(schema.user)
      .values({ name: 'Anna', email: `img-${Date.now()}-${n++}@example.com` })
      .returning({ id: schema.user.id })
    const [ed] = await db.select({ id: schema.edition.id }).from(schema.edition).where(eq(schema.edition.year, 2026))
    const { id } = await createProject(db, { userId: u.id, locale: 'en', editionId: ed.id })
    await acquireEditLock(db, { userId: u.id, projectId: id, now })
    return { id, owner: u.id }
  }
  const slot = async (
    s: ReturnType<typeof fakeStore>,
    p: { id: string; owner: string },
    bytes: Buffer,
    over: Partial<{ contentType: string; sizeBytes: number; now: Date }> = {},
  ) => {
    const r = await requestImageUpload(db, s.store, {
      userId: p.owner,
      projectId: p.id,
      fileName: 'logo.png',
      contentType: over.contentType ?? 'image/png',
      sizeBytes: over.sizeBytes ?? bytes.length,
      now: over.now ?? T0,
    })
    const [row] = await db.select().from(schema.entryFile).where(eq(schema.entryFile.id, r.fileId))
    return { ...r, key: row.r2Key }
  }
  const refusal = async (p: Promise<unknown>) => {
    try {
      await p
    } catch (e) {
      if (e instanceof AwardsError) return e
      throw e
    }
    throw new Error('expected a refusal')
  }
  const events = async (projectId: string, type: string) =>
    (await db.select().from(schema.entryEvent).where(eq(schema.entryEvent.projectId, projectId))).filter(
      (e) => e.type === type,
    )

  it('presigns a pending file under awards/<year>/<project>/<uuid>.png', async () => {
    const s = fakeStore()
    const p = await editing()
    const b = await png(1080, 1080)
    const r = await slot(s, p, b)
    expect(r.url).toContain(`awards/2026/${p.id}/`)
    expect(r.key).toMatch(new RegExp(`^awards/2026/${p.id}/[0-9a-f-]{36}\\.png$`))
    expect(r.headers).toEqual({ 'Content-Type': 'image/png' })
    const [row] = await db.select().from(schema.entryFile).where(eq(schema.entryFile.id, r.fileId))
    expect(row).toMatchObject({ status: 'pending', fieldKey: 'image', fileName: 'logo.png', sizeBytes: b.length })
  })

  it('refuses a declared type or size that cannot be accepted, before any row exists', async () => {
    const s = fakeStore()
    const p = await editing()
    const type = await refusal(slot(s, p, Buffer.alloc(10), { contentType: 'image/gif' }))
    expect(type.code).toBe('invalid_input')
    expect(type.details.fieldErrors?.[0].code).toBe('imageType')
    const big = await refusal(slot(s, p, Buffer.alloc(10), { sizeBytes: 10 * 1024 * 1024 + 1 }))
    expect(big.details.fieldErrors?.[0].code).toBe('imageSize')
    await refusal(slot(s, p, Buffer.alloc(10), { sizeBytes: 0 }))
    expect(await db.select().from(schema.entryFile).where(eq(schema.entryFile.projectId, p.id))).toHaveLength(0)
  })

  it('needs the edit lock and project access', async () => {
    const s = fakeStore()
    const p = await editing()
    const [other] = await db
      .insert(schema.user)
      .values({ name: 'Bob', email: `img-b-${Date.now()}@example.com` })
      .returning({ id: schema.user.id })
    const stranger = await refusal(
      requestImageUpload(db, s.store, { userId: other.id, projectId: p.id, fileName: 'a.png', contentType: 'image/png', sizeBytes: 5, now: T0 }),
    )
    expect(stranger.code).toBe('forbidden')
    const lapsed = await refusal(slot(s, p, Buffer.alloc(5), { now: at(21 * 60_000) }))
    expect(lapsed.code).toBe('lock_required')
  })

  it('accepts a 1080 × 1080 PNG: available, with an event, and the project shows it', async () => {
    const s = fakeStore()
    const p = await editing()
    const b = await png(1080, 1080)
    const r = await slot(s, p, b)
    s.objects.set(r.key, b)
    const out = await finalizeImageUpload(db, s.store, { userId: p.owner, projectId: p.id, fileId: r.fileId, now: at(1000) })
    expect(out).toMatchObject({ status: 'available', image: { id: r.fileId, contentType: 'image/png', sizeBytes: b.length } })
    expect((await events(p.id, 'image_uploaded'))).toHaveLength(1)
    const view = await loadProject(db, { userId: p.owner, projectId: p.id, now: at(1000) })
    expect(view.image?.id).toBe(r.fileId)
    expect(await imagePreviewUrl(db, s.store, { userId: p.owner, projectId: p.id })).toBe(`https://bucket.test/get/${r.key}`)
  })

  it('rejects 1200 × 800 with the exact message and deletes the object', async () => {
    const s = fakeStore()
    const p = await editing()
    const b = await png(1200, 800)
    const r = await slot(s, p, b)
    s.objects.set(r.key, b)
    const out = await finalizeImageUpload(db, s.store, { userId: p.owner, projectId: p.id, fileId: r.fileId, now: at(1000) })
    expect(out.status).toBe('rejected')
    if (out.status === 'rejected') {
      expect(out.errors[0].message.en).toBe('This image is 1200 × 800, it needs to be 1080 × 1080.')
    }
    expect(s.objects.has(r.key)).toBe(false)
    const [row] = await db.select().from(schema.entryFile).where(eq(schema.entryFile.id, r.fileId))
    expect(row.status).toBe('rejected')
    expect(await events(p.id, 'image_rejected')).toHaveLength(1)
    expect((await loadProject(db, { userId: p.owner, projectId: p.id, now: at(1000) })).image).toBeNull()
  })

  it('judges the real bytes: a JPEG declared as PNG is accepted as JPEG, a non-image is rejected', async () => {
    const s = fakeStore()
    const p = await editing()
    const j = await jpeg(1080, 1080)
    const a = await slot(s, p, j, { contentType: 'image/png' })
    s.objects.set(a.key, j)
    const ok = await finalizeImageUpload(db, s.store, { userId: p.owner, projectId: p.id, fileId: a.fileId, now: at(1000) })
    expect(ok).toMatchObject({ status: 'available', image: { contentType: 'image/jpeg' } })

    const junk = Buffer.from('definitely not an image')
    const b = await slot(s, p, junk)
    s.objects.set(b.key, junk)
    const bad = await finalizeImageUpload(db, s.store, { userId: p.owner, projectId: p.id, fileId: b.fileId, now: at(2000) })
    expect(bad).toMatchObject({ status: 'rejected', errors: [{ code: 'imageType' }] })
    // the earlier image is untouched
    expect((await loadProject(db, { userId: p.owner, projectId: p.id, now: at(2000) })).image?.id).toBe(a.fileId)
  })

  it('refuses an object over 10 MB on its size alone, without reading it', async () => {
    const s = fakeStore()
    const p = await editing()
    const r = await slot(s, p, Buffer.alloc(10), { sizeBytes: 5 })
    s.objects.set(r.key, Buffer.alloc(10 * 1024 * 1024 + 1))
    let reads = 0
    const read = s.store.read
    s.store.read = async (k) => (reads++, read(k))
    const out = await finalizeImageUpload(db, s.store, { userId: p.owner, projectId: p.id, fileId: r.fileId, now: at(1000) })
    expect(out).toMatchObject({ status: 'rejected', errors: [{ code: 'imageSize' }] })
    expect(reads).toBe(0)
    expect(s.objects.has(r.key)).toBe(false)
  })

  it('reports a file that never arrived and leaves it pending', async () => {
    const s = fakeStore()
    const p = await editing()
    const r = await slot(s, p, Buffer.alloc(5))
    const e = await refusal(finalizeImageUpload(db, s.store, { userId: p.owner, projectId: p.id, fileId: r.fileId, now: at(1000) }))
    expect(e.code).toBe('upload_missing')
    const [row] = await db.select().from(schema.entryFile).where(eq(schema.entryFile.id, r.fileId))
    expect(row.status).toBe('pending')
  })

  it('replacing soft-deletes the previous record and deletes its object', async () => {
    const s = fakeStore()
    const p = await editing()
    const b1 = await png(1080, 1080)
    const first = await slot(s, p, b1)
    s.objects.set(first.key, b1)
    await finalizeImageUpload(db, s.store, { userId: p.owner, projectId: p.id, fileId: first.fileId, now: at(1000) })
    const b2 = await jpeg(1080, 1080)
    const second = await slot(s, p, b2, { contentType: 'image/jpeg', now: at(2000) })
    s.objects.set(second.key, b2)
    await finalizeImageUpload(db, s.store, { userId: p.owner, projectId: p.id, fileId: second.fileId, now: at(3000) })
    expect(s.objects.has(first.key)).toBe(false)
    expect(s.objects.has(second.key)).toBe(true)
    const [old] = await db.select().from(schema.entryFile).where(eq(schema.entryFile.id, first.fileId))
    expect(old.deletedAt).not.toBeNull()
    expect((await loadProject(db, { userId: p.owner, projectId: p.id, now: at(3000) })).image?.id).toBe(second.fileId)
    const up = await events(p.id, 'image_uploaded')
    expect(up).toHaveLength(2)
    expect((up[1].data as { replacedFileIds: string[] }).replacedFileIds).toEqual([first.fileId])
  })

  it('finalizing twice is harmless', async () => {
    const s = fakeStore()
    const p = await editing()
    const b = await png(1080, 1080)
    const r = await slot(s, p, b)
    s.objects.set(r.key, b)
    const args = { userId: p.owner, projectId: p.id, fileId: r.fileId, now: at(1000) }
    await finalizeImageUpload(db, s.store, args)
    expect(await finalizeImageUpload(db, s.store, args)).toMatchObject({ status: 'available' })
    expect(await events(p.id, 'image_uploaded')).toHaveLength(1)
  })

  it('remove clears the image and its object', async () => {
    const s = fakeStore()
    const p = await editing()
    const b = await png(1080, 1080)
    const r = await slot(s, p, b)
    s.objects.set(r.key, b)
    await finalizeImageUpload(db, s.store, { userId: p.owner, projectId: p.id, fileId: r.fileId, now: at(1000) })
    await removeImage(db, s.store, { userId: p.owner, projectId: p.id, now: at(2000) })
    expect(s.objects.size).toBe(0)
    expect((await loadProject(db, { userId: p.owner, projectId: p.id, now: at(2000) })).image).toBeNull()
    expect(await events(p.id, 'image_removed')).toHaveLength(1)
    expect(await imagePreviewUrl(db, s.store, { userId: p.owner, projectId: p.id })).toBeNull()
  })

  describe('editability', () => {
    const closed = new Date('2027-02-02T00:00:00Z')

    it('is editable after submitting but not after intake closes', async () => {
      const s = fakeStore()
      const p = await editing(closed)
      const e = await refusal(slot(s, p, Buffer.alloc(5), { now: closed }))
      expect(e.code).toBe('intake_closed')
      const rm = await refusal(removeImage(db, s.store, { userId: p.owner, projectId: p.id, now: closed }))
      expect(rm.code).toBe('intake_closed')
    })

    it('an open request that unlocks the image makes it editable after close; a resolved one does not', async () => {
      const s = fakeStore()
      const p = await editing()
      await setCategories(db, { userId: p.owner, projectId: p.id, categories: ['app'], now: T0 })
      await acquireEditLock(db, { userId: p.owner, projectId: p.id, now: closed })
      const [entry] = await db.select().from(schema.entry).where(eq(schema.entry.projectId, p.id))
      if (!entry) throw new Error('no entry to attach a request to')
      const [staff] = await db
        .insert(schema.user)
        .values({ name: 'Staff', email: `img-s-${Date.now()}@example.com` })
        .returning({ id: schema.user.id })
      const [req] = await db
        .insert(schema.entryRequest)
        .values({ entryId: entry.id, authorUserId: staff.id, message: 'new image', fieldKeys: ['image'], deadlineAt: new Date(closed.getTime() + 3_600_000) })
        .returning({ id: schema.entryRequest.id })
      const b = await png(1080, 1080)
      const r = await slot(s, p, b, { now: closed })
      s.objects.set(r.key, b)
      expect((await finalizeImageUpload(db, s.store, { userId: p.owner, projectId: p.id, fileId: r.fileId, now: closed })).status).toBe('available')
      // past the deadline: locked again
      const late = new Date(closed.getTime() + 2 * 3_600_000)
      await acquireEditLock(db, { userId: p.owner, projectId: p.id, now: late })
      expect((await refusal(slot(s, p, b, { now: late }))).code).toBe('intake_closed')
      // resolved: locked
      await db.update(schema.entryRequest).set({ resolvedAt: closed }).where(eq(schema.entryRequest.id, req.id))
      expect((await refusal(slot(s, p, b, { now: new Date(late.getTime() + 1000) }))).code).toBe('intake_closed')
    })
  })

  it('caps the number of uploads waiting at once', async () => {
    const s = fakeStore()
    const p = await editing()
    for (let i = 0; i < 10; i++) await slot(s, p, Buffer.alloc(5))
    expect((await refusal(slot(s, p, Buffer.alloc(5)))).code).toBe('invalid_input')
  })

  it('sweeps pending files older than an hour: rejected, object deleted, event logged', async () => {
    const s = fakeStore()
    const p = await editing()
    const old = await slot(s, p, Buffer.alloc(5))
    s.objects.set(old.key, Buffer.alloc(5))
    // `createdAt` is the database clock (real time), so "old" is judged against a sweep time in the future.
    const fresh = await slot(s, p, Buffer.alloc(5))
    const r = await sweepPendingFiles(db, s.store, { now: new Date(Date.now() + PENDING_MAX_AGE_MS + 60_000) })
    expect(r.swept).toBeGreaterThanOrEqual(2)
    const rows = await db
      .select()
      .from(schema.entryFile)
      .where(and(eq(schema.entryFile.projectId, p.id), eq(schema.entryFile.status, 'rejected')))
    expect(rows.map((x) => x.id).sort()).toEqual([old.fileId, fresh.fileId].sort())
    expect(s.objects.has(old.key)).toBe(false)
    expect((await events(p.id, 'image_expired')).length).toBe(2)
    // a second run finds nothing
    expect((await sweepPendingFiles(db, s.store, { now: new Date(Date.now() + 2 * PENDING_MAX_AGE_MS) })).swept).toBe(0)
  })

  it('leaves a recent pending file alone', async () => {
    const s = fakeStore()
    const p = await editing()
    const r = await slot(s, p, Buffer.alloc(5))
    await sweepPendingFiles(db, s.store, { now: new Date(Date.now() + 30 * 60_000) })
    const [row] = await db.select().from(schema.entryFile).where(eq(schema.entryFile.id, r.fileId))
    expect(row.status).toBe('pending')
  })
})
