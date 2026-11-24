import { existsSync } from 'node:fs'
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { and, eq } from 'drizzle-orm'
import * as schema from '../src/lib/awards/db/schema'
import { encryptCredential } from '../src/lib/awards/projects/crypto'
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
import { actAs } from './awards-session'
import { urlFor } from './pages'

/**
 * The awards staff area (svef/www#168): the entries list, the entry view with the admin-only
 * fields above what the jury sees, login details decrypted on demand (each press audited), and
 * transferring a project to another creator.
 *
 * The staff account is made through Better Auth's real sign-up and given the `staff` role row
 * (the staff pages read the real session). The new creator is an account made through the
 * schema and acted as through the test-session cookie, to see the project on their dashboard.
 * Projects are retired afterwards; `entry_event` rows are append-only and stay behind, hanging
 * off retired projects. The server runs with `AWARDS_CREDENTIAL_KEY` set by `playwright.config.ts`.
 */
if (existsSync('.env.local')) process.loadEnvFile('.env.local')

// The same throwaway key `playwright.config.ts` gives the server, so what is encrypted here decrypts there.
process.env.AWARDS_CREDENTIAL_KEY = Buffer.alloc(32, 7).toString('base64')

const PASSWORD = 'correct horse battery'
const RUN = uniqueKennitala().slice(0, 6)
const LOGIN_SECRET = `lykilord-${RUN}-ÞÆÖ`

test.describe.configure({ mode: 'serial' })

const { db, close } = openFixtureDb()
const baseURL = () => test.info().project.use.baseURL as string

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
  await db.insert(schema.userRole).values({ userId: u.id, role: 'staff' })
  return u.id
}

const T = (name: string) => `${name} ${RUN}`
const projects: string[] = []
let ids: {
  owner: string
  newCreator: string
  newCreatorEmail: string
  student: string // student-project entry, with answers, people, a login and billing
  studentProject: string
  other: string // a plain submitted entry in another category
  draft: string
  ownerEmail: string
}

test.beforeAll(async () => {
  const ed = await seededEdition(db)
  const [student] = await db
    .select()
    .from(schema.category)
    .where(and(eq(schema.category.editionId, ed.editionId), eq(schema.category.slug, 'student-project')))
  const owner = await createUser(db, 'owner')
  const newCreator = await createUser(db, 'newcreator')
  const emailOf = async (id: string) =>
    (await db.select({ e: schema.user.email }).from(schema.user).where(eq(schema.user.id, id)))[0].e
  const billing = await createBillingProfile(db, owner, {
    kennitala: '4501012340',
    companyName: `Þórsmörk ${RUN} ehf.`,
  })

  const studentProject = await createProject(db, {
    editionId: ed.editionId,
    userId: owner,
    title: T('Nemendavefur'),
    billingProfileId: billing,
  })
  projects.push(studentProject)
  await db.insert(schema.projectAnswer).values([
    { projectId: studentProject, fieldKey: 'description', value: `Lýsing sem dómnefnd les ${RUN}` },
    { projectId: studentProject, fieldKey: 'links', value: ['https://example.is/verkefni'] },
    { projectId: studentProject, fieldKey: 'requiresLogin', value: true },
    { projectId: studentProject, fieldKey: 'school', value: `Háskóli ${RUN}` },
    { projectId: studentProject, fieldKey: 'programme', value: 'Vefþróun' },
    { projectId: studentProject, fieldKey: 'publicCredit', value: `Anna og Jón ${RUN}` },
  ])
  await db.insert(schema.projectPerson).values([
    { projectId: studentProject, kind: 'owner', name: `Eigandi ${RUN}`, email: 'eigandi@example.is', company: 'Vefstofa' },
    { projectId: studentProject, kind: 'collaborator', name: 'Sigga', role: 'Hönnun', email: 'sigga@example.is' },
  ])
  await db.insert(schema.credential).values({
    projectId: studentProject,
    label: 'Stjórnandi',
    valueEncrypted: encryptCredential(LOGIN_SECRET),
    notes: 'tvíþátta auðkenning',
  })
  const studentEntry = await createEntry(db, { projectId: studentProject, categoryId: student.id, status: 'submitted' })

  const other = await createProject(db, { editionId: ed.editionId, userId: owner, title: T('Annað verkefni') })
  projects.push(other)
  const otherEntry = await createEntry(db, { projectId: other, categoryId: ed.categories[0].id, status: 'eligible' })
  const draftProject = await createProject(db, { editionId: ed.editionId, userId: owner, title: T('Drög') })
  projects.push(draftProject)
  const draft = await createEntry(db, { projectId: draftProject, categoryId: ed.categories[0].id, status: 'draft' })

  ids = {
    owner,
    ownerEmail: await emailOf(owner),
    newCreator,
    newCreatorEmail: await emailOf(newCreator),
    student: studentEntry,
    studentProject,
    other: otherEntry,
    draft,
  }
})

