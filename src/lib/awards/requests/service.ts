import { and, asc, count, eq, inArray, isNull } from 'drizzle-orm'
import { appendEntryEvent } from '../db/entry-event'
import {
  edition,
  entry,
  entryRequest,
  entryRequestReply,
  project,
  userRole,
  user,
} from '../db/schema'
import { getRole } from '../projects/service'
import type { AwardsDb, Queryable, Tx } from '../projects/db-types'
import {
  can,
  resolveClarification,
  transition,
  type Role,
} from '../status'
import type { EntryStatus } from '../types'
import { notifyRequestOpened, type NotifyDeps, type NotifyResult } from './notify'
import { requestableFields } from './fields'
import {
  MAX_REPLY_LENGTH,
  requestStatus,
  validateOpenRequest,
  type OpenRequestInvalid,
  type RequestStatus,
} from './rules'

/**
 * Requests with deadlines (spec §5 "Requests", §8): staff open a request on an entry, which
 * moves it to `needs_clarification` remembering where it was; the entrant answers (a short
 * thread) and presses "Mark as done", and the entry returns to that status once no request on
 * it is left unresolved. The price is never touched and none of this is a resubmission.
 *
 * The fields a request unlocks are honoured by `fieldEditability` (editability.ts) through
 * `saveAnswers`, so they are editable even after intake closes, until the request is
 * resolved or the deadline passes. An *overdue* request is not resolved: it keeps the entry in
 * `needs_clarification` until staff resolve it, because what happens next is their decision.
 *
 * Every function takes `now` (entrants: the request clock, staff: the staff clock) and writes
 * its `entry_event`s in the same transaction as the change.
 */

export type RequestActor = { userId: string; roles: readonly Role[] }

export type ReplyView = {
  id: string
  authorName: string
  side: 'staff' | 'entrant'
  message: string
  createdAt: Date
}

export type RequestView = {
  id: string
  entryId: string
  /** Slug of the entry's category. */
  category: string
  authorName: string
  message: string
  fieldKeys: string[]
  deadlineAt: Date
  createdAt: Date
  resolvedAt: Date | null
  resolvedByName: string | null
  status: RequestStatus
  replies: ReplyView[]
}

// ── Open ────────────────────────────────────────────────────────────────────

export type OpenRequestDenied =
  | 'not_staff'
  | 'not_found'
  | 'not_requestable'
  | 'invalid'

export type OpenRequestResult =
  | { ok: true; requestId: string; from: EntryStatus; mail: NotifyResult }
  | { ok: false; reason: OpenRequestDenied; invalid?: OpenRequestInvalid[] }

