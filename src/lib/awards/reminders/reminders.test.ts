// @vitest-environment node
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import * as schema from '../db/schema'
import { createTestDatabase, type TestDatabase } from '../db/test-database'
import { draftReminderEmail, type OutgoingEmail } from '../email'
import { acquireEditLock, createProject, saveAnswers, setCategories } from '../projects/service'
import { sendDueDraftReminders } from './send'

/**
 * Draft reminders against a real Postgres, in a database of its own that is dropped afterwards.
 * The clock is always passed in. Every test makes its own users, because a sweep mails everyone
 * in the edition who has drafts.
 */
const url = process.env.AWARDS_DATABASE_URL_UNPOOLED ?? process.env.AWARDS_DATABASE_URL

const OPEN = new Date('2026-12-10T12:00:00Z')
const WAVE1 = new Date('2027-01-02T09:00:00Z')
const WAVE2 = new Date('2027-01-31T09:00:00Z')
const BETWEEN = new Date('2027-01-15T09:00:00Z')

describe.skipIf(!url)('draft reminders', () => {
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
  const makeUser = async (name: string, preferredLocale: 'is' | 'en' | null = null) => {
    const email = `draft-${Date.now()}-${n++}@example.com`
    const [row] = await db
      .insert(schema.user)
      .values({ name, email, preferredLocale })
      .returning({ id: schema.user.id })
    return { id: row.id, email }
  }
  async function draftProject(
    owner: { id: string },
    title: string,
    categories = ['marketing-website'],
    locale: 'is' | 'en' = 'is',
  ) {
    const { id } = await createProject(db, { userId: owner.id, locale, editionId })
    await acquireEditLock(db, { userId: owner.id, projectId: id, now: OPEN })
    await setCategories(db, { userId: owner.id, projectId: id, categories, now: OPEN })
    await saveAnswers(db, { userId: owner.id, projectId: id, now: OPEN, patch: { answers: { title } } })
    return id
  }
  const addEditor = (projectId: string, userId: string, accepted = true) =>
    db.insert(schema.projectPerson).values({
      projectId,
      kind: 'collaborator',
      name: 'Editor',
      canEdit: true,
      userId,
      acceptedAt: accepted ? OPEN : null,
    })
  const sink = () => {
    const sent: OutgoingEmail[] = []
    return { sent, deps: { send: async (m: OutgoingEmail) => void sent.push(m), siteUrl: 'https://svef.test' } }
  }
  const to = (sent: OutgoingEmail[], email: string) => sent.filter((m) => m.to === email)
  const logRows = (userId: string) =>
    db.select().from(schema.reminderLog).where(eq(schema.reminderLog.userId, userId))

  it('sends nothing outside the waves', async () => {
    const a = await makeUser('Anna')
    await draftProject(a, 'Utan bylgju')
    const { sent, deps } = sink()
    for (const now of [OPEN, BETWEEN, new Date('2027-03-01T00:00:00Z')])
      expect((await sendDueDraftReminders(db, { now }, deps)).wave).toBeNull()
    expect(to(sent, a.email)).toEqual([])
    expect(await logRows(a.id)).toEqual([])
  })

  it('wave 1: one email per person listing all their projects, price now and after, in their locale', async () => {
    const anna = await makeUser('Anna', 'en')
    const palli = await makeUser('Palli') // no preference: the project's language (is)
    const p1 = await draftProject(anna, 'Fjallavefur', ['marketing-website', 'ecommerce-website'])
    const p2 = await draftProject(anna, 'Hafnarvefur')
    await addEditor(p1, palli.id)
    const { sent, deps } = sink()
    const sweep = await sendDueDraftReminders(db, { now: WAVE1 }, deps)
    expect(sweep.wave).toBe('early_bird')

    const mails = to(sent, anna.email)
    expect(mails).toHaveLength(1)
    const m = mails[0]
    expect(m.subject).toMatch(/early-bird/i)
    for (const t of ['Fjallavefur', 'Hafnarvefur', 'Marketing Website', 'E-commerce Website', 'Price now:', '4 January 2027', 'https://svef.test/en/my-pages/projects'])
      expect(m.text).toContain(t)
    expect(m.text).toMatch(/Missing:/)

    // The editor gets one too, in Icelandic, for the project they edit only.
    const e = to(sent, palli.email)
    expect(e).toHaveLength(1)
    expect(e[0].text).toContain('Fjallavefur')
    expect(e[0].text).not.toContain('Hafnarvefur')
    expect(e[0].text).toContain('Verð núna:')
    expect(e[0].text).toContain('4. janúar 2027')
    expect(e[0].text).toContain('https://svef.test/is/minar-sidur/verkefni')
    expect(p2).toBeTruthy()
    expect((await logRows(anna.id)).map((r) => r.wave)).toEqual(['early_bird'])
  })

  it('skips users with no drafts, pending editors, submitted and withdrawn entries', async () => {
    const submitted = await makeUser('Sigga')
    const sp = await draftProject(submitted, 'Innsent')
    await db.update(schema.entry).set({ status: 'submitted' }).where(eq(schema.entry.projectId, sp))
    const withdrawn = await makeUser('Vala')
    const wp = await draftProject(withdrawn, 'Dregid til baka')
    await db.update(schema.entry).set({ status: 'withdrawn' }).where(eq(schema.entry.projectId, wp))
    const owner = await makeUser('Eigandi')
    const pending = await makeUser('Bidandi')
    await addEditor(await draftProject(owner, 'Bod'), pending.id, false)
    const { sent, deps } = sink()
    await sendDueDraftReminders(db, { now: WAVE1 }, deps)
    expect(to(sent, submitted.email)).toEqual([])
    expect(to(sent, withdrawn.email)).toEqual([])
    expect(to(sent, pending.email)).toEqual([])
    expect(to(sent, owner.email)).toHaveLength(1)
    expect(await logRows(submitted.id)).toEqual([])
  })

  it('wave 2 is separate from wave 1, and neither repeats', async () => {
    const a = await makeUser('Anna')
    await draftProject(a, 'Tvaer bylgjur')
    const { sent, deps } = sink()
    await sendDueDraftReminders(db, { now: WAVE1 }, deps)
    await sendDueDraftReminders(db, { now: new Date(WAVE1.getTime() + 86_400_000) }, deps)
    expect(to(sent, a.email)).toHaveLength(1)
    const two = await sendDueDraftReminders(db, { now: WAVE2 }, deps)
    expect(two.wave).toBe('closing')
    expect(to(sent, a.email)).toHaveLength(2)
    expect(to(sent, a.email)[1].subject).toMatch(/Skilafrestur/)
    expect(to(sent, a.email)[1].text).not.toContain('Verð núna')
    await sendDueDraftReminders(db, { now: WAVE2 }, deps)
    expect(to(sent, a.email)).toHaveLength(2)
    expect((await logRows(a.id)).map((r) => r.wave).sort()).toEqual(['closing', 'early_bird'])
  })

  it('concurrent runs send exactly once', async () => {
    const a = await makeUser('Anna')
    await draftProject(a, 'Samtimis')
    const { sent, deps } = sink()
    await Promise.all(Array.from({ length: 6 }, () => sendDueDraftReminders(db, { now: WAVE1 }, deps)))
    expect(to(sent, a.email)).toHaveLength(1)
    expect(await logRows(a.id)).toHaveLength(1)
  })

  it('releases the claim when the send fails, so the next run retries', async () => {
    const a = await makeUser('Anna')
    await draftProject(a, 'Bilun')
    const failing = { send: async () => { throw new Error('down') }, siteUrl: 'https://svef.test' }
    const r1 = await sendDueDraftReminders(db, { now: WAVE1 }, failing)
    expect(r1.reminded.find((r) => r.userId === a.id)?.result).toBe('failed')
    expect(await logRows(a.id)).toEqual([])
    const { sent, deps } = sink()
    await sendDueDraftReminders(db, { now: WAVE1 }, deps)
    expect(to(sent, a.email)).toHaveLength(1)
    expect(await logRows(a.id)).toHaveLength(1)
  })
})

