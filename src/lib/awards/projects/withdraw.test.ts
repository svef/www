// @vitest-environment node
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
 * Withdrawing (spec §5): creator only, from submitted only, before close; it clears the price
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