test.afterAll(async () => {
  await retireProjects(db, projects)
  await close()
})

const listUrl = (l: 'is' | 'en' = 'is') => urlFor(l, '/innsendingar/starfsfolk')
const entryUrl = (id: string, l: 'is' | 'en' = 'is') => urlFor(l, `/innsendingar/starfsfolk/${id}`)

async function staffPage(page: Page, label: string) {
  const staffId = await makeStaff(await signUp(page, label))
  return staffId
}

test('anonymous visitors are sent to sign in and non-staff get 404 on the list and the entry view', async ({
  page,
  browser,
}) => {
  const anon = await browser.newContext()
  const res = await anon.request.get(entryUrl(ids.student), { maxRedirects: 0 })
  expect([307, 308]).toContain(res.status())
  expect(res.headers().location).toContain('/innskraning')
  await anon.close()

  await signUp(page, 'plain')
  expect((await page.goto(listUrl()))?.status()).toBe(404)
  expect((await page.goto(entryUrl(ids.student)))?.status()).toBe(404)
  expect((await page.goto(entryUrl(ids.student, 'en')))?.status()).toBe(404)
})

test('the entries list filters by category, status and title, sorts, and links to the entry', async ({ page }) => {
  await staffPage(page, 'staff-list')
  const row = (id: string) => page.locator(`tr[data-entry="${id}"]`)
  const ed = await seededEdition(db)

  // Narrow to this run's rows with the title search; drafts are hidden by default.
  await page.goto(listUrl())
  await page.getByLabel('Leita í heiti verkefnis').fill(RUN)
  await page.getByRole('button', { name: 'Sía' }).click()
  await expect(row(ids.student)).toBeVisible()
  await expect(row(ids.other)).toBeVisible()
  await expect(row(ids.draft)).toHaveCount(0)
  await expect(page.getByTestId('list-summary')).toHaveText('Færslur 1–2 af 2')

  // Status.
  await page.locator('select[name="status"]').selectOption('eligible')
  await page.getByRole('button', { name: 'Sía' }).click()
  await expect(row(ids.other)).toBeVisible()
  await expect(row(ids.student)).toHaveCount(0)
  await page.locator('select[name="status"]').selectOption('draft')
  await page.getByRole('button', { name: 'Sía' }).click()
  await expect(row(ids.draft)).toBeVisible()
  await expect(row(ids.other)).toHaveCount(0)

  // Category (the student-project entry is in neither of the first two categories).
  await page.locator('select[name="status"]').selectOption('submitted')
  await page.locator('select[name="category"]').selectOption(ed.categories[0].id)
  await page.getByRole('button', { name: 'Sía' }).click()
  await expect(row(ids.other)).toBeVisible()
  await expect(row(ids.student)).toHaveCount(0)

  // Sorting by project title, both ways.
  await page.locator('select[name="category"]').selectOption('')
  await page.locator('select[name="status"]').selectOption('submitted')
  await page.getByRole('button', { name: 'Sía' }).click()
  const titles = () => page.locator('tbody tr th a').allTextContents()
  await page.getByRole('link', { name: 'Raða eftir: Verkefni' }).click()
  await expect(page.locator('th[aria-sort="ascending"]')).toContainText('Verkefni')
  expect(await titles()).toEqual([T('Annað verkefni'), T('Nemendavefur')])
  await page.getByRole('link', { name: 'Raða eftir: Verkefni' }).click()
  await expect(page.locator('th[aria-sort="descending"]')).toContainText('Verkefni')
  expect(await titles()).toEqual([T('Nemendavefur'), T('Annað verkefni')])

  // The title opens the entry.
  await page.getByRole('link', { name: T('Nemendavefur') }).click()
  await expect(page).toHaveURL(new RegExp(`/innsendingar/starfsfolk/${ids.student}$`))
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Færsla')
  await expect(page.getByTestId('jury-section')).toContainText(T('Nemendavefur'))
})

