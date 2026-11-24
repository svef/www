// @vitest-environment node
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { createTestDatabase, type TestDatabase } from '../db/test-database'
import * as schema from '../db/schema'
import { earlyBirdPrice } from '../pricing'
import { AwardsError } from './errors'
import {
  acquireEditLock,
  createProject,
  loadProject,
  saveAnswers,
  setCategories,
  setProjectBillingProfile,
} from './service'
import { submitEntries } from './submit'

/**
 * Submitting, against a real Postgres of the suite's own (created, migrated, seeded and
 * dropped here). Every test builds its own users and project and moves the clock through
 * `now`. Mail goes to a spy: nothing is written to the outbox.
 */
const url = process.env.AWARDS_DATABASE_URL_UNPOOLED ?? process.env.AWARDS_DATABASE_URL

const EARLY = new Date('2026-12-15T12:00:00Z')
const REGULAR = new Date('2027-01-10T12:00:00Z')
const EARLY_ENDS = new Date('2027-01-05T00:00:00Z')

describe.skipIf(!url)('submitting', () => {
  let pool: Pool
  let scratch: TestDatabase
  let db: ReturnType<typeof drizzle<typeof schema>>

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
  async function makeUser(name: string, verified = true) {
    const [u] = await db
      .insert(schema.user)
      .values({
        name,
        email: `sub-${Date.now()}-${n++}-${Math.random().toString(36).slice(2)}@example.com`,
        emailVerified: verified,
      })
      .returning({ id: schema.user.id, email: schema.user.email })
    return u
  }

  const complete = {
    title: 'Fjallavefurinn',
    description: 'A site about mountains.',
    owners: [{ name: 'Anna', email: 'anna@example.is' }],
    publicCredit: 'Made by Anna',
    links: ['https://fjall.is'],
    appLinks: ['https://apps.apple.com/is/app/x/id1'],
    campaignPeriod: { start: '2026-05-01', end: '2026-06-01' },
  }

  /** A project with the creator holding the lock at `now`, a billing profile, and the project answers filled in. */
  async function ready(
    categories: string[],
    opts: { now?: Date; verified?: boolean; fill?: boolean; billing?: boolean } = {},
  ) {
    const now = opts.now ?? EARLY
    const owner = await makeUser('Anna', opts.verified ?? true)
    const [ed] = await db.select().from(schema.edition).where(eq(schema.edition.year, 2026))
    const { id } = await createProject(db, { userId: owner.id, locale: 'en', editionId: ed.id })
    await acquireEditLock(db, { userId: owner.id, projectId: id, now })
    await setCategories(db, { userId: owner.id, projectId: id, categories, now })
    if (opts.fill ?? true)
      await saveAnswers(db, { userId: owner.id, projectId: id, now, patch: { answers: complete } })
    if (opts.billing ?? true) {
      const [bp] = await db
        .insert(schema.billingProfile)
        .values({
          ownerUserId: owner.id,
          kennitala: '7106697169',
          companyName: 'Fjall ehf.',
          invoiceEmail: 'invoice@fjall.is',
          address: 'Laugavegur 1',
        })
        .returning({ id: schema.billingProfile.id })
      await setProjectBillingProfile(db, { userId: owner.id, projectId: id, billingProfileId: bp.id, now })
    }
    return { id, owner, ed }
  }

  const entries = (projectId: string) =>
    db.select().from(schema.entry).where(eq(schema.entry.projectId, projectId))
  const events = async (projectId: string, type: string) =>
    (await db.select().from(schema.entryEvent).where(eq(schema.entryEvent.projectId, projectId))).filter(
      (e) => e.type === type,
    )
  const refusal = async (p: Promise<unknown>) => {
    try {
      await p
    } catch (e) {
      if (e instanceof AwardsError) return e
      throw e
    }
    throw new Error('expected an AwardsError')
  }
  const mail = () => vi.fn(async () => undefined)

  it('submits every complete draft at once: status, locked early price, time, events, terms, receipt', async () => {
    const { id, owner } = await ready(['marketing-website', 'app'])
    const send = mail()
    const r = await submitEntries(
      db,
      { userId: owner.id, projectId: id, acceptTerms: true, now: EARLY },
      { send },
    )
    expect(r.submitted.map((s) => s.category).sort()).toEqual(['app', 'marketing-website'])
    expect(r.skipped).toEqual([])
    expect(r.receipt).toBe('sent')

    const rows = await entries(id)
    expect(rows.every((e) => e.status === 'submitted')).toBe(true)
    for (const e of rows) {
      expect(e.submittedAt?.toISOString()).toBe(EARLY.toISOString())
      expect(e.priceLockedAt?.toISOString()).toBe(EARLY.toISOString())
      expect(e.discountPercent).toBe(30)
      expect(e.priceAmount).toBe(earlyBirdPrice(e.priceRegular!, 30))
      expect(e.priceAmount).toBeLessThan(e.priceRegular!)
    }
    expect((await events(id, 'entry_submitted')).length).toBe(2)
    const [terms] = await db.select().from(schema.termsAcceptance).where(eq(schema.termsAcceptance.projectId, id))
    expect(terms.userId).toBe(owner.id)
    expect(terms.termsVersion).toBe('draft')
    expect((await events(id, 'terms_accepted')).length).toBe(1)

    expect(send).toHaveBeenCalledTimes(1)
    const sent = (send.mock.calls[0] as unknown as [{ to: string; subject: string; text: string }])[0]
    expect(sent.to).toBe(owner.email)
    expect(sent.subject).toContain('Fjallavefurinn')
    for (const e of rows) expect(sent.text).toContain(new Intl.NumberFormat('en-GB').format(e.priceAmount!))
    expect(sent.text).toContain('Fjall ehf.')
    expect(sent.text).toMatch(/invoice is sent after submissions close/i)
  })

  it('sends the receipt in the submitter’s locale', async () => {
    const { id, owner } = await ready(['marketing-website'])
    await db.update(schema.user).set({ preferredLocale: 'is' }).where(eq(schema.user.id, owner.id))
    const send = mail()
    await submitEntries(db, { userId: owner.id, projectId: id, acceptTerms: true, now: EARLY }, { send })
    const sent = (send.mock.calls[0] as unknown as [{ subject: string; text: string }])[0]
    expect(sent.subject).toMatch(/^Kvittun/)
    expect(sent.text).toContain('Reikningur er sendur eftir að innsendingum lýkur')
  })

  it('skips incomplete work with reasons instead of failing, and changes nothing', async () => {
    const { id, owner } = await ready(['marketing-website', 'app'], { fill: false })
    await saveAnswers(db, { userId: owner.id, projectId: id, now: EARLY, patch: { answers: { title: 'Only a title' } } })
    const send = mail()
    const r = await submitEntries(db, { userId: owner.id, projectId: id, acceptTerms: true, now: EARLY }, { send })
    expect(r.submitted).toEqual([])
    expect(r.receipt).toBe('none')
    expect(r.skipped.map((s) => s.reason)).toEqual(['project_incomplete', 'project_incomplete'])
    expect(r.skipped[0].fieldKeys).toEqual(expect.arrayContaining(['description', 'owners', 'links']))
    expect((await entries(id)).every((e) => e.status === 'draft' && e.priceLockedAt === null)).toBe(true)
    expect(await db.select().from(schema.termsAcceptance).where(eq(schema.termsAcceptance.projectId, id))).toEqual([])
    expect(send).not.toHaveBeenCalled()
  })

  it('submits a single entry for a category added later, with its own date and price', async () => {
    const { id, owner } = await ready(['marketing-website'])
    await submitEntries(db, { userId: owner.id, projectId: id, acceptTerms: true, now: EARLY }, { send: mail() })

    // A category added afterwards: a new draft, and the project is missing its app link.
    const later = new Date('2027-01-12T10:00:00Z')
    await acquireEditLock(db, { userId: owner.id, projectId: id, now: later })
    await setCategories(db, { userId: owner.id, projectId: id, categories: ['marketing-website', 'app'], now: later })
    const draft = (await entries(id)).find((e) => e.status === 'draft')!
    const incomplete = await submitEntries(
      db,
      { userId: owner.id, projectId: id, entryId: draft.id, acceptTerms: false, now: later },
      { send: mail() },
    )
    expect(incomplete.skipped).toMatchObject([{ reason: 'project_incomplete', fieldKeys: ['appLinks'] }])

    await saveAnswers(db, { userId: owner.id, projectId: id, now: later, patch: { answers: { appLinks: complete.appLinks } } })
    const send = mail()
    // The terms for this project were accepted at the first submit: no checkbox needed again.
    const r = await submitEntries(
      db,
      { userId: owner.id, projectId: id, entryId: draft.id, acceptTerms: false, now: later },
      { send },
    )
    expect(r.submitted.map((s) => s.category)).toEqual(['app'])
    expect(send).toHaveBeenCalledTimes(1)
    const rows = await entries(id)
    const first = rows.find((e) => e.id !== draft.id)!
    const app = rows.find((e) => e.id === draft.id)!
    expect(first.discountPercent).toBe(30) // locked in December
    expect(app.discountPercent).toBe(0) // priced by the later date
    expect(app.priceAmount).toBe(app.priceRegular)
    expect((await db.select().from(schema.termsAcceptance).where(eq(schema.termsAcceptance.projectId, id))).length).toBe(1)
  })

  it('needs the terms again when the edition’s terms version changes', async () => {
    const { id, owner, ed } = await ready(['marketing-website'])
    await db.update(schema.edition).set({ termsVersion: '2026-1' }).where(eq(schema.edition.id, ed.id))
    try {
      expect((await refusal(submitEntries(db, { userId: owner.id, projectId: id, acceptTerms: false, now: EARLY }, { send: mail() }))).code).toBe('terms_required')
      await submitEntries(db, { userId: owner.id, projectId: id, acceptTerms: true, now: EARLY }, { send: mail() })
      const [t] = await db.select().from(schema.termsAcceptance).where(eq(schema.termsAcceptance.projectId, id))
      expect(t.termsVersion).toBe('2026-1')
      expect((await loadProject(db, { userId: owner.id, projectId: id, now: EARLY })).terms).toEqual({ version: '2026-1', accepted: true })
    } finally {
      await db.update(schema.edition).set({ termsVersion: null }).where(eq(schema.edition.id, ed.id))
    }
  })

  describe('preconditions', () => {
    it('needs a verified email', async () => {
      const { id, owner } = await ready(['marketing-website'], { verified: false })
      const e = await refusal(submitEntries(db, { userId: owner.id, projectId: id, acceptTerms: true, now: EARLY }, { send: mail() }))
      expect(e.code).toBe('email_unverified')
      expect((await entries(id))[0].status).toBe('draft')
    })

    it('needs the terms and a billing profile', async () => {
      const a = await ready(['marketing-website'])
      expect((await refusal(submitEntries(db, { userId: a.owner.id, projectId: a.id, acceptTerms: false, now: EARLY }, { send: mail() }))).code).toBe('terms_required')
      const b = await ready(['marketing-website'], { billing: false })
      expect((await refusal(submitEntries(db, { userId: b.owner.id, projectId: b.id, acceptTerms: true, now: EARLY }, { send: mail() }))).code).toBe('billing_required')
    })

    it('needs the edit lock, and an accepted role on the project', async () => {
      const { id, owner } = await ready(['marketing-website'])
      const stranger = await makeUser('Eve')
      expect((await refusal(submitEntries(db, { userId: stranger.id, projectId: id, acceptTerms: true, now: EARLY }, { send: mail() }))).code).toBe('forbidden')

      // The lock lapses: nobody holds it any more.
      const lapsed = new Date(EARLY.getTime() + 21 * 60_000)
      expect((await refusal(submitEntries(db, { userId: owner.id, projectId: id, acceptTerms: true, now: lapsed }, { send: mail() }))).code).toBe('lock_required')

      // An editor who has accepted the invitation and holds the lock may submit.
      const editor = await makeUser('Bjarni')
      await db.insert(schema.projectPerson).values({
        projectId: id, kind: 'collaborator', name: 'B', role: 'Developer', email: 'b@example.com', canEdit: true, userId: editor.id, acceptedAt: EARLY,
      })
      await acquireEditLock(db, { userId: editor.id, projectId: id, now: lapsed })
      const r = await submitEntries(db, { userId: editor.id, projectId: id, acceptTerms: true, now: lapsed }, { send: mail() })
      expect(r.submitted.length).toBe(1)
      expect((await db.select().from(schema.termsAcceptance).where(eq(schema.termsAcceptance.projectId, id)))[0].userId).toBe(editor.id)
    })

    it('is open from the opening moment (inclusive) to the closing moment (exclusive)', async () => {
      const opens = new Date('2026-12-01T00:00:00Z')
      const before = new Date(opens.getTime() - 1)
      const closes = new Date('2027-02-02T00:00:00Z')
      const lastMs = new Date(closes.getTime() - 1)
      const p = async (now: Date) => {
        const x = await ready(['marketing-website'], { now: new Date('2026-12-15T12:00:00Z') })
        await acquireEditLock(db, { userId: x.owner.id, projectId: x.id, now })
        return x
      }
      const a = await p(before)
      expect((await refusal(submitEntries(db, { userId: a.owner.id, projectId: a.id, acceptTerms: true, now: before }, { send: mail() }))).code).toBe('intake_not_open')
      const b = await p(opens)
      expect((await submitEntries(db, { userId: b.owner.id, projectId: b.id, acceptTerms: true, now: opens }, { send: mail() })).submitted.length).toBe(1)
      const c = await p(lastMs)
      const last = await submitEntries(db, { userId: c.owner.id, projectId: c.id, acceptTerms: true, now: lastMs }, { send: mail() })
      expect(last.submitted[0].early).toBe(false)
      const d = await p(closes)
      expect((await refusal(submitEntries(db, { userId: d.owner.id, projectId: d.id, acceptTerms: true, now: closes }, { send: mail() }))).code).toBe('intake_closed')
      expect((await entries(d.id))[0].status).toBe('draft')
    })
  })

  describe('the early-bird boundary', () => {
    async function submitAt(now: Date) {
      const x = await ready(['marketing-website'], { now: new Date('2026-12-15T12:00:00Z') })
      await acquireEditLock(db, { userId: x.owner.id, projectId: x.id, now })
      const r = await submitEntries(db, { userId: x.owner.id, projectId: x.id, acceptTerms: true, now }, { send: mail() })
      return r.submitted[0]
    }
    it('the last millisecond before 2027-01-05T00:00:00Z is early', async () => {
      const s = await submitAt(new Date(EARLY_ENDS.getTime() - 1))
      expect(s.early).toBe(true)
      expect(s.price.discountPercent).toBe(30)
      expect(s.price.amount).toBe(earlyBirdPrice(s.price.regular, 30))
    })
    it('exactly 2027-01-05T00:00:00Z is regular', async () => {
      const s = await submitAt(EARLY_ENDS)
      expect(s.early).toBe(false)
      expect(s.price).toEqual({ regular: s.price.regular, discountPercent: 0, amount: s.price.regular })
    })
  })

  describe('pressing twice', () => {
    it('does nothing the second time: no second price, terms row, events or receipt', async () => {
      const { id, owner } = await ready(['marketing-website', 'app'])
      const send = mail()
      const args = { userId: owner.id, projectId: id, acceptTerms: true, now: EARLY }
      await submitEntries(db, args, { send })
      const second = await submitEntries(db, { ...args, now: new Date(EARLY.getTime() + 1000) }, { send })
      expect(second.submitted).toEqual([])
      expect(second.alreadySubmitted.sort()).toEqual(['app', 'marketing-website'])
      expect(second.receipt).toBe('none')
      expect(send).toHaveBeenCalledTimes(1)
      expect((await events(id, 'entry_submitted')).length).toBe(2)
      expect((await db.select().from(schema.termsAcceptance).where(eq(schema.termsAcceptance.projectId, id))).length).toBe(1)
      for (const e of await entries(id)) expect(e.submittedAt?.toISOString()).toBe(EARLY.toISOString())
    })

    it('two simultaneous presses submit each entry exactly once', async () => {
      const { id, owner } = await ready(['marketing-website', 'app'])
      const send = mail()
      const args = { userId: owner.id, projectId: id, acceptTerms: true, now: EARLY }
      const [a, b] = await Promise.all([submitEntries(db, args, { send }), submitEntries(db, args, { send })])
      expect(a.submitted.length + b.submitted.length).toBe(2)
      expect(send).toHaveBeenCalledTimes(1)
      expect((await events(id, 'entry_submitted')).length).toBe(2)
    })

    it('says there is nothing to do when there was never a draft', async () => {
      const { id, owner } = await ready([])
      expect((await refusal(submitEntries(db, { userId: owner.id, projectId: id, acceptTerms: true, now: EARLY }, { send: mail() }))).code).toBe('nothing_to_submit')
    })
  })

  describe('the locked price', () => {
    it('never changes: not with new prices or a new discount, not with edits, not with a later press', async () => {
      const { id, owner, ed } = await ready(['marketing-website'])
      const r = await submitEntries(db, { userId: owner.id, projectId: id, acceptTerms: true, now: EARLY }, { send: mail() })
      const locked = r.submitted[0].price
      const [cat] = await db.select().from(schema.category).where(and(eq(schema.category.editionId, ed.id), eq(schema.category.slug, 'marketing-website')))

      await db.update(schema.category).set({ price: cat.price + 5000 }).where(eq(schema.category.id, cat.id))
      await db.update(schema.edition).set({ earlyBirdDiscountPercent: 10 }).where(eq(schema.edition.id, ed.id))
      try {
        // An editable field saved after the discount ended, and a repeated press, leave it alone.
        await acquireEditLock(db, { userId: owner.id, projectId: id, now: REGULAR })
        await saveAnswers(db, { userId: owner.id, projectId: id, now: REGULAR, patch: { answers: { publicCredit: 'Changed' } } })
        await submitEntries(db, { userId: owner.id, projectId: id, acceptTerms: true, now: REGULAR }, { send: mail() })
        const view = await loadProject(db, { userId: owner.id, projectId: id, now: REGULAR })
        expect(view.entries[0].price).toEqual(locked)
        const [row] = await entries(id)
        expect([row.priceRegular, row.discountPercent, row.priceAmount]).toEqual([locked.regular, locked.discountPercent, locked.amount])
      } finally {
        await db.update(schema.category).set({ price: cat.price }).where(eq(schema.category.id, cat.id))
        await db.update(schema.edition).set({ earlyBirdDiscountPercent: 30 }).where(eq(schema.edition.id, ed.id))
      }
    })
  })

  it('keeps the submission when the receipt cannot be sent', async () => {
    const { id, owner } = await ready(['marketing-website'])
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const r = await submitEntries(
      db,
      { userId: owner.id, projectId: id, acceptTerms: true, now: EARLY },
      { send: async () => Promise.reject(new Error('smtp down')) },
    )
    spy.mockRestore()
    expect(r.receipt).toBe('failed')
    expect(r.submitted.length).toBe(1)
    expect((await entries(id))[0].status).toBe('submitted')
  })
})
