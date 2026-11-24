// @vitest-environment node
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import * as schema from '../db/schema'
import { createTestDatabase, type TestDatabase } from '../db/test-database'
import type { OutgoingEmail } from '../email'
import { acquireEditLock, createProject, loadProject, saveAnswers, setCategories } from '../projects/service'
import { listRequestsForProject, listStaffRequests } from './queries'
import { sendDueRequestReminders } from './reminders'
import {
  listRequestsForEntry,
  markRequestDone,
  openRequest,
  replyToRequest,
  resolveRequestAsStaff,
} from './service'

/**
 * Requests against a real Postgres, in a database of its own that is dropped afterwards
 * (entry_event is append-only, so nothing here may touch the shared one). The clock is always
 * passed in: the suite stands on either side of the deadline and of intake closing.
 */
const url = process.env.AWARDS_DATABASE_URL_UNPOOLED ?? process.env.AWARDS_DATABASE_URL

const H = 3_600_000
const T0 = new Date('2027-01-20T12:00:00Z') // intake open
const AFTER_CLOSE = new Date('2027-02-10T12:00:00Z')
const at = (ms: number, base = T0) => new Date(base.getTime() + ms)

describe.skipIf(!url)('requests', () => {
  let pool: Pool
  let scratch: TestDatabase
  let db: ReturnType<typeof drizzle<typeof schema>>
  let editionId: string

  beforeAll(async () => {
    scratch = await createTestDatabase(url!)
    pool = new Pool({ connectionString: scratch.url, max: 8 })
    db = drizzle(pool, { schema })
    ;[{ id: editionId }] = await db
      .select({ id: schema.edition.id })
      .from(schema.edition)
      .where(eq(schema.edition.year, 2026))
  }, 60_000)
  afterAll(async () => {
    await pool?.end()
    await scratch?.drop()
  })

  let n = 0
  const makeUser = async (name: string, preferredLocale: 'is' | 'en' | null = null) =>
    (
      await db
        .insert(schema.user)
        .values({ name, email: `req-${Date.now()}-${n++}@example.com`, preferredLocale })
        .returning({ id: schema.user.id })
    )[0].id
  const staffActor = async () => {
    const userId = await makeUser('Staff')
    await db.insert(schema.userRole).values({ userId, role: 'admin' })
    return { userId, roles: ['staff'] as const }
  }

  /** A project with one submitted entry (price locked), its creator holding no lock yet. */
  async function submittedProject(opts: { status?: schema.EntryStatus; categories?: string[] } = {}) {
    const owner = await makeUser('Anna', 'en')
    const { id } = await createProject(db, { userId: owner, locale: 'is', editionId })
    await acquireEditLock(db, { userId: owner, projectId: id, now: T0 })
    await setCategories(db, { userId: owner, projectId: id, categories: opts.categories ?? ['marketing-website'], now: T0 })
    await saveAnswers(db, { userId: owner, projectId: id, now: T0, patch: { answers: { title: 'Fjallavefur', links: ['https://example.is'] } } })
    const entries = await db.select().from(schema.entry).where(eq(schema.entry.projectId, id))
    const status = opts.status ?? 'submitted'
    await db
      .update(schema.entry)
      .set({
        status,
        submittedAt: T0,
        priceRegular: 14900,
        discountPercent: 30,
        priceAmount: 10900,
        priceLockedAt: T0,
      })
      .where(eq(schema.entry.id, entries[0].id))
    return { projectId: id, owner, entryId: entries[0].id, entries }
  }
  const entryRow = async (entryId: string) =>
    (await db.select().from(schema.entry).where(eq(schema.entry.id, entryId)))[0]
  const eventTypes = async (entryId: string) =>
    (await db.select().from(schema.entryEvent).where(eq(schema.entryEvent.entryId, entryId))).map((e) => e.type)
  const sink = () => {
    const sent: OutgoingEmail[] = []
    return { sent, deps: { send: async (m: OutgoingEmail) => void sent.push(m), siteUrl: 'https://svef.test' } }
  }
  const open = async (
    entryId: string,
    over: Partial<Parameters<typeof openRequest>[1]> = {},
    deps = sink().deps,
  ) => {
    const actor = await staffActor()
    return openRequest(
      db,
      { entryId, actor, message: 'Titillinn er rangur', fieldKeys: ['title'], deadlineAt: at(48 * H), now: T0, ...over },
      deps,
    )
  }

  describe('opening', () => {
    it('moves the entry to needs_clarification remembering where it was, leaving the price alone', async () => {
      const { entryId } = await submittedProject({ status: 'eligible' })
      const before = await entryRow(entryId)
      const r = await open(entryId)
      expect(r).toMatchObject({ ok: true, from: 'eligible', mail: 'sent' })
      const after = await entryRow(entryId)
      expect(after.status).toBe('needs_clarification')
      expect(after.statusBeforeClarification).toBe('eligible')
      expect([after.priceRegular, after.discountPercent, after.priceAmount, after.priceLockedAt]).toEqual([
        before.priceRegular,
        before.discountPercent,
        before.priceAmount,
        before.priceLockedAt,
      ])
      expect(await eventTypes(entryId)).toEqual(expect.arrayContaining(['request_opened', 'status_changed']))
    })

    it('a second request joins the first without losing the status to return to', async () => {
      const { entryId } = await submittedProject()
      await open(entryId)
      expect(await open(entryId, { fieldKeys: ['links'] })).toMatchObject({ ok: true })
      expect((await entryRow(entryId)).statusBeforeClarification).toBe('submitted')
      expect((await listRequestsForEntry(db, entryId, T0)).length).toBe(2)
    })

    it('refuses drafts and withdrawn entries, non-staff, and bad input', async () => {
      const d = await submittedProject({ status: 'draft' })
      expect(await open(d.entryId)).toMatchObject({ ok: false, reason: 'not_requestable' })
      const w = await submittedProject({ status: 'withdrawn' })
      expect(await open(w.entryId)).toMatchObject({ ok: false, reason: 'not_requestable' })

      const { entryId, owner } = await submittedProject()
      expect(
        await openRequest(db, { entryId, actor: { userId: owner, roles: ['creator'] }, message: 'hi', fieldKeys: [], deadlineAt: at(H), now: T0 }),
      ).toMatchObject({ ok: false, reason: 'not_staff' })
      expect(await open(entryId, { message: ' ' })).toMatchObject({ ok: false, reason: 'invalid', invalid: ['message'] })
      expect(await open(entryId, { fieldKeys: ['image', 'nonsense'] })).toMatchObject({ invalid: ['fields'] })
      expect(await open(entryId, { deadlineAt: T0 })).toMatchObject({ invalid: ['deadline'] })
      expect(await open('00000000-0000-7000-8000-000000000000')).toMatchObject({ reason: 'not_found' })
      // Nothing above changed the entry.
      expect((await entryRow(entryId)).status).toBe('submitted')
    })

    it('does not offer fields that are hidden for the entry, or the terms waiver', async () => {
      const { entryId } = await submittedProject() // marketing-website: no school/programme
      expect(await open(entryId, { fieldKeys: ['school'] })).toMatchObject({ invalid: ['fields'] })
      expect(await open(entryId, { fieldKeys: ['termsAccepted'] })).toMatchObject({ invalid: ['fields'] })
    })

    it('emails the creator and accepted editors in their own language, not pending editors', async () => {
      const { projectId, entryId, owner } = await submittedProject()
      const editor = await makeUser('Bjarni', 'is')
      const pending = await makeUser('Palli', 'is')
      await db.insert(schema.projectPerson).values([
        { projectId, kind: 'collaborator', name: 'Bjarni', email: 'b@example.com', canEdit: true, userId: editor, acceptedAt: T0 },
        { projectId, kind: 'collaborator', name: 'Palli', email: 'p@example.com', canEdit: true, userId: pending, invitedAt: T0 },
      ])
      const { sent, deps } = sink()
      const r = await open(entryId, { message: 'Lagaðu titilinn', deadlineAt: new Date('2027-01-25T15:30:00Z') }, deps)
      expect(r).toMatchObject({ ok: true, mail: 'sent' })
      expect(sent.length).toBe(2)
      const ownerEmail = (await db.select().from(schema.user).where(eq(schema.user.id, owner)))[0].email
      const toOwner = sent.find((m) => m.to === ownerEmail)!
      const toEditor = sent.find((m) => m.to !== ownerEmail)!
      expect(toOwner.subject).toMatch(/^A request from SVEF/)
      expect(toOwner.text).toContain('Lagaðu titilinn')
      expect(toOwner.text).toContain('25 January 2027')
      expect(toOwner.text).toContain(`https://svef.test/en/submissions/${projectId}`)
      expect(toEditor.subject).toMatch(/^Beiðni frá SVEF/)
      expect(toEditor.text).toContain(`https://svef.test/is/innsendingar/${projectId}`)
    })

    it('a failing mail server does not undo the request', async () => {
      const { entryId } = await submittedProject()
      const r = await open(entryId, {}, { send: async () => { throw new Error('smtp down') }, siteUrl: 'https://svef.test' })
      expect(r).toMatchObject({ ok: true, mail: 'failed' })
      expect((await entryRow(entryId)).status).toBe('needs_clarification')
    })
  })

  describe('replying and marking done', () => {
    async function withRequest(over: Parameters<typeof submittedProject>[0] = {}) {
      const p = await submittedProject(over)
      const r = await open(p.entryId)
      if (!r.ok) throw new Error('open failed')
      return { ...p, requestId: r.requestId }
    }

    it('lets the creator reply, building a short thread with both sides', async () => {
      const { requestId, owner, entryId } = await withRequest()
      const staff = await staffActor()
      expect(await replyToRequest(db, { requestId, side: 'entrant', actor: { userId: owner, roles: ['creator'] }, message: ' Búið að laga ', now: at(H) })).toMatchObject({ ok: true })
      expect(await replyToRequest(db, { requestId, side: 'staff', actor: staff, message: 'Takk!', now: at(2 * H) })).toMatchObject({ ok: true })
      const [view] = await listRequestsForEntry(db, entryId, at(3 * H))
      expect(view.replies.map((x) => [x.side, x.message])).toEqual([
        ['entrant', 'Búið að laga'],
        ['staff', 'Takk!'],
      ])
      expect(await eventTypes(entryId)).toContain('request_replied')
    })

    it('refuses empty replies and strangers', async () => {
      const { requestId, owner } = await withRequest()
      const stranger = await makeUser('Stranger')
      expect(await replyToRequest(db, { requestId, side: 'entrant', actor: { userId: owner, roles: [] }, message: '  ', now: T0 })).toMatchObject({ reason: 'empty_reply' })
      expect(await replyToRequest(db, { requestId, side: 'entrant', actor: { userId: stranger, roles: [] }, message: 'hi', now: T0 })).toMatchObject({ reason: 'forbidden' })
      // Entrant side cannot be claimed by a staff role holder either: staff reply as staff.
      expect(await replyToRequest(db, { requestId, side: 'staff', actor: { userId: owner, roles: ['creator'] }, message: 'hi', now: T0 })).toMatchObject({ reason: 'forbidden' })
    })

    it('"Mark as done" resolves it, keeps the optional reply, and returns the entry to its previous status', async () => {
      const { requestId, owner, entryId } = await withRequest({ status: 'eligibility_pending' })
      const before = await entryRow(entryId)
      const r = await markRequestDone(db, { requestId, actor: { userId: owner, roles: [] }, reply: 'Allt klárt', now: at(5 * H) })
      expect(r).toEqual({ ok: true, entryStatus: 'eligibility_pending', returned: true })
      const after = await entryRow(entryId)
      expect(after.status).toBe('eligibility_pending')
      expect(after.statusBeforeClarification).toBeNull()
      expect([after.priceAmount, after.discountPercent, after.priceLockedAt]).toEqual([before.priceAmount, before.discountPercent, before.priceLockedAt])
      const [view] = await listRequestsForEntry(db, entryId, at(6 * H))
      expect(view).toMatchObject({ status: 'resolved', resolvedByName: 'Anna' })
      expect(view.replies.map((x) => x.message)).toEqual(['Allt klárt'])
      expect(await eventTypes(entryId)).toEqual(expect.arrayContaining(['request_resolved']))
    })

    it('works without a reply, for an accepted editor, and not for others', async () => {
      const { requestId, projectId } = await withRequest()
      const editor = await makeUser('Bjarni')
      const pending = await makeUser('Palli')
      await db.insert(schema.projectPerson).values([
        { projectId, kind: 'collaborator', name: 'Bjarni', canEdit: true, email: 'b@example.com', userId: editor, acceptedAt: T0 },
        { projectId, kind: 'collaborator', name: 'Palli', canEdit: true, email: 'p@example.com', userId: pending, invitedAt: T0 },
      ])
      expect(await markRequestDone(db, { requestId, actor: { userId: pending, roles: [] }, now: at(H) })).toMatchObject({ reason: 'forbidden' })
      expect(await markRequestDone(db, { requestId, actor: { userId: editor, roles: [] }, now: at(H) })).toMatchObject({ ok: true, returned: true })
      expect(await markRequestDone(db, { requestId, actor: { userId: editor, roles: [] }, now: at(H) })).toMatchObject({ reason: 'already_resolved' })
    })

    it('keeps the entry waiting until the last request is resolved', async () => {
      const { entryId, owner } = await submittedProject()
      const a = (await open(entryId)) as { requestId: string }
      const b = (await open(entryId, { fieldKeys: ['links'] })) as { requestId: string }
      expect(await markRequestDone(db, { requestId: a.requestId, actor: { userId: owner, roles: [] }, now: at(H) })).toMatchObject({ ok: true, returned: false, entryStatus: 'needs_clarification' })
      expect((await entryRow(entryId)).status).toBe('needs_clarification')
      expect(await markRequestDone(db, { requestId: b.requestId, actor: { userId: owner, roles: [] }, now: at(2 * H) })).toMatchObject({ ok: true, returned: true, entryStatus: 'submitted' })
      expect((await entryRow(entryId)).status).toBe('submitted')
    })

    it('after the deadline the request is overdue: entrants cannot mark it done, staff can close it', async () => {
      const { requestId, owner, entryId } = await withRequest()
      const deadline = at(48 * H)
      expect((await listRequestsForEntry(db, entryId, at(48 * H - 1)))[0].status).toBe('open')
      expect((await listRequestsForEntry(db, entryId, deadline))[0].status).toBe('overdue')
      expect(await markRequestDone(db, { requestId, actor: { userId: owner, roles: [] }, now: deadline })).toMatchObject({ reason: 'overdue' })
      // Nothing happened by itself: still waiting.
      expect((await entryRow(entryId)).status).toBe('needs_clarification')
      // The entrant can still say something.
      expect(await replyToRequest(db, { requestId, side: 'entrant', actor: { userId: owner, roles: [] }, message: 'Sorry, late', now: at(50 * H) })).toMatchObject({ ok: true })
      const staff = await staffActor()
      expect(await resolveRequestAsStaff(db, { requestId, actor: { userId: owner, roles: ['creator'] }, now: at(51 * H) })).toMatchObject({ reason: 'forbidden' })
      expect(await resolveRequestAsStaff(db, { requestId, actor: staff, now: at(51 * H) })).toMatchObject({ ok: true, returned: true, entryStatus: 'submitted' })
      expect((await listRequestsForEntry(db, entryId, at(52 * H)))[0]).toMatchObject({ status: 'resolved', resolvedByName: 'Staff' })
    })
  })

  describe('unlocking, end to end through saveAnswers', () => {
    it('opens a locked field even after intake closes, until resolved; the edit lock still applies', async () => {
      const { projectId, owner, entryId } = await submittedProject()
      const lockedNow = (extra = 0) => at(extra, AFTER_CLOSE)

      // Before any request: title is locked, and after close so is everything else.
      await acquireEditLock(db, { userId: owner, projectId, now: lockedNow() })
      let r = await saveAnswers(db, { userId: owner, projectId, now: lockedNow(1), patch: { answers: { title: 'x', links: ['https://a.is'] } } })
      expect(r.saved).toEqual([])
      expect(r.rejected.map((x) => x.reason).sort()).toEqual(['intake_closed', 'intake_closed'])

      // Staff open a request (on the staff clock, after close) unlocking only the title.
      const opened = await open(entryId, { now: lockedNow(), deadlineAt: at(7 * 24 * H, AFTER_CLOSE), fieldKeys: ['title'] })
      expect(opened).toMatchObject({ ok: true })
      const view = await loadProject(db, { userId: owner, projectId, now: lockedNow(2) })
      expect(view.editability.title).toEqual({ editable: true, reason: 'open_request' })
      expect(view.editability.links.editable).toBe(false)

      r = await saveAnswers(db, { userId: owner, projectId, now: lockedNow(3), patch: { answers: { title: 'Nýr titill', links: ['https://b.is'] } } })
      expect(r.saved).toEqual(['title'])
      expect(r.rejected).toEqual([{ fieldKey: 'links', reason: 'intake_closed' }])

      // Without the edit lock nothing is written, request or not.
      const other = await makeUser('Other')
      await db.insert(schema.projectPerson).values({ projectId, kind: 'collaborator', name: 'O', canEdit: true, email: 'o@example.com', userId: other, acceptedAt: T0 })
      await expect(saveAnswers(db, { userId: other, projectId, now: lockedNow(4), patch: { answers: { title: 'sneaky' } } })).rejects.toMatchObject({ code: 'lock_required' })

      // Mark done: the field locks again straight away.
      const [req] = await listRequestsForEntry(db, entryId, lockedNow(5))
      await markRequestDone(db, { requestId: req.id, actor: { userId: owner, roles: [] }, now: lockedNow(5) })
      r = await saveAnswers(db, { userId: owner, projectId, now: lockedNow(6), patch: { answers: { title: 'again' } } })
      expect(r.saved).toEqual([])
      expect(r.rejected).toEqual([{ fieldKey: 'title', reason: 'intake_closed' }])
      expect((await entryRow(entryId)).status).toBe('submitted')
    })

    it('relocks when the deadline passes, without anyone acting', async () => {
      const { projectId, owner, entryId } = await submittedProject()
      await open(entryId, { now: AFTER_CLOSE, deadlineAt: at(24 * H, AFTER_CLOSE), fieldKeys: ['title'] })
      // The edit lock lapses after 20 minutes, so it is (re)taken a moment before each save.
      await acquireEditLock(db, { userId: owner, projectId, now: at(24 * H - 60_000, AFTER_CLOSE) })
      const during = await saveAnswers(db, { userId: owner, projectId, now: at(24 * H - 1, AFTER_CLOSE), patch: { answers: { title: 'In time' } } })
      expect(during.saved).toEqual(['title'])
      await acquireEditLock(db, { userId: owner, projectId, now: at(24 * H, AFTER_CLOSE) })
      const late = await saveAnswers(db, { userId: owner, projectId, now: at(24 * H, AFTER_CLOSE), patch: { answers: { title: 'Too late' } } })
      expect(late.saved).toEqual([])
      expect(late.rejected).toEqual([{ fieldKey: 'title', reason: 'intake_closed' }])
    })

    it('unlocks a normally locked field before close too (locked after submit)', async () => {
      const { projectId, owner, entryId } = await submittedProject()
      await acquireEditLock(db, { userId: owner, projectId, now: at(1) })
      const before = await saveAnswers(db, { userId: owner, projectId, now: at(2), patch: { answers: { title: 'x' } } })
      expect(before.rejected).toEqual([{ fieldKey: 'title', reason: 'locked_after_submit' }])
      await open(entryId, { fieldKeys: ['title'], now: at(3) })
      const after = await saveAnswers(db, { userId: owner, projectId, now: at(4), patch: { answers: { title: 'Fixed' } } })
      expect(after.saved).toEqual(['title'])
    })
  })

  describe('reading', () => {
    it("lists a project's requests for entrants and the unresolved ones for staff, overdue first", async () => {
      const { projectId, entryId, owner } = await submittedProject()
      await open(entryId, { deadlineAt: at(10 * H) })
      await open(entryId, { deadlineAt: at(100 * H), fieldKeys: ['links'] })
      const mine = await listRequestsForProject(db, projectId, at(20 * H))
      expect(mine.map((v) => [v.status, v.category])).toEqual([
        ['overdue', 'marketing-website'],
        ['open', 'marketing-website'],
      ])
      const staff = (await listStaffRequests(db, { editionId, now: at(20 * H) })).filter((r) => r.entryId === entryId)
      expect(staff.map((s) => s.status)).toEqual(['overdue', 'open'])
      expect((await listStaffRequests(db, { editionId, now: at(20 * H), status: 'open' })).filter((r) => r.entryId === entryId).length).toBe(1)
      await markRequestDone(db, { requestId: mine[1].id, actor: { userId: owner, roles: [] }, now: at(21 * H) })
      expect((await listStaffRequests(db, { editionId, now: at(22 * H) })).filter((r) => r.entryId === entryId).length).toBe(1)
    })
  })

  describe('reminders', () => {
    async function requestDueIn(ms: number, over: Partial<Parameters<typeof openRequest>[1]> = {}) {
      const p = await submittedProject()
      await open(p.entryId, { deadlineAt: at(ms), ...over })
      const [req] = await db.select().from(schema.entryRequest).where(eq(schema.entryRequest.entryId, p.entryId))
      return { ...p, req }
    }
    const mine = (sent: OutgoingEmail[], to: string) => sent.filter((m) => m.to === to)
    const ownerEmail = async (id: string) => (await db.select().from(schema.user).where(eq(schema.user.id, id)))[0].email

    it('sends once, one to two days before the deadline, and never twice', async () => {
      const { owner, req } = await requestDueIn(72 * H)
      const { sent, deps } = sink()
      const to = await ownerEmail(owner)
      // Almost three days out: not yet.
      await sendDueRequestReminders(db, { now: at(H) }, deps)
      expect(mine(sent, to)).toEqual([])
      // 23 h left: due.
      const first = await sendDueRequestReminders(db, { now: at(49 * H) }, deps)
      expect(first.reminded.map((r) => r.requestId)).toContain(req.id)
      expect(mine(sent, to).length).toBe(1)
      expect(mine(sent, to)[0].subject).toMatch(/Reminder/)
      // Again, and an hour later, and concurrently: nothing more.
      await sendDueRequestReminders(db, { now: at(49 * H) }, deps)
      await sendDueRequestReminders(db, { now: at(50 * H) }, deps)
      await Promise.all([1, 2, 3].map(() => sendDueRequestReminders(db, { now: at(51 * H) }, deps)))
      expect(mine(sent, to).length).toBe(1)
      const [row] = await db.select().from(schema.entryRequest).where(eq(schema.entryRequest.id, req.id))
      expect(row.reminderSentAt).not.toBeNull()
      expect(await eventTypes(req.entryId)).toContain('request_reminder_sent')
    })

    it('skips resolved, overdue and short-notice requests', async () => {
      const resolved = await requestDueIn(72 * H)
      await markRequestDone(db, { requestId: resolved.req.id, actor: { userId: resolved.owner, roles: [] }, now: at(H) })
      const overdue = await requestDueIn(30 * H)
      const short = await requestDueIn(10 * H) // opened with less than the lead time to run
      const { sent, deps } = sink()
      await sendDueRequestReminders(db, { now: at(49 * H) }, deps) // resolved: 23 h left; overdue: deadline passed
      expect(mine(sent, await ownerEmail(resolved.owner))).toEqual([])
      expect(mine(sent, await ownerEmail(overdue.owner))).toEqual([])
      expect(mine(sent, await ownerEmail(short.owner))).toEqual([])
    })

    it('releases the claim when nobody could be reached, so the next run retries', async () => {
      const { owner, req } = await requestDueIn(72 * H)
      const failing = { send: async () => { throw new Error('down') }, siteUrl: 'https://svef.test' }
      const r1 = await sendDueRequestReminders(db, { now: at(49 * H) }, failing)
      expect(r1.reminded.find((x) => x.requestId === req.id)?.result).toBe('failed')
      expect((await db.select().from(schema.entryRequest).where(eq(schema.entryRequest.id, req.id)))[0].reminderSentAt).toBeNull()
      const { sent, deps } = sink()
      await sendDueRequestReminders(db, { now: at(50 * H) }, deps)
      expect(mine(sent, await ownerEmail(owner)).length).toBe(1)
    })
  })

  it('every request event names its request', async () => {
    const { entryId } = await submittedProject()
    await open(entryId)
    const evs = await db
      .select()
      .from(schema.entryEvent)
      .where(and(eq(schema.entryEvent.entryId, entryId), eq(schema.entryEvent.type, 'request_opened')))
    expect((evs[0].data as { requestId: string; fieldKeys: string[] }).fieldKeys).toEqual(['title'])
  })
})