export async function openRequest(
  db: AwardsDb,
  input: {
    entryId: string
    actor: RequestActor
    message: string
    fieldKeys: readonly string[]
    deadlineAt: Date | null
    now: Date
  },
  deps: NotifyDeps = {},
): Promise<OpenRequestResult> {
  if (!can('open_request', input.actor.roles)) return { ok: false, reason: 'not_staff' }
  const { entryId, now } = input

  const outcome = await db.transaction(async (tx) => {
    const [row] = await tx
      .select({
        status: entry.status,
        previous: entry.statusBeforeClarification,
        projectId: entry.projectId,
        opens: edition.intakeOpensAt,
        closes: edition.intakeClosesBefore,
      })
      .from(entry)
      .innerJoin(project, eq(project.id, entry.projectId))
      .innerJoin(edition, eq(edition.id, project.editionId))
      .where(and(eq(entry.id, entryId), isNull(entry.deletedAt), isNull(project.deletedAt)))
      .for('update', { of: entry })
    if (!row) return { ok: false, reason: 'not_found' } as const

    const from = row.status as EntryStatus
    // A second request on an entry that is already waiting just joins the first.
    let to: { status: EntryStatus; previousStatus: EntryStatus | null } = {
      status: from,
      previousStatus: row.previous as EntryStatus | null,
    }
    if (from !== 'needs_clarification') {
      const t = transition(
        { status: from, previousStatus: null },
        'needs_clarification',
        'staff',
        { now, intakeOpensAt: row.opens, intakeClosesBefore: row.closes },
      )
      if (!t.ok) return { ok: false, reason: 'not_requestable' } as const
      to = t.state
    }

    const allowed = (await requestableFields(tx, entryId)).map((f) => f.key)
    const invalid = validateOpenRequest(
      { message: input.message, fieldKeys: input.fieldKeys, deadlineAt: input.deadlineAt },
      now,
      allowed,
    )
    if (invalid.length) return { ok: false, reason: 'invalid', invalid } as const

    const fieldKeys = [...new Set(input.fieldKeys)]
    const [req] = await tx
      .insert(entryRequest)
      .values({
        entryId,
        authorUserId: input.actor.userId,
        message: input.message.trim(),
        fieldKeys,
        deadlineAt: input.deadlineAt as Date,
      })
      .returning({ id: entryRequest.id })

    if (to.status !== from) {
      await tx
        .update(entry)
        .set({ status: to.status, statusBeforeClarification: to.previousStatus })
        .where(eq(entry.id, entryId))
      await appendEntryEvent(tx, {
        projectId: row.projectId,
        entryId,
        actorUserId: input.actor.userId,
        type: 'status_changed',
        fieldKey: 'status',
        before: { status: from },
        after: { status: to.status },
        data: { requestId: req.id },
      })
    }
    await appendEntryEvent(tx, {
      projectId: row.projectId,
      entryId,
      actorUserId: input.actor.userId,
      type: 'request_opened',
      data: {
        requestId: req.id,
        fieldKeys,
        deadlineAt: (input.deadlineAt as Date).toISOString(),
      },
    })
    return { ok: true, requestId: req.id, from } as const
  })
  if (!outcome.ok) return outcome

  // After the commit: a failing mail server must not undo the request.
  const mail = await notifyRequestOpened(db, outcome.requestId, deps)
  return { ...outcome, mail }
}

// ── Replies and resolving ───────────────────────────────────────────────────

export type RequestActionDenied =
  | 'not_found'
  | 'forbidden'
  | 'already_resolved'
  /** Entrants: the deadline passed, so only staff can still close it. */
  | 'overdue'
  | 'empty_reply'
  | 'reply_too_long'

export type ReplyResult =
  | { ok: true; replyId: string }
  | { ok: false; reason: RequestActionDenied }

type Loaded = {
  id: string
  entryId: string
  projectId: string
  deadlineAt: Date
  resolvedAt: Date | null
  status: EntryStatus
  previous: EntryStatus | null
}

/** The request with its entry row locked, so two people acting at once see each other. */
async function loadForUpdate(tx: Tx, requestId: string): Promise<Loaded | null> {
  const [row] = await tx
    .select({
      id: entryRequest.id,
      entryId: entryRequest.entryId,
      projectId: entry.projectId,
      deadlineAt: entryRequest.deadlineAt,
      resolvedAt: entryRequest.resolvedAt,
      status: entry.status,
      previous: entry.statusBeforeClarification,
    })
    .from(entryRequest)
    .innerJoin(entry, eq(entry.id, entryRequest.entryId))
    .innerJoin(project, eq(project.id, entry.projectId))
    .where(
      and(
        eq(entryRequest.id, requestId),
        isNull(entryRequest.deletedAt),
        isNull(entry.deletedAt),
        isNull(project.deletedAt),
      ),
    )
    .for('update', { of: entry })
  if (!row) return null
  return { ...row, status: row.status as EntryStatus, previous: row.previous as EntryStatus | null }
}

/** `entrant`: the project's creator or an accepted editor. `staff`: the staff role. */
async function authorise(
  tx: Queryable,
  side: 'entrant' | 'staff',
  actor: RequestActor,
  projectId: string,
): Promise<'creator' | 'editor' | 'staff' | null> {
  if (side === 'staff') return can('open_request', actor.roles) ? 'staff' : null
  const role = await getRole(tx, actor.userId, projectId)
  return role && can('answer_request', [role]) ? role : null
}

function cleanReply(message: string): { ok: true; text: string } | { ok: false; reason: 'empty_reply' | 'reply_too_long' } {
  const text = message.trim()
  if (text === '') return { ok: false, reason: 'empty_reply' }
  if (text.length > MAX_REPLY_LENGTH) return { ok: false, reason: 'reply_too_long' }
  return { ok: true, text }
}