describe('draftReminderEmail', () => {
  const input = {
    name: 'Anna <b>',
    boundAt: new Date('2027-01-05T00:00:00Z'),
    projects: [
      {
        title: 'Vefur <i>',
        entries: [
          { category: 'Markaðsvefur', price: 18900, priceRegular: 26900, missing: ['Titill'] },
          { category: 'Vefverslun', price: 18900, priceRegular: 26900, missing: [] },
        ],
      },
    ],
    url: 'https://svef.test/is/minar-sidur/verkefni',
  }

  it('names the last day, both prices and what is missing, and escapes html', () => {
    const mail = draftReminderEmail({ ...input, locale: 'is', wave: 'early_bird' })
    expect(mail.text).toContain('4. janúar 2027')
    expect(mail.text).toMatch(/Verð núna: 18\.900 kr\. \(26\.900 kr\. eftir 4\. janúar 2027\)/)
    expect(mail.text).toContain('Vantar: Titill')
    expect(mail.text).toContain('Tilbúið til innsendingar')
    expect(mail.html).toContain('Vefur &lt;i&gt;')
    expect(mail.html).toContain('Sæl/l Anna &lt;b&gt;')
    expect(mail.html).toContain('lang="is"')
  })

  it('closing wave states only the price and the close date', () => {
    const mail = draftReminderEmail({
      ...input,
      locale: 'en',
      wave: 'closing',
      boundAt: new Date('2027-02-02T00:00:00Z'),
    })
    expect(mail.text).toContain('1 February 2027')
    expect(mail.text).not.toContain('Price now')
    expect(mail.text).toContain('Price: ')
  })
})
