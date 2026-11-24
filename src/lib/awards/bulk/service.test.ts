// @vitest-environment node
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { createTestDatabase, type TestDatabase } from '../db/test-database'
import * as schema from '../db/schema'
import { acquireEditLock, releaseEditLock } from '../projects/service'
import {
  acceptTerms,
  EARLY,
  entriesOf,
  eventsOf,
  makeProfile,
  makeProject,
  makeUser,
  type Db,
} from './test-helpers'
import { planBulk, runBulk } from './service'

/**
 * Bulk actions against a real Postgres of the suite's own: lock skipping, per-project receipts,
 * the plan and the run agreeing, and the locks the run takes being given back.
 */
const url = process.env.AWARDS_DATABASE_URL_UNPOOLED ?? process.env.AWARDS_DATABASE_URL

describe.skipIf(!url)('bulk actions', () => {
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
  const lockRow = async (projectId: string) =>
    (await db.select().from(schema.projectEditLock).where(eq(schema.projectEditLock.projectId, projectId)))[0]

  /** A project ready to submit: complete, billing, terms accepted, the creator's lock released. */
  async function ready(owner: { id: string }, title: string, categories = ['app'], opts: { fill?: boolean } = {}) {
    const p = await makeProject(db, owner, categories, { title, fill: opts.fill })
    await acceptTerms(db, owner.id, p.id)
    await releaseEditLock(db, { userId: owner.id, projectId: p.id, now: EARLY })
    const rows = await entriesOf(db, p.id)
    return { ...p, rows, ids: rows.map((r) => r.id) }
  }

  it('submits across projects: one receipt per project, a locked project and an incomplete one skipped with reasons', async () => {
    const anna = await makeUser(db, 'Anna')
    const bjarni = await makeUser(db, 'Bjarni')
    const one = await ready(anna, 'Eitt', ['app', 'marketing-website'])
    const two = await ready(anna, 'Tvö')
    const busy = await ready(anna, 'Upptekið')
    const partial = await ready(anna, 'Ófullbúið', ['app'], { fill: false })
    // Bjarni (an editor) is editing "busy" right now.
    await db.insert(schema.projectPerson).values({
      projectId: busy.id, kind: 'collaborator', name: 'B', role: 'Dev', email: 'b@example.com',
      canEdit: true, userId: bjarni.id, acceptedAt: EARLY,
    })
    await acquireEditLock(db, { userId: bjarni.id, projectId: busy.id, now: EARLY })

    const entryIds = [...one.ids, ...two.ids, ...busy.ids, ...partial.ids]
    const req = { userId: anna.id, kind: 'submit' as const, entryIds, now: EARLY }

    const plan = await planBulk(db, req)
    if (plan.kind !== 'submit') throw new Error('plan kind')
    expect(plan.items.length).toBe(3)
    expect(plan.skipped.map((s) => [s.projectId, s.reason])).toEqual(
      expect.arrayContaining([
        [busy.id, 'locked'],
        [partial.id, 'project_incomplete'],
      ]),
    )
    expect(plan.skipped.find((s) => s.reason === 'locked')?.detail).toBe('Bjarni')
    // Nothing changed by planning.
    expect((await entriesOf(db, one.id)).every((e) => e.status === 'draft')).toBe(true)

    const send = mail()
    const r = await runBulk(db, req, { send })
    expect(r.done.length).toBe(3)
    expect(r.total).toBe(plan.total)
    expect(r.receipts).toEqual({ sent: 2, failed: 0 })
    expect(send).toHaveBeenCalledTimes(2) // one per project, not per entry
    expect((await entriesOf(db, one.id)).every((e) => e.status === 'submitted' && e.discountPercent === 30)).toBe(true)
    expect((await entriesOf(db, busy.id))[0].status).toBe('draft') // never forced
    expect((await entriesOf(db, partial.id))[0].status).toBe('draft')
    expect(r.skipped.map((s) => s.reason).sort()).toEqual(['locked', 'project_incomplete'])
    expect((await eventsOf(db, one.id, 'entry_submitted')).length).toBe(2)

    // The locks the run took are given back; Bjarni's is untouched.
    expect(await lockRow(one.id)).toBeUndefined()
    expect(await lockRow(two.id)).toBeUndefined()
    expect((await lockRow(busy.id)).holderUserId).toBe(bjarni.id)
  })

  it('uses a lock the person already holds and leaves it in place', async () => {
    const anna = await makeUser(db, 'Anna')
    const p = await ready(anna, 'Opið')
    await acquireEditLock(db, { userId: anna.id, projectId: p.id, now: EARLY })
    const r = await runBulk(db, { userId: anna.id, kind: 'submit', entryIds: p.ids, now: EARLY }, { send: mail() })
    expect(r.done.length).toBe(1)
    expect((await lockRow(p.id)).holderUserId).toBe(anna.id)
  })

  it('skips what the person may not do: unverified email, no billing, terms not accepted', async () => {
    const unverified = await makeUser(db, 'Una', false)
    const a = await ready(unverified, 'A')
    const owner = await makeUser(db, 'Anna')
    const noBilling = await makeProject(db, owner, ['app'], { billing: false })
    const noTerms = await makeProject(db, owner, ['app'])
    await releaseEditLock(db, { userId: owner.id, projectId: noBilling.id, now: EARLY })
    await releaseEditLock(db, { userId: owner.id, projectId: noTerms.id, now: EARLY })
    const ids = async (id: string) => (await entriesOf(db, id)).map((e) => e.id)
    const r1 = await runBulk(db, { userId: unverified.id, kind: 'submit', entryIds: a.ids, now: EARLY }, { send: mail() })
    expect(r1.skipped.map((s) => s.reason)).toEqual(['email_unverified'])
    const r2 = await runBulk(
      db,
      { userId: owner.id, kind: 'submit', entryIds: [...(await ids(noBilling.id)), ...(await ids(noTerms.id))], now: EARLY },
      { send: mail() },
    )
    expect(r2.done).toEqual([])
    expect(r2.skipped.map((s) => s.reason).sort()).toEqual(['no_billing', 'terms_not_accepted'])
  })

  it('re-submits a withdrawn entry in bulk, priced now', async () => {
    const anna = await makeUser(db, 'Anna')
    const p = await ready(anna, 'Aftur')
    await runBulk(db, { userId: anna.id, kind: 'submit', entryIds: p.ids, now: EARLY }, { send: mail() })
    await runBulk(db, { userId: anna.id, kind: 'withdraw', entryIds: p.ids, now: EARLY })
    expect((await entriesOf(db, p.id))[0].status).toBe('withdrawn')
    const later = new Date('2027-01-10T12:00:00Z')
    const r = await runBulk(db, { userId: anna.id, kind: 'submit', entryIds: p.ids, now: later }, { send: mail() })
    expect(r.done).toMatchObject([{ early: false }])
    expect((await entriesOf(db, p.id))[0].discountPercent).toBe(0)
  })

  it('withdraws only entries in projects the person created; the rest are listed as skipped', async () => {
    const anna = await makeUser(db, 'Anna')
    const bjarni = await makeUser(db, 'Bjarni')
    const mine = await ready(anna, 'Mitt')
    const theirs = await ready(bjarni, 'Þeirra')
    await db.insert(schema.projectPerson).values({
      projectId: theirs.id, kind: 'collaborator', name: 'A', role: 'Dev', email: 'a@example.com',
      canEdit: true, userId: anna.id, acceptedAt: EARLY,
    })
    await runBulk(db, { userId: anna.id, kind: 'submit', entryIds: mine.ids, now: EARLY }, { send: mail() })
    await runBulk(db, { userId: bjarni.id, kind: 'submit', entryIds: theirs.ids, now: EARLY }, { send: mail() })

    const r = await runBulk(db, { userId: anna.id, kind: 'withdraw', entryIds: [...mine.ids, ...theirs.ids], now: EARLY })
    expect(r.done.map((d) => d.projectId)).toEqual([mine.id])
    expect(r.skipped).toMatchObject([{ projectId: theirs.id, reason: 'not_creator' }])
    expect((await entriesOf(db, mine.id))[0]).toMatchObject({ status: 'withdrawn', priceAmount: null })
    expect((await entriesOf(db, theirs.id))[0].status).toBe('submitted')
    expect((await eventsOf(db, mine.id, 'entry_withdrawn')).length).toBe(1)
    expect(await lockRow(mine.id)).toBeUndefined()
  })

  it('skips a project being edited when withdrawing, and when changing billing', async () => {
    const anna = await makeUser(db, 'Anna')
    const bjarni = await makeUser(db, 'Bjarni')
    const p = await ready(anna, 'Upptekið')
    await runBulk(db, { userId: anna.id, kind: 'submit', entryIds: p.ids, now: EARLY }, { send: mail() })
    await db.insert(schema.projectPerson).values({
      projectId: p.id, kind: 'collaborator', name: 'B', role: 'Dev', email: 'b@example.com',
      canEdit: true, userId: bjarni.id, acceptedAt: EARLY,
    })
    await acquireEditLock(db, { userId: bjarni.id, projectId: p.id, now: EARLY })
    const profile = await makeProfile(db, anna.id, 'Annað ehf.')

    const w = await runBulk(db, { userId: anna.id, kind: 'withdraw', entryIds: p.ids, now: EARLY })
    expect(w.skipped).toMatchObject([{ reason: 'locked', detail: 'Bjarni' }])
    const b = await runBulk(db, { userId: anna.id, kind: 'billing', entryIds: p.ids, billingProfileId: profile, now: EARLY })
    expect(b.skipped).toMatchObject([{ reason: 'locked' }])
    expect((await entriesOf(db, p.id))[0].status).toBe('submitted')
    const [row] = await db.select().from(schema.project).where(eq(schema.project.id, p.id))
    expect(row.billingProfileId).not.toBe(profile)
  })

  it('changes the billing profile of every selected project, logs it, and refuses a profile that is not theirs', async () => {
    const anna = await makeUser(db, 'Anna')
    const eve = await makeUser(db, 'Eve')
    const a = await ready(anna, 'Eitt')
    const b = await ready(anna, 'Tvö', ['app', 'marketing-website'])
    const profile = await makeProfile(db, anna.id, 'Nýtt ehf.')

    const r = await runBulk(db, {
      userId: anna.id, kind: 'billing', entryIds: [...a.ids, ...b.ids], billingProfileId: profile, now: EARLY,
    })
    expect(r.done.map((d) => d.projectId).sort()).toEqual([a.id, b.id].sort())
    for (const id of [a.id, b.id]) {
      const [row] = await db.select().from(schema.project).where(eq(schema.project.id, id))
      expect(row.billingProfileId).toBe(profile)
      expect((await eventsOf(db, id, 'billing_profile_changed')).length).toBeGreaterThanOrEqual(2)
      expect(await lockRow(id)).toBeUndefined()
    }

    const evesProfile = await makeProfile(db, eve.id)
    const refused = await runBulk(db, {
      userId: anna.id, kind: 'billing', entryIds: a.ids, billingProfileId: evesProfile, now: EARLY,
    })
    expect(refused.done).toEqual([])
    expect(refused.skipped).toMatchObject([{ reason: 'profile_not_found' }])
  })

  it('ignores entries of projects the person has no access to', async () => {
    const anna = await makeUser(db, 'Anna')
    const eve = await makeUser(db, 'Eve')
    const p = await ready(anna, 'Einkamál')
    const r = await runBulk(db, { userId: eve.id, kind: 'withdraw', entryIds: p.ids, now: EARLY })
    expect(r.done).toEqual([])
    expect(r.skipped).toEqual([])
    const plan = await planBulk(db, { userId: eve.id, kind: 'submit', entryIds: p.ids, now: EARLY })
    expect(plan.items).toEqual([])
  })
})