test('the entry view shows the admin-only fields above what the jury sees', async ({ page }) => {
  await staffPage(page, 'staff-view')
  expect((await page.goto(entryUrl(ids.student)))?.status()).toBe(200)

  const admin = page.getByTestId('admin-section')
  const jury = page.getByTestId('jury-section')
  await expect(admin).toBeVisible()
  await expect(jury).toBeVisible()

  // Above it, in the page.
  const [a, j] = await Promise.all([admin.boundingBox(), jury.boundingBox()])
  expect(a!.y + a!.height).toBeLessThanOrEqual(j!.y + 1)

  // Admin: who made it, who pays, the image slot, school and public credit.
  await expect(admin).toContainText(ids.ownerEmail)
  await expect(admin).toContainText(`Eigandi ${RUN}`)
  await expect(admin).toContainText('eigandi@example.is')
  await expect(admin).toContainText('Sigga')
  await expect(admin).toContainText('4501012340')
  await expect(admin).toContainText(`Þórsmörk ${RUN} ehf.`)
  await expect(admin).toContainText(`Háskóli ${RUN}`)
  await expect(admin).toContainText(`Anna og Jón ${RUN}`)
  await expect(admin).toContainText('Engin mynd')
  await expect(admin).not.toContainText('Lýsing sem dómnefnd les')

  // Jury: what the entrant wrote for them, and none of the admin fields.
  await expect(jury).toContainText(`Lýsing sem dómnefnd les ${RUN}`)
  await expect(jury).toContainText('https://example.is/verkefni')
  for (const hidden of [ids.ownerEmail, `Háskóli ${RUN}`, `Anna og Jón ${RUN}`, '4501012340', `Eigandi ${RUN}`]) {
    await expect(jury).not.toContainText(hidden)
  }

  // Login details are never in the page until asked for, and a place for requests is reserved.
  expect(await page.content()).not.toContain(LOGIN_SECRET)
  await expect(page.getByTestId('requests-placeholder')).toBeVisible()

  // The English route reaches the same view.
  expect((await page.goto(entryUrl(ids.student, 'en')))?.status()).toBe(200)
  await expect(page.getByTestId('admin-section')).toContainText(ids.ownerEmail)

  // An id that is not an entry, or not an id, is a 404.
  expect((await page.goto(entryUrl('00000000-0000-7000-8000-000000000000')))?.status()).toBe(404)
  expect((await page.goto(entryUrl('not-an-id')))?.status()).toBe(404)
})

test('decrypting login details shows them on demand and writes one audit event per press', async ({ page }) => {
  const staffId = await staffPage(page, 'staff-decrypt')
  const viewed = () =>
    db
      .select()
      .from(schema.entryEvent)
      .where(and(eq(schema.entryEvent.entryId, ids.student), eq(schema.entryEvent.type, 'credentials_viewed')))
  const before = (await viewed()).length

  await page.goto(entryUrl(ids.student))
  await expect(page.getByTestId('credentials')).toHaveCount(0)
  expect((await viewed()).length).toBe(before)

  await page.getByRole('button', { name: 'Birta innskráningarupplýsingar' }).click()
  const shown = page.getByTestId('credentials')
  await expect(shown).toContainText(LOGIN_SECRET)
  await expect(shown).toContainText('Stjórnandi')
  await expect(shown).toContainText('tvíþátta auðkenning')

  let events = await viewed()
  expect(events).toHaveLength(before + 1)
  expect(events.at(-1)).toMatchObject({ actorUserId: staffId, projectId: ids.studentProject, data: { count: 1 } })
  expect(JSON.stringify(events.at(-1))).not.toContain(LOGIN_SECRET)

  // Hiding drops them from the page; showing again asks the server again, and is logged again.
  await page.getByRole('button', { name: 'Fela' }).click()
  await expect(shown).toHaveCount(0)
  expect(await page.content()).not.toContain(LOGIN_SECRET)
  await page.getByRole('button', { name: 'Birta innskráningarupplýsingar' }).click()
  await expect(page.getByTestId('credentials')).toContainText(LOGIN_SECRET)
  events = await viewed()
  expect(events).toHaveLength(before + 2)

  // A reload starts hidden (nothing is kept), and the history lists both views by name.
  await page.reload()
  await expect(page.getByTestId('credentials')).toHaveCount(0)
  expect(await page.content()).not.toContain(LOGIN_SECRET)
  const history = page.getByTestId('history').locator('tr[data-event="credentials_viewed"]')
  await expect(history).toHaveCount(before + 2)
  await expect(history.last()).toContainText('Test staff-decrypt')
})