/** Adds a message to the thread. Either side, while the request is not resolved (overdue still counts). */
export async function replyToRequest(
  db: AwardsDb,
  input: { requestId: string; side: 'entrant' | 'staff'; actor: RequestActor; message: string; now: Date },
): Promise<ReplyResult> {
  const clean = cleanReply(input.message)
  if (!clean.ok) return clean
  return db.transaction(async (tx) => {
    const req = await loadForUpdate(tx, input.requestId)
    if (!req) return { ok: false, reason: 'not_found' } as const
    if (!(await authorise(tx, input.side, input.actor, req.projectId)))
      return { ok: false, reason: 'forbidden' } as const
    if (req.resolvedAt) return { ok: false, reason: 'already_resolved' } as const
    const [reply] = await tx
      .insert(entryRequestReply)
      .values({ requestId: req.id, authorUserId: input.actor.userId, message: clean.text })
      .returning({ id: entryRequestReply.id })
    await appendEntryEvent(tx, {
      projectId: req.projectId,
      entryId: req.entryId,
      actorUserId: input.actor.userId,
      type: 'request_replied',
      data: { requestId: req.id, replyId: reply.id, side: input.side },
    })
    return { ok: true, replyId: reply.id } as const
  })
}

export type ResolveResult =
  | { ok: true; entryStatus: EntryStatus; returned: boolean }
  | { ok: false; reason: RequestActionDenied }

async function resolveInTx(
  tx: Tx,
  req: Loaded,
  args: { userId: string; side: 'entrant' | 'staff'; reply: string | null; now: Date },
): Promise<ResolveResult> {
  if (args.reply) {
    const [reply] = await tx
      .insert(entryRequestReply)
      .values({ requestId: req.id, authorUserId: args.userId, message: args.reply })
      .returning({ id: entryRequestReply.id })
    await appendEntryEvent(tx, {
      projectId: req.projectId,
      entryId: req.entryId,
      actorUserId: args.userId,
      type: 'request_replied',
      data: { requestId: req.id, replyId: reply.id, side: args.side },
    })
  }
  await tx
    .update(entryRequest)
    .set({ resolvedAt: args.now, resolvedBy: args.userId })
    .where(eq(entryRequest.id, req.id))
  await appendEntryEvent(tx, {
    projectId: req.projectId,
    entryId: req.entryId,
    actorUserId: args.userId,
    type: 'request_resolved',
    data: { requestId: req.id, by: args.side, overdue: args.now.getTime() >= req.deadlineAt.getTime() },
  })

  // "Open" for the return trip means unresolved: an overdue request still holds the entry.
  const [{ remaining }] = await tx
    .select({ remaining: count() })
    .from(entryRequest)
    .where(
      and(
        eq(entryRequest.entryId, req.entryId),
        isNull(entryRequest.resolvedAt),
        isNull(entryRequest.deletedAt),
      ),
    )
  const back = resolveClarification(
    { status: req.status, previousStatus: req.previous },
    args.side === 'staff' ? 'staff' : 'creator',
    remaining,
  )
  if (!back.ok || back.state.status === req.status)
    return { ok: true, entryStatus: req.status, returned: false }
  await tx
    .update(entry)
    .set({ status: back.state.status, statusBeforeClarification: null })
    .where(eq(entry.id, req.entryId))
  await appendEntryEvent(tx, {
    projectId: req.projectId,
    entryId: req.entryId,
    actorUserId: args.userId,
    type: 'status_changed',
    fieldKey: 'status',
    before: { status: req.status },
    after: { status: back.state.status },
    data: { requestId: req.id },
  })
  return { ok: true, entryStatus: back.state.status, returned: true }
}

/**
 * "Mark as done" (entrant: creator or accepted editor), with an optional reply. Only while the
 * deadline has not passed: afterwards the fields are locked again and closing it is staff's call.
 */
