// @vitest-environment node
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import {
  EARLY,
  entriesOf,
  eventsOf,
  makeProject,
  makeUser,
  REGULAR,
  refusal,
  type Db,
} from '../bulk/test-helpers'
import { createTestDatabase, type TestDatabase } from '../db/test-database'
import * as schema from '../db/schema'
import { earlyBirdPrice } from '../pricing'
import { acquireEditLock, setCategories } from './service'
import { submitEntries } from './submit'
import { withdrawEntry } from './withdraw'

/**
 * Withdrawing: creator only, from submitted only, before close; it clears the price
 * lock, and submitting the entry again re-prices it by the day it happens.
 */
const url = process.env.AWARDS_DATABASE_URL_UNPOOLED ?? process.env.AWARDS_DATABASE_URL

describe.skipIf(!url)('withdrawing', () => {
  let pool: Pool
  let scratch: TestDatabase
  let db: Db

  beforeAll(async () => {
    scratch = await createTestDatabase(url!)
    pool = new Pool({ connectionString: scratch.url, max: 8 })
    db = drizzle(pool, { schema })
  }, 60_000)
  afterAll(async () => {
    await pool?.end()
    await scratch?.drop()
  })

  const mail = () => vi.fn(async () => undefined)
  const submitAll = (userId: string, projectId: string, now = EARLY) =>
    submitEntries(db, { userId, projectId, acceptTerms: true, now }, { send: mail() })

  async function submitted(categories = ['app']) {
    const owner = await makeUser(db, 'Anna')
    const p = await makeProject(db, owner, categories)
    await submitAll(owner.id, p.id)
    const rows = await entriesOf(db, p.id)
    return { owner, ...p, rows }
  }

  it('withdraws a submitted entry, clears the price lock and logs what was given up', async () => {
    const { owner, id, rows } = await submitted()
    const before = rows[0]
    expect(before.priceAmount).toBe(earlyBirdPrice(before.priceRegular!, 30))
    const r = await withdrawEntry(db, { userId: owner.id, projectId: id, entryId: before.id, now: EARLY })
    expect(r.clearedPrice).toMatchObject({ amount: before.priceAmount, discountPercent: 30 })
    const [after] = await entriesOf(db, id)
    expect(after.status).toBe('withdrawn')
    expect([after.priceRegular, after.discountPercent, after.priceAmount, after.priceLockedAt]).toEqual([
      null,
      null,
      null,
      null,
    ])
    const [event] = await eventsOf(db, id, 'entry_withdrawn')
    expect(event).toMatchObject({
      entryId: before.id,
      actorUserId: owner.id,
      before: { status: 'submitted' },
      after: { status: 'withdrawn' },
    })
    expect(event.data).toMatchObject({ clearedPriceAmount: before.priceAmount, clearedDiscountPercent: 30 })
  })

  it('is the creator’s alone: an editor who holds the lock is refused', async () => {
    const { owner, id, rows } = await submitted()
    const editor = await makeUser(db, 'Bjarni')
    await db.insert(schema.projectPerson).values({
      projectId: id, kind: 'collaborator', name: 'B', role: 'Developer', email: 'b@example.com',
      canEdit: true, userId: editor.id, acceptedAt: EARLY,
    })
    const later = new Date(EARLY.getTime() + 21 * 60_000) // the owner's lock has lapsed
    await acquireEditLock(db, { userId: editor.id, projectId: id, now: later })
    const e = await refusal(withdrawEntry(db, { userId: editor.id, projectId: id, entryId: rows[0].id, now: later }))
    expect(e.code).toBe('forbidden')
    expect((await entriesOf(db, id))[0].status).toBe('submitted')
    expect(owner.id).not.toBe(editor.id)
  })

  it('needs the edit lock', async () => {
    const { owner, id, rows } = await submitted()
    const lapsed = new Date(EARLY.getTime() + 21 * 60_000)
    const e = await refusal(withdrawEntry(db, { userId: owner.id, projectId: id, entryId: rows[0].id, now: lapsed }))
    expect(e.code).toBe('lock_required')
  })

  it('only withdraws from submitted: not a draft, not an entry already withdrawn', async () => {
    const owner = await makeUser(db, 'Anna')
    const { id } = await makeProject(db, owner, ['app'])
    const [draft] = await entriesOf(db, id)
    expect((await refusal(withdrawEntry(db, { userId: owner.id, projectId: id, entryId: draft.id, now: EARLY }))).code).toBe(
      'not_withdrawable',
    )
    await submitAll(owner.id, id)
    await withdrawEntry(db, { userId: owner.id, projectId: id, entryId: draft.id, now: EARLY })
    expect((await refusal(withdrawEntry(db, { userId: owner.id, projectId: id, entryId: draft.id, now: EARLY }))).code).toBe(
      'not_withdrawable',
    )
  })

  it('is refused from the closing moment on', async () => {
    const { owner, id, rows, ed } = await submitted()
    const closes = ed.intakeClosesBefore
    const justBefore = new Date(closes.getTime() - 1000)
    await acquireEditLock(db, { userId: owner.id, projectId: id, now: closes })
    expect((await refusal(withdrawEntry(db, { userId: owner.id, projectId: id, entryId: rows[0].id, now: closes }))).code).toBe(
      'intake_closed',
    )
    await acquireEditLock(db, { userId: owner.id, projectId: id, now: justBefore })
    await withdrawEntry(db, { userId: owner.id, projectId: id, entryId: rows[0].id, now: justBefore })
    expect((await entriesOf(db, id))[0].status).toBe('withdrawn')
  })

  const openRequestOn = async (entryId: string, authorUserId: string, deadlineAt: Date) =>
    (
      await db
        .insert(schema.entryRequest)
        .values({ entryId, authorUserId, message: 'Skýrið betur', fieldKeys: ['title'], deadlineAt })
        .returning({ id: schema.entryRequest.id })
    )[0].id

  it('closes the entry\'s unresolved requests when it is withdrawn, as the creator, with an event', async () => {
    const { owner, id, rows } = await submitted()
    const staff = await makeUser(db, 'Starfsmaður')
    const pending = await openRequestOn(rows[0].id, staff.id, new Date(EARLY.getTime() + 86_400_000))
    const overdue = await openRequestOn(rows[0].id, staff.id, new Date(EARLY.getTime() - 1))
    await withdrawEntry(db, { userId: owner.id, projectId: id, entryId: rows[0].id, now: EARLY })
    const reqs = await db.select().from(schema.entryRequest).where(eq(schema.entryRequest.entryId, rows[0].id))
    expect(reqs).toHaveLength(2)
    for (const r of reqs) {
      expect(r.resolvedAt?.toISOString()).toBe(EARLY.toISOString())
      expect(r.resolvedBy).toBe(owner.id)
    }
    const events = await eventsOf(db, id, 'request_resolved')
    expect(events.map((e) => e.data)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ requestId: pending, by: 'entrant', overdue: false, withdrawn: true }),
        expect.objectContaining({ requestId: overdue, by: 'entrant', overdue: true, withdrawn: true }),
      ]),
    )
  })

  it('leaves other entries\' requests and already resolved ones alone', async () => {
    const { owner, id, rows } = await submitted(['app', 'marketing-website'])
    const staff = await makeUser(db, 'Starfsmaður')
    const [a, b] = rows
    const done = await openRequestOn(a.id, staff.id, EARLY)
    await db.update(schema.entryRequest).set({ resolvedAt: new Date(0), resolvedBy: staff.id }).where(eq(schema.entryRequest.id, done))
    const other = await openRequestOn(b.id, staff.id, new Date(EARLY.getTime() + 86_400_000))
    await withdrawEntry(db, { userId: owner.id, projectId: id, entryId: a.id, now: EARLY })
    const byId = async (rid: string) =>
      (await db.select().from(schema.entryRequest).where(eq(schema.entryRequest.id, rid)))[0]
    expect((await byId(done)).resolvedAt?.getTime()).toBe(0)
    expect((await byId(other)).resolvedAt).toBeNull()
  })

  it('an entry waiting on a request (needs_clarification) cannot be withdrawn, and its request stays open', async () => {
    const { owner, id, rows } = await submitted()
    const staff = await makeUser(db, 'Starfsmaður')
    const req = await openRequestOn(rows[0].id, staff.id, new Date(EARLY.getTime() + 86_400_000))
    await db.update(schema.entry).set({ status: 'needs_clarification', statusBeforeClarification: 'submitted' }).where(eq(schema.entry.id, rows[0].id))
    const e = await refusal(withdrawEntry(db, { userId: owner.id, projectId: id, entryId: rows[0].id, now: EARLY }))
    expect(e.code).toBe('not_withdrawable')
    const [r] = await db.select().from(schema.entryRequest).where(eq(schema.entryRequest.id, req))
    expect(r.resolvedAt).toBeNull()
    expect((await entriesOf(db, id))[0].status).toBe('needs_clarification')
  })

  it('re-prices on submitting again: a December early price becomes the regular price in January', async () => {
    const { owner, id, rows } = await submitted()
    const entryId = rows[0].id
    expect(rows[0].discountPercent).toBe(30)
    await withdrawEntry(db, { userId: owner.id, projectId: id, entryId, now: EARLY })

    await acquireEditLock(db, { userId: owner.id, projectId: id, now: REGULAR })
    const send = mail()
    const r = await submitEntries(
      db,
      { userId: owner.id, projectId: id, entryId, acceptTerms: false, now: REGULAR },
      { send },
    )
    expect(r.submitted).toMatchObject([{ entryId, early: false }])
    const [again] = await entriesOf(db, id)
    expect(again.status).toBe('submitted')
    expect(again.discountPercent).toBe(0)
    expect(again.priceAmount).toBe(again.priceRegular)
    expect(again.priceAmount).toBeGreaterThan(rows[0].priceAmount!)
    expect(again.submittedAt?.toISOString()).toBe(REGULAR.toISOString())
    expect(send).toHaveBeenCalledTimes(1)
    expect((await eventsOf(db, id, 'entry_submitted')).length).toBe(2)
  })

  it('re-prices at the early-bird boundary itself: the last second is early, the bound is regular', async () => {
    for (const [at, early] of [
      [new Date('2027-01-04T23:59:59Z'), true],
      [new Date('2027-01-05T00:00:00Z'), false],
    ] as const) {
      const { owner, id, rows } = await submitted()
      await withdrawEntry(db, { userId: owner.id, projectId: id, entryId: rows[0].id, now: EARLY })
      await acquireEditLock(db, { userId: owner.id, projectId: id, now: at })
      const r = await submitEntries(
        db,
        { userId: owner.id, projectId: id, entryId: rows[0].id, acceptTerms: false, now: at },
        { send: mail() },
      )
      expect(r.submitted[0].early).toBe(early)
    }
  })

  it('submitting again before the early bird ends gives the early price again', async () => {
    const { owner, id, rows } = await submitted()
    await withdrawEntry(db, { userId: owner.id, projectId: id, entryId: rows[0].id, now: EARLY })
    const r = await submitEntries(
      db,
      { userId: owner.id, projectId: id, entryId: rows[0].id, acceptTerms: false, now: EARLY },
      { send: mail() },
    )
    expect(r.submitted[0].early).toBe(true)
  })

  it('the all-at-once submit takes drafts only and leaves a withdrawn entry alone', async () => {
    const { owner, id, rows } = await submitted(['app', 'marketing-website'])
    const app = rows.find((e) => e.categoryId && e.status === 'submitted')!
    await withdrawEntry(db, { userId: owner.id, projectId: id, entryId: app.id, now: EARLY })
    const send = mail()
    const r = await submitEntries(db, { userId: owner.id, projectId: id, acceptTerms: true, now: EARLY }, { send })
    expect(r.submitted).toEqual([])
    expect(r.receipt).toBe('none')
    expect(send).not.toHaveBeenCalled()
    expect((await entriesOf(db, id)).find((e) => e.id === app.id)!.status).toBe('withdrawn')
  })

  it('refuses to submit a withdrawn entry again when it now clashes with the project’s other categories', async () => {
    // Fyrirtækjavefur is select-one: a withdrawn tier cannot come back beside another tier.
    const owner = await makeUser(db, 'Anna')
    const { id } = await makeProject(db, owner, ['company-website-small'], { billing: true })
    await submitAll(owner.id, id)
    const [small] = await entriesOf(db, id)
    await withdrawEntry(db, { userId: owner.id, projectId: id, entryId: small.id, now: EARLY })
    await setCategories(db, { userId: owner.id, projectId: id, categories: ['company-website-large'], now: EARLY })
    const r = await submitEntries(
      db,
      { userId: owner.id, projectId: id, entryId: small.id, acceptTerms: false, now: EARLY },
      { send: mail() },
    )
    expect(r.submitted).toEqual([])
    expect(r.skipped).toMatchObject([{ entryId: small.id, reason: 'category_conflict' }])
    expect((await entriesOf(db, id)).find((e) => e.id === small.id)!.status).toBe('withdrawn')
  })

  it('keeps the terms accepted: submitting a withdrawn entry again needs no checkbox', async () => {
    const { owner, id, rows } = await submitted()
    await withdrawEntry(db, { userId: owner.id, projectId: id, entryId: rows[0].id, now: EARLY })
    const r = await submitEntries(
      db,
      { userId: owner.id, projectId: id, entryId: rows[0].id, acceptTerms: false, now: EARLY },
      { send: mail() },
    )
    expect(r.submitted.length).toBe(1)
  })
})
