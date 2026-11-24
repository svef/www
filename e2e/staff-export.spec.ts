import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { strFromU8, unzipSync } from 'fflate'
import { eq } from 'drizzle-orm'
import * as schema from '../src/lib/awards/db/schema'
import {
  createBillingProfile,
  createEntry,
  createProject,
  createUser,
  openFixtureDb,
  retireProjects,
  seededEdition,
  uniqueKennitala,
} from '../src/lib/awards/staff/test-fixtures'

/**
 * Awards staff: eligibility and the invoicing export (svef/www#170).
 *
 * The server's clock is overridden for the staff area only: `playwright.config.ts` sets
 * `AWARDS_CLOCK_NOW` to a date after the seeded edition closes, because the app under test
 * is a production build and the real clock is before close (see `staff/clock.ts`). The
 * "before close" refusal is covered against the service in `staff/eligibility.test.ts`,
 * where `now` is a parameter.
 *
 * Projects and entries are inserted through the schema (the project form is built
 * elsewhere), inside the seeded edition, and retired afterwards. Other tests may have rows
 * in the same edition, so every check is about the rows made here, told apart by a
 * kennitala made up per run. The staff account is made through Better Auth's real sign-up
 * endpoint and then given the `staff` role row. Runs serially: the cases share the data.
 */
if (existsSync('.env.local')) process.loadEnvFile('.env.local')

const PASSWORD = 'correct horse battery'
const KT_A = uniqueKennitala()
const KT_B = uniqueKennitala(true) // leading zero: the case spreadsheets get wrong
const RUN = KT_A.slice(0, 6)

test.describe.configure({ mode: 'serial' })

const { db, close } = openFixtureDb()

async function signUp(page: Page, label: string): Promise<string> {
  const email = `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.is`
  const res = await page.request.post('/api/account/sign-up/email', {
    data: { name: `Test ${label}`, email, password: PASSWORD },
  })
  expect(res.ok(), await res.text()).toBe(true)
  return email
}

async function makeStaff(email: string) {
  const [u] = await db.select().from(schema.user).where(eq(schema.user.email, email))
  await db.insert(schema.userRole).values({ userId: u.id, role: 'admin' })
  return u.id
}

let entries: { a1: string; a2: string; b: string; none: string; withdrawn: string }
const projects: string[] = []

test.beforeAll(async () => {
  const ed = await seededEdition(db)
  const owner = await createUser(db, 'owner')
  const acme = await createBillingProfile(db, owner, {
    kennitala: KT_A,
    companyName: `Þórsmörk ${RUN} ehf.`,
    address: 'Ægisgata 1, 101 Reykjavík',
    reference: 'PO-7',
  })
  const bolt = await createBillingProfile(db, owner, {
    kennitala: KT_B,
    companyName: `Bolti ${RUN} ehf.`,
  })
  const make = async (title: string, status: schema.EntryStatus, billing?: string, second = false) => {
    const projectId = await createProject(db, {
      editionId: ed.editionId,
      userId: owner,
      title: `${title} ${RUN}`,
      billingProfileId: billing,
    })
    projects.push(projectId)
    return createEntry(db, {
      projectId,
      categoryId: ed.categories[second ? 1 : 0].id,
      status,
    })
  }
  entries = {
    a1: await make('Fyrsta verkefnið', 'submitted', acme),
    a2: await make('Annað verkefni „Þ“', 'submitted', acme, true),
    b: await make('Þriðja verkefnið', 'submitted', bolt),
    none: await make('Án greiðanda', 'submitted'),
    withdrawn: await make('Dregið til baka', 'withdrawn', acme),
  }
})

test.afterAll(async () => {
  await retireProjects(db, projects)
  await close()
})

test('the export and the admin are closed to anonymous visitors and to non-admins', async ({
  page,
  browser,
}) => {
  const anon = await browser.newContext()
  const res = await anon.request.get(`/api/awards/staff/export?format=csv`, {
    maxRedirects: 0,
  })
  expect([307, 308]).toContain(res.status())
  expect(res.headers().location).toContain('/innskraning')
  await anon.close()

  await signUp(page, 'plain') // signed in, but no role
  expect((await page.request.get(`/api/awards/staff/export?format=csv`)).status()).toBe(404)
  for (const path of ['/is/stjornbord', '/is/stjornbord/verkefni', '/en/admin/users', '/is/stjornbord/verkfaeri']) {
    expect((await page.goto(path))?.status(), path).toBe(404)
  }
})