export async function markRequestDone(
  db: AwardsDb,
  input: { requestId: string; actor: RequestActor; reply?: string | null; now: Date },
): Promise<ResolveResult> {
  let reply: string | null = null
  if (input.reply && input.reply.trim() !== '') {
    const clean = cleanReply(input.reply)
    if (!clean.ok) return clean
    reply = clean.text
  }
  return db.transaction(async (tx) => {
    const req = await loadForUpdate(tx, input.requestId)
    if (!req) return { ok: false, reason: 'not_found' } as const
    if (!(await authorise(tx, 'entrant', input.actor, req.projectId)))
      return { ok: false, reason: 'forbidden' } as const
    if (req.resolvedAt) return { ok: false, reason: 'already_resolved' } as const
    if (input.now.getTime() >= req.deadlineAt.getTime())
      return { ok: false, reason: 'overdue' } as const
    return resolveInTx(tx, req, { userId: input.actor.userId, side: 'entrant', reply, now: input.now })
  })
}

/** Staff close a request, open or overdue, e.g. after reading the reply or when the deadline lapsed. */
export async function resolveRequestAsStaff(
  db: AwardsDb,
  input: { requestId: string; actor: RequestActor; now: Date },
): Promise<ResolveResult> {
  return db.transaction(async (tx) => {
    const req = await loadForUpdate(tx, input.requestId)
    if (!req) return { ok: false, reason: 'not_found' } as const
    if (!(await authorise(tx, 'staff', input.actor, req.projectId)))
      return { ok: false, reason: 'forbidden' } as const
    if (req.resolvedAt) return { ok: false, reason: 'already_resolved' } as const
    return resolveInTx(tx, req, { userId: input.actor.userId, side: 'staff', reply: null, now: input.now })
  })
}

// ── Reading ─────────────────────────────────────────────────────────────────

/** Requests with their threads for some entries (staff: one entry; entrants: a project's). Newest first. */
async function loadViews(
  q: Queryable,
  entryIds: readonly string[],
  slugOf: Map<string, string>,
  now: Date,
): Promise<RequestView[]> {
  if (entryIds.length === 0) return []
  const rows = await q
    .select()
    .from(entryRequest)
    .where(and(inArray(entryRequest.entryId, [...entryIds]), isNull(entryRequest.deletedAt)))
    .orderBy(asc(entryRequest.deadlineAt), asc(entryRequest.createdAt))
  if (rows.length === 0) return []
  const replies = await q
    .select()
    .from(entryRequestReply)
    .where(
      and(
        inArray(entryRequestReply.requestId, rows.map((r) => r.id)),
        isNull(entryRequestReply.deletedAt),
      ),
    )
    .orderBy(asc(entryRequestReply.createdAt), asc(entryRequestReply.id))

  const userIds = [
    ...new Set([
      ...rows.flatMap((r) => [r.authorUserId, r.resolvedBy].filter((x): x is string => !!x)),
      ...replies.map((r) => r.authorUserId),
    ]),
  ]
  const users = userIds.length
    ? await q.select({ id: user.id, name: user.name }).from(user).where(inArray(user.id, userIds))
    : []
  const names = new Map(users.map((u) => [u.id, u.name]))
  const staff = userIds.length
    ? new Set(
        (
          await q
            .select({ id: userRole.userId })
            .from(userRole)
            .where(
              and(
                inArray(userRole.userId, userIds),
                eq(userRole.role, 'staff'),
                isNull(userRole.deletedAt),
              ),
            )
        ).map((r) => r.id),
      )
    : new Set<string>()

  return rows.map((r) => ({
    id: r.id,
    entryId: r.entryId,
    category: slugOf.get(r.entryId) ?? '',
    authorName: names.get(r.authorUserId) ?? '',
    message: r.message,
    fieldKeys: r.fieldKeys,
    deadlineAt: r.deadlineAt,
    createdAt: r.createdAt,
    resolvedAt: r.resolvedAt,
    resolvedByName: r.resolvedBy ? (names.get(r.resolvedBy) ?? null) : null,
    status: requestStatus(r, now),
    replies: replies
      .filter((p) => p.requestId === r.id)
      .map((p) => ({
        id: p.id,
        authorName: names.get(p.authorUserId) ?? '',
        side: staff.has(p.authorUserId) ? ('staff' as const) : ('entrant' as const),
        message: p.message,
        createdAt: p.createdAt,
      })),
  }))
}

/** The staff entry view's list: every request on one entry, resolved ones included. */
export async function listRequestsForEntry(
  q: Queryable,
  entryId: string,
  now: Date,
): Promise<RequestView[]> {
  return loadViews(q, [entryId], new Map(), now)
}