test('transferring a project moves it to the new creator, is logged, and refuses unknown accounts', async ({
  page,
  browser,
}) => {
  const staffId = await staffPage(page, 'staff-transfer')
  await page.goto(entryUrl(ids.student))

  // An unknown email changes nothing.
  await page.getByLabel('Netfang núverandi aðgangs').fill(`nobody-${RUN}@example.is`)
  await page.getByRole('button', { name: 'Flytja verkefni' }).click()
  await expect(page.getByTestId('result')).toContainText('Enginn aðgangur er með þetta netfang.')
  await expect(page.getByTestId('creator')).toContainText(ids.ownerEmail)

  // The current creator is refused.
  await page.getByLabel('Netfang núverandi aðgangs').fill(ids.ownerEmail)
  await page.getByRole('button', { name: 'Flytja verkefni' }).click()
  await expect(page.getByTestId('result')).toContainText('Þessi aðgangur á verkefnið nú þegar.')

  // The real transfer.
  const dash = async (userId: string) => {
    const context = await browser.newContext({ baseURL: baseURL() })
    await actAs(context, baseURL(), userId)
    const p = await context.newPage()
    await p.goto(urlFor('is', '/innsendingar/minar'))
    const text = await p.locator('main').innerText()
    await context.close()
    return text
  }
  expect(await dash(ids.owner)).toContain(T('Nemendavefur'))
  expect(await dash(ids.newCreator)).not.toContain(T('Nemendavefur'))

  await page.getByLabel('Netfang núverandi aðgangs').fill(ids.newCreatorEmail)
  await page.getByRole('button', { name: 'Flytja verkefni' }).click()
  await expect(page.getByTestId('result')).toContainText(`Verkefnið var flutt til ${ids.newCreatorEmail}.`)
  await expect(page.getByTestId('creator')).toContainText(ids.newCreatorEmail)
  await expect(page.getByTestId('history').locator('tr[data-event="project_transferred"]')).toContainText(
    `${ids.ownerEmail} → ${ids.newCreatorEmail}`,
  )

  const [p] = await db.select().from(schema.project).where(eq(schema.project.id, ids.studentProject))
  expect(p.createdBy).toBe(ids.newCreator)
  const [ev] = await db
    .select()
    .from(schema.entryEvent)
    .where(and(eq(schema.entryEvent.projectId, ids.studentProject), eq(schema.entryEvent.type, 'project_transferred')))
  expect(ev).toMatchObject({ actorUserId: staffId, before: { createdBy: ids.owner }, after: { createdBy: ids.newCreator } })

  // The new creator sees it on their dashboard; the old one no longer does.
  expect(await dash(ids.newCreator)).toContain(T('Nemendavefur'))
  expect(await dash(ids.owner)).not.toContain(T('Nemendavefur'))
})

test('the staff list and the entry view have no axe violations, in both languages', async ({ page }) => {
  await staffPage(page, 'staff-axe-area')
  for (const url of [listUrl('is'), listUrl('en'), entryUrl(ids.student, 'is'), entryUrl(ids.student, 'en')]) {
    await page.goto(url)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' ')}`), url).toEqual([])
  }
})