test('staff download the invoicing export as CSV and XLSX, and it is logged', async ({ page }) => {
  const staffId = await makeStaff(await signUp(page, 'staff'))
  await page.goto(`/is/stjornbord/verkfaeri`)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  // CSV through the real button.
  const csvDownload = page.waitForEvent('download')
  await page.getByRole('link', { name: 'Sækja CSV' }).click()
  const csvFile = await csvDownload
  expect(csvFile.suggestedFilename()).toMatch(/^reikningar-2026-\d{4}-\d{2}-\d{2}\.csv$/)
  const csvBytes = await readFile((await csvFile.path())!)
  expect([...csvBytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
  const csv = csvBytes.toString('utf8').slice(1)
  expect(csv).toContain(`Þórsmörk ${RUN} ehf.`)
  expect(csv).toContain(`Annað verkefni „Þ“ ${RUN}`)
  expect(csv).toContain(`Án greiðanda ${RUN}`)
  expect(csv).toContain('Vantar reikningsupplýsingar')
  expect(csv).not.toContain(`Dregið til baka ${RUN}`)
  expect(csv).toMatch(/Samtals alls \(\d+\);/)
  // The leading zero survives in the file.
  expect(csv).toContain(`${KT_B};Bolti ${RUN} ehf.;`)
  // Two projects under one kennitala: two entry rows and a subtotal of 37 800.
  expect(csv.match(new RegExp(KT_A, 'g'))).toHaveLength(3)
  expect(csv).toContain(`${KT_A};Þórsmörk ${RUN} ehf.;;;;Samtals (2);;;;;;37800`)

  // XLSX through the real button.
  const xlsxDownload = page.waitForEvent('download')
  await page.getByRole('link', { name: 'Sækja XLSX' }).click()
  const xlsxFile = await xlsxDownload
  expect(xlsxFile.suggestedFilename()).toMatch(/\.xlsx$/)
  const files = unzipSync(new Uint8Array(await readFile((await xlsxFile.path())!)))
  const strings = strFromU8(files['xl/sharedStrings.xml'])
  for (const text of [
    `Þórsmörk ${RUN} ehf.`,
    `Bolti ${RUN} ehf.`,
    `Annað verkefni „Þ“ ${RUN}`,
    `<t>${KT_B}</t>`,
  ]) {
    expect(strings).toContain(text)
  }
  expect(strings).not.toContain(`Dregið til baka ${RUN}`)

  // Every download left an audit row naming the staff member.
  const events = await db
    .select()
    .from(schema.entryEvent)
    .where(eq(schema.entryEvent.entryId, entries.a1))
  const exported = events.filter((e) => e.type === 'invoicing_exported')
  expect(exported.map((e) => (e.data as { format: string }).format).sort()).toEqual(['csv', 'xlsx'])
  expect(exported.every((e) => e.actorUserId === staffId)).toBe(true)
  const withdrawnEvents = await db
    .select()
    .from(schema.entryEvent)
    .where(eq(schema.entryEvent.entryId, entries.withdrawn))
  expect(withdrawnEvents).toHaveLength(0)

  expect((await page.request.get('/api/awards/staff/export?format=pdf')).status()).toBe(400)
})

test('staff set eligibility after close, one by one and in bulk', async ({ page }) => {
  await makeStaff(await signUp(page, 'staff-eligibility'))
  await page.goto(`/is/stjornbord/verkefni`)

  // The list is paginated and the edition holds other specs' rows: narrow it to this run's.
  await page.getByLabel('Leita', { exact: true }).fill(RUN)
  await page.getByRole('button', { name: 'Sía' }).click()
  const row = (id: string) => page.locator(`tr[data-entry="${id}"]`)
  await expect(row(entries.a1).locator('[data-status]')).toHaveText('Innsent')
  await expect(page.locator(`tr[data-entry="${entries.withdrawn}"]`)).toHaveCount(0)

  // One entry: submitted -> pending.
  await row(entries.a1).getByRole('button', { name: /^Í skoðun/ }).click()
  await expect(page.getByTestId('result')).toContainText('1 færsla uppfærð.')
  await expect(row(entries.a1).locator('[data-status]')).toHaveText('Hæfi í skoðun')
  // From pending the page offers eligible/ineligible, not another "pending".
  await expect(row(entries.a1).getByRole('button')).toHaveCount(2)

  // Bulk: a1 is already pending, so it is skipped with a reason; a2 and b change.
  for (const id of [entries.a1, entries.a2, entries.b]) {
    await row(id).getByRole('checkbox').check()
  }
  await page.getByLabel('Skrá valdar færslur sem').selectOption('eligibility_pending')
  await page.getByRole('button', { name: 'Uppfæra valdar' }).click()
  const result = page.getByTestId('result')
  await expect(result).toContainText('2 færslur uppfærðar.')
  await expect(result).toContainText('1 færsla var ekki uppfærð:')
  await expect(result).toContainText(`Fyrsta verkefnið ${RUN}: staðan er þegar sú sama`)
  await expect(row(entries.a2).locator('[data-status]')).toHaveText('Hæfi í skoðun')

  // Decide, then correct a decision (eligible <-> ineligible).
  await row(entries.a1).getByRole('button', { name: /^Gjaldgengt/ }).click()
  await expect(row(entries.a1).locator('[data-status]')).toHaveText('Gjaldgengt')
  await row(entries.a1).getByRole('button', { name: /^Ekki gjaldgengt/ }).click()
  await expect(row(entries.a1).locator('[data-status]')).toHaveText('Ekki gjaldgengt')

  // The filter narrows the list.
  await page.locator('select[name="status"]').selectOption('ineligible')
  await page.getByRole('button', { name: 'Sía' }).click()
  await expect(row(entries.a1)).toBeVisible()
  await expect(row(entries.b)).toHaveCount(0)

  // Every change is in the log.
  const events = await db
    .select()
    .from(schema.entryEvent)
    .where(eq(schema.entryEvent.entryId, entries.a1))
  const changes = events.filter((e) => e.type === 'eligibility_changed')
  expect(changes.map((e) => (e.after as { status: string }).status)).toEqual([
    'eligibility_pending',
    'eligible',
    'ineligible',
  ])
})

test('the admin pages have no axe violations, in both languages', async ({ page }) => {
  await makeStaff(await signUp(page, 'staff-axe'))
  for (const path of [
    `/is/stjornbord`,
    `/en/admin`,
    `/is/stjornbord/verkefni`,
    `/en/admin/projects`,
    `/is/stjornbord/beidnir`,
    `/en/admin/requests`,
    `/is/stjornbord/notendur`,
    `/en/admin/users`,
    `/is/stjornbord/verkfaeri`,
    `/en/admin/tools`,
  ]) {
    await page.goto(`${path}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' ')}`)).toEqual([])
  }
})
