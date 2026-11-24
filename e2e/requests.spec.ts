import AxeBuilder from '@axe-core/playwright'
import { existsSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { and, eq } from 'drizzle-orm'
import * as schema from '../src/lib/awards/db/schema'
import {
  createEntry,
  createProject,
  createUser,
  openFixtureDb,
  retireProjects,
  seededEdition,
  uniqueKennitala,
} from '../src/lib/awards/staff/test-fixtures'
import { actAs, awardsPool, closeAwardsPool, emailOf } from './awards-session'
import { urlFor } from './pages'

/**
 * Requests with deadlines (svef/www#169), end to end. After intake has closed (the staff
 * clock is 1 March 2027, `playwright.config.ts`), staff open a request; the entrant, whose
 * request clock is moved to just after, sees the banner, edits a normally locked field the
 * request unlocks, replies and marks it done, and the entry returns to its previous status.
 * Then: a request past its deadline relocks, the staff-wide list shows open and overdue ones,
 * and the reminder cron route mails once.
 *
 * The staff account goes through Better Auth's real sign-up and gets the `staff` role; the
 * entrant is a user made through the schema and acted as through the test-session cookie.
 * Projects are retired afterwards (`entry_event` rows are append-only and stay behind).
 */
if (existsSync('.env.local')) process.loadEnvFile('.env.local')

const PASSWORD = 'correct horse battery'
const RUN = uniqueKennitala().slice(0, 6)
const OUTBOX = path.resolve(process.cwd(), '.awards-outbox')
const CRON_SECRET = 'e2e-cron-secret'
const baseURL = () => test.info().project.use.baseURL as string

// The staff clock (playwright.config.ts) is 2027-03-01T00:00Z; an entrant acting "the day after".
const ENTRANT_AT = (iso: string) => Date.parse(iso) - Date.now()

test.describe.configure({ mode: 'serial' })
test.afterAll(async () => {
  await retireProjects(db, projects)
  await close()
  await closeAwardsPool()
})

const { db, close } = openFixtureDb()
const projects: string[] = []

async function staffLogin(page: Page, label: string) {
  const email = `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.is`
  const res = await page.request.post('/api/account/sign-up/email', {
    data: { name: `Staff ${label}`, email, password: PASSWORD },
  })
  expect(res.ok(), await res.text()).toBe(true)
  const [u] = await db.select().from(schema.user).where(eq(schema.user.email, email))
  await db.insert(schema.userRole).values({ userId: u.id, role: 'staff' })
  return u.id
}

async function makeEntry(title: string, status: schema.EntryStatus = 'submitted') {
  const ed = await seededEdition(db)
  const owner = await createUser(db, `owner-${RUN}`)
  const projectId = await createProject(db, { editionId: ed.editionId, userId: owner, title: `${title} ${RUN}` })
  projects.push(projectId)
  await db.insert(schema.projectAnswer).values([
    { projectId, fieldKey: 'description', value: 'A fine project.' },
    { projectId, fieldKey: 'links', value: ['https://example.is/a'] },
  ])
  const entryId = await createEntry(db, { projectId, categoryId: ed.categories[0].id, status })
  return { owner, ownerEmail: await emailOf(owner), projectId, entryId }
}

const staffEntryUrl = (entryId: string) => urlFor('is', `/innsendingar/starfsfolk/${entryId}`)
const staffListUrl = () => urlFor('is', '/innsendingar/starfsfolk')
const projectUrl = (projectId: string) => urlFor('en', `/innsendingar/${projectId}`)

async function mails(to: string, subject: RegExp) {
  const files = (await readdir(OUTBOX).catch(() => [] as string[]))
    .filter((f) => f.endsWith(`-${to}.json`))
    .sort()
  const out: { subject: string; text: string; html: string }[] = []
  for (const f of files) {
    const mail = JSON.parse(await readFile(path.join(OUTBOX, f), 'utf8'))
    if (subject.test(mail.subject)) out.push(mail)
  }
  return out
}
async function waitForMail(to: string, subject: RegExp) {
  for (let i = 0; i < 50; i++) {
    const found = await mails(to, subject)
    if (found.length) return found[found.length - 1]
    await new Promise((r) => setTimeout(r, 100))
  }
  throw new Error(`no email to ${to} matching ${subject}`)
}

const entryRow = async (entryId: string) =>
  (await db.select().from(schema.entry).where(eq(schema.entry.id, entryId)))[0]

async function entrant(browser: import('@playwright/test').Browser, userId: string, at: string) {
  const context = await browser.newContext({ baseURL: baseURL() })
  await actAs(context, baseURL(), userId, ENTRANT_AT(at))
  return { context, page: await context.newPage() }
}

let flow: Awaited<ReturnType<typeof makeEntry>>
let requestId: string

test('staff open a request on a submitted entry after close: the entry waits, the entrant is emailed', async ({ page }) => {
  flow = await makeEntry('Fjallavefur')
  await staffLogin(page, 'req-staff')

  expect((await page.goto(staffEntryUrl(flow.entryId)))?.status()).toBe(200)
  await expect(page.getByTestId('entry-status')).toHaveText('Innsent')
  await expect(page.getByTestId('requests-empty')).toBeVisible()

  const form = page.getByTestId('open-request')
  await form.getByLabel('Skilaboð til þátttakanda').fill('Titillinn má ekki innihalda nafn fyrirtækisins.')
  await form.getByRole('checkbox', { name: 'Heiti verkefnis' }).check()
  // The deadline defaults to a week from the staff clock.
  await expect(form.getByLabel(/^Frestur/)).toHaveValue('2027-03-08T00:00')
  await form.getByRole('button', { name: 'Opna beiðni' }).click()

  await expect(page.getByTestId('request-result')).toContainText('Beiðni opnuð.')
  await expect(page.getByTestId('request-result')).toContainText('Tölvupóstur sendur.')
  await expect(page.getByTestId('entry-status')).toHaveText('Bíður skýringa')
  const card = page.getByTestId('request')
  await expect(card).toHaveCount(1)
  await expect(card).toHaveAttribute('data-status', 'open')
  await expect(card).toContainText('Heiti verkefnis')
  await expect(card).toContainText('2027-03-08 00:00 UTC')
  requestId = (await card.getAttribute('data-request-id'))!

  const row = await entryRow(flow.entryId)
  expect(row.status).toBe('needs_clarification')
  expect(row.statusBeforeClarification).toBe('submitted')

  // Email 4: message and deadline, in the project's language (Icelandic) with a link.
  const mail = await waitForMail(flow.ownerEmail, /^Beiðni frá SVEF/)
  expect(mail.text).toContain('Titillinn má ekki innihalda nafn fyrirtækisins.')
  expect(mail.text).toContain('8. mars 2027')
  expect(mail.text).toContain(`/is/innsendingar/${flow.projectId}#requests`)

  const axe = await new AxeBuilder({ page }).analyze()
  expect(axe.violations.map((v) => v.id)).toEqual([])
})

test('the entrant sees the banner, edits the unlocked locked field, replies and marks it done', async ({ browser }) => {
  const { context, page } = await entrant(browser, flow.owner, '2027-03-02T10:00:00Z')
  await page.goto(projectUrl(flow.projectId))
  await expect(page.locator('[data-lock="held"]')).toBeVisible()

  const banner = page.getByTestId('request-banner')
  await expect(banner).toHaveCount(1)
  await expect(banner).toContainText('Request from SVEF')
  await expect(banner).toContainText('Titillinn má ekki innihalda nafn fyrirtækisins.')
  await expect(banner.locator('time')).toContainText('8 March 2027')
  await expect(banner).toHaveAttribute('data-status', 'open')

  // The unlocked field is highlighted and editable even though it is locked after submit and
  // intake is closed; another locked field stays locked.
  const title = page.locator('[data-field="title"]')
  await expect(title).toHaveAttribute('data-requested', '')
  await expect(title.locator('input')).toBeEditable()
  await expect(page.locator('[data-field="links"]')).not.toHaveAttribute('data-requested', '')
  await expect(page.locator('[data-field="links"] input').first()).not.toBeEditable()

  const axe = await new AxeBuilder({ page }).analyze()
  expect(axe.violations.map((v) => v.id)).toEqual([])

  // The field link in the banner moves focus into the field.
  await banner.getByRole('link', { name: /Project title/ }).click()
  await expect(title.locator('input')).toBeFocused()

  await title.locator('input').fill('Fjallavefurinn')
  await expect(page.getByRole('status').filter({ hasText: /^Saved/ })).toBeVisible()
  const saved = await db
    .select()
    .from(schema.projectAnswer)
    .where(and(eq(schema.projectAnswer.projectId, flow.projectId), eq(schema.projectAnswer.fieldKey, 'title')))
  expect(saved[0].value).toBe('Fjallavefurinn')

  // A reply in the thread.
  await banner.getByLabel(/^Reply to SVEF/).fill('Búið að laga titilinn.')
  await banner.getByRole('button', { name: 'Send reply' }).click()
  await expect(page.getByTestId('request-status')).toHaveText('Your reply was sent.')
  await expect(banner.getByRole('listitem').filter({ hasText: 'Búið að laga titilinn.' })).toBeVisible()

  // Mark as done, with a closing reply.
  await banner.getByLabel(/^Reply to SVEF/).fill('Allt klárt.')
  await banner.getByRole('button', { name: 'Mark as done' }).click()
  await expect(page.getByTestId('request-status')).toHaveText(/The request is done/)
  await expect(page.getByTestId('request-banner')).toHaveCount(0)
  await expect(page.getByTestId('requests').locator('details')).toContainText('Resolved requests (1)')
  // The field locks again straight away, without a reload.
  await expect(title.locator('input')).not.toBeEditable()
  await expect(title).not.toHaveAttribute('data-requested', '')

  const row = await entryRow(flow.entryId)
  expect(row.status).toBe('submitted')
  expect(row.statusBeforeClarification).toBeNull()
  // Not a resubmission: the price snapshot is untouched.
  expect([row.priceRegular, row.discountPercent, row.priceAmount]).toEqual([26900, 30, 18900])
  await context.close()
})

test('staff see the request resolved with its thread, and the entry back where it was', async ({ page }) => {
  await staffLogin(page, 'req-staff2')
  await page.goto(staffEntryUrl(flow.entryId))
  await expect(page.getByTestId('entry-status')).toHaveText('Innsent')
  const card = page.locator(`[data-request-id="${requestId}"]`)
  await expect(card).toHaveAttribute('data-status', 'resolved')
  await expect(card).toContainText('Búið að laga titilinn.')
  await expect(card).toContainText('Allt klárt.')
  await expect(card).toContainText(`Lokið af owner-${RUN}`) // resolved by the entrant
  // The history records the whole story.
  const history = page.getByTestId('history')
  for (const ev of ['Beiðni opnuð', 'Svar við beiðni', 'Beiðni lokið']) await expect(history).toContainText(ev)
})

test('a request past its deadline relocks the field, shows overdue, and staff close it', async ({ page, browser }) => {
  const e = await makeEntry('Frestur', 'eligible')
  await staffLogin(page, 'req-staff3')
  await page.goto(staffEntryUrl(e.entryId))
  const form = page.getByTestId('open-request')
  await form.getByLabel('Skilaboð til þátttakanda').fill('Vantar lýsingu.')
  await form.getByRole('checkbox', { name: 'Lýsing á verkefninu' }).check()
  await form.getByLabel(/^Frestur/).fill('2027-03-05T00:00')
  await form.getByRole('button', { name: 'Opna beiðni' }).click()
  await expect(page.getByTestId('entry-status')).toHaveText('Bíður skýringa')
  expect((await entryRow(e.entryId)).statusBeforeClarification).toBe('eligible')

  // Before the deadline the description is open; after it, locked and overdue.
  const before = await entrant(browser, e.owner, '2027-03-04T23:00:00Z')
  await before.page.goto(projectUrl(e.projectId))
  await expect(before.page.locator('[data-field="description"] textarea')).toBeEditable()
  await before.context.close()

  const after = await entrant(browser, e.owner, '2027-03-05T00:00:00Z')
  await after.page.goto(projectUrl(e.projectId))
  const banner = after.page.getByTestId('request-banner')
  await expect(banner).toHaveAttribute('data-status', 'overdue')
  await expect(banner).toContainText('Overdue')
  await expect(banner.getByRole('button', { name: 'Mark as done' })).toHaveCount(0)
  await expect(after.page.locator('[data-field="description"] textarea')).not.toBeEditable()
  // Nothing happened by itself.
  expect((await entryRow(e.entryId)).status).toBe('needs_clarification')
  const axe = await new AxeBuilder({ page: after.page }).analyze()
  expect(axe.violations.map((v) => v.id)).toEqual([])
  await after.context.close()

  // Staff close it: the entry goes back to eligible.
  await page.reload()
  await page.getByRole('button', { name: 'Loka beiðni' }).click()
  await expect(page.getByTestId('request-result')).toContainText('Beiðni lokið.')
  await expect(page.getByTestId('entry-status')).toHaveText('Gjaldgengt')
})

test('the staff-wide list shows open and overdue requests, overdue first, with filters', async ({ page }) => {
  const e = await makeEntry('Listi', 'needs_clarification')
  await db.update(schema.entry).set({ statusBeforeClarification: 'submitted' }).where(eq(schema.entry.id, e.entryId))
  const staff = await staffLogin(page, 'req-staff4')
  // Overdue on the staff clock (1 March) and open: made directly, as the form cannot set a past deadline.
  const [overdue, open] = await db
    .insert(schema.entryRequest)
    .values([
      { entryId: e.entryId, authorUserId: staff, message: `Útrunnin ${RUN}`, fieldKeys: ['title'], deadlineAt: new Date('2027-02-20T12:00:00Z') },
      { entryId: e.entryId, authorUserId: staff, message: `Opin ${RUN}`, fieldKeys: ['links'], deadlineAt: new Date('2027-03-10T12:00:00Z') },
    ])
    .returning()

  await page.goto(`${staffListUrl()}`)
  const table = page.getByTestId('requests-overview')
  const mine = table.locator('tbody tr').filter({ hasText: RUN })
  await expect(mine).toHaveCount(2)
  // Overdue first.
  await expect(mine.nth(0)).toHaveAttribute('data-request-id', overdue.id)
  await expect(mine.nth(0)).toHaveAttribute('data-status', 'overdue')
  await expect(mine.nth(1)).toHaveAttribute('data-request-id', open.id)
  await expect(mine.nth(0)).toContainText('Útrunnin')

  await page.getByRole('link', { name: 'Útrunnar', exact: true }).click()
  await expect(page.locator(`tr[data-request-id="${overdue.id}"]`)).toBeVisible()
  await expect(page.locator(`tr[data-request-id="${open.id}"]`)).toHaveCount(0)
  await page.getByRole('link', { name: 'Opnar', exact: true }).click()
  await expect(page.locator(`tr[data-request-id="${open.id}"]`)).toBeVisible()
  await expect(page.locator(`tr[data-request-id="${overdue.id}"]`)).toHaveCount(0)

  // The row leads to the entry's requests.
  await page.getByRole('link', { name: `Listi ${RUN}` }).first().click()
  await expect(page).toHaveURL(new RegExp(`/starfsfolk/${e.entryId}#requests$`))
  const axe = await new AxeBuilder({ page }).analyze()
  expect(axe.violations.map((v) => v.id)).toEqual([])
})

test('the reminder cron route is guarded and sends each reminder once', async ({ request }) => {
  const e = await makeEntry('Áminning', 'needs_clarification')
  await db.update(schema.entry).set({ statusBeforeClarification: 'submitted' }).where(eq(schema.entry.id, e.entryId))
  const [staffUser] = await db.select().from(schema.user).limit(1)
  // Due in 12 h on the staff clock (1 March 00:00), made a week ago in real terms: inside the lead time.
  await awardsPool().query(
    `insert into entry_request (id, entry_id, author_user_id, message, field_keys, deadline_at, created_at)
     values (gen_random_uuid(), $1, $2, $3, '{title}', '2027-03-01T12:00:00Z', now() - interval '2 days')`,
    [e.entryId, staffUser.id, `Áminning ${RUN}`],
  )

  const path_ = '/api/awards/cron/request-reminders'
  expect((await request.get(path_)).status()).toBe(401)
  expect((await request.get(path_, { headers: { authorization: 'Bearer wrong' } })).status()).toBe(401)

  const ok = await request.get(path_, { headers: { authorization: `Bearer ${CRON_SECRET}` } })
  expect(ok.status()).toBe(200)
  expect((await ok.json()).reminded).toBeGreaterThanOrEqual(1)
  const mail = await waitForMail(e.ownerEmail, /^Áminning: beiðni/)
  expect(mail.text).toContain(`Áminning ${RUN}`)
  expect(mail.text).toContain('1. mars 2027')

  // Again: nothing more is sent to this owner.
  const again = await request.get(path_, { headers: { authorization: `Bearer ${CRON_SECRET}` } })
  expect(again.status()).toBe(200)
  expect(await mails(e.ownerEmail, /^Áminning: beiðni/)).toHaveLength(1)
  const [row] = await db.select().from(schema.entryRequest).where(eq(schema.entryRequest.entryId, e.entryId))
  expect(row.reminderSentAt).not.toBeNull()
})
