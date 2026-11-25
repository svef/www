import { existsSync } from 'node:fs'
import { and, eq, isNull } from 'drizzle-orm'
import { expect, test, type Browser } from '@playwright/test'
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
import { actAs } from './awards-session'
import { settle, urlFor } from './pages'

/**
 * The admin (Stjórnborð): the overview, the projects list's filters and paging (all in the
 * URL), and the users list and user page where the admin role is granted and removed.
 * Admins act through the test-session cookie with an `admin` role row.
 */
if (existsSync('.env.local')) process.loadEnvFile('.env.local')

test.describe.configure({ mode: 'serial' })

const { db, close } = openFixtureDb()
const baseURL = () => test.info().project.use.baseURL as string
const RUN = `zadm${uniqueKennitala().slice(0, 6)}`
const projects: string[] = []
const entries: { paid: string[]; unpaid: string[] } = { paid: [], unpaid: [] }

test.beforeAll(async () => {
  const ed = await seededEdition(db)
  const owner = await createUser(db, `${RUN}-owner`)
  const billing = await createBillingProfile(db, owner, { kennitala: uniqueKennitala(), companyName: `${RUN} Greiðandi ehf.` })
  // 27 submitted entries, so the list (25 a page) has a second page; 3 of them without a payer.
  for (let i = 0; i < 27; i++) {
    const withPayer = i >= 3
    const projectId = await createProject(db, {
      editionId: ed.editionId,
      userId: owner,
      title: `${RUN} Verkefni ${String(i).padStart(2, '0')}`,
      billingProfileId: withPayer ? billing : undefined,
    })
    projects.push(projectId)
    const entryId = await createEntry(db, { projectId, categoryId: ed.categories[i % 2].id, status: 'submitted' })
    ;(withPayer ? entries.paid : entries.unpaid).push(entryId)
  }
})

test.afterAll(async () => {
  await retireProjects(db, projects)
  await close()
})

async function admin(browser: Browser, name = `${RUN} Stjórnandi`, role: 'admin' | 'superadmin' = 'admin') {
  const context = await browser.newContext({ baseURL: baseURL() })
  const id = await createUser(db, `${RUN}-admin`)
  await db.update(schema.user).set({ name }).where(eq(schema.user.id, id))
  await db.insert(schema.userRole).values({ userId: id, role })
  await actAs(context, baseURL(), id)
  return { context, id, page: await context.newPage() }
}

test('the overview counts entries by category and status, and links into the list', async ({ browser }) => {
  const { context, page } = await admin(browser)
  await page.goto(urlFor('is', '/stjornbord'))
  await settle(page)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Staðan')
  const counts = page.getByTestId('overview-counts')
  await expect(counts.getByRole('columnheader', { name: 'Innsent' })).toBeVisible()
  const ed = await seededEdition(db)
  // At least this run's 14 entries in the first category (the row's total).
  const cell = counts.locator(`tr[data-category="${ed.categories[0].id}"] td`).last().locator('a')
  expect(Number((await cell.innerText()).replace(/\D/g, ''))).toBeGreaterThanOrEqual(14)
  await cell.click()
  await expect(page).toHaveURL(new RegExp(`/is/stjornbord/verkefni\\?.*category=${ed.categories[0].id}`))
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Verkefni')
  await context.close()
})

test('the projects list searches, filters on billing, sorts and pages, all in the URL', async ({ browser }) => {
  const { context, page } = await admin(browser)
  const base = urlFor('is', '/stjornbord/verkefni')
  await page.goto(base)
  await page.getByLabel('Leita', { exact: true }).fill(RUN)
  await page.getByRole('button', { name: 'Sía' }).click()
  await expect(page).toHaveURL(new RegExp(`q=${RUN}`))
  const summary = page.getByTestId('list-summary')
  await expect(summary).toHaveText('Færslur 1–25 af 27')
  await expect(page.locator('tbody tr')).toHaveCount(25)

  // Sort by title, then the second page.
  await page.getByRole('link', { name: /Raða eftir: Verkefni/ }).click()
  await expect(page.locator('th[aria-sort="ascending"]')).toContainText('Verkefni')
  const pager = page.getByRole('navigation', { name: 'Blaðsíður' })
  await pager.getByRole('link', { name: 'Síða 2' }).click()
  await expect(page).toHaveURL(/page=2/)
  await expect(summary).toHaveText('Færslur 26–27 af 27')
  await expect(page.locator('tbody tr th a')).toHaveText([`${RUN} Verkefni 25`, `${RUN} Verkefni 26`])
  await expect(pager.getByRole('link', { name: 'Síða 2 af 2' })).toHaveAttribute('aria-current', 'page')

  // A view is a link: open it fresh and it is the same.
  const url = page.url()
  await page.goto(url)
  await expect(summary).toHaveText('Færslur 26–27 af 27')

  // Billing: only the three without a payer.
  await page.locator('select[name="billing"]').selectOption('missing')
  await page.getByRole('button', { name: 'Sía' }).click()
  await expect(page).toHaveURL(/billing=missing/)
  await expect(summary).toHaveText('Færslur 1–3 af 3')
  for (const id of entries.unpaid) await expect(page.locator(`tr[data-entry="${id}"]`)).toBeVisible()

  // The payer's name is searchable too, and "clear filters" goes back to the default view.
  await page.goto(`${base}?q=${encodeURIComponent(`${RUN} Greiðandi`)}&status=all`)
  await expect(summary).toHaveText('Færslur 1–24 af 24')
  await page.getByRole('link', { name: 'Hreinsa síur' }).click()
  await expect(page).not.toHaveURL(/q=/)
  await context.close()
})

test('an admin finds a user, grants and removes the admin role, and it is logged', async ({ browser }) => {
  const { context, id: adminId, page } = await admin(browser)
  const target = await createUser(db, `${RUN}-target`)
  await db.update(schema.user).set({ name: `${RUN} Markús` }).where(eq(schema.user.id, target))

  await page.goto(urlFor('is', '/stjornbord/notendur'))
  await page.getByLabel('Leita', { exact: true }).fill(`${RUN} Markús`)
  await page.getByRole('button', { name: 'Sía' }).click()
  await expect(page.getByTestId('users-summary')).toHaveText('Notendur 1–1 af 1')
  await page.getByRole('link', { name: `${RUN} Markús` }).click()
  await expect(page).toHaveURL(new RegExp(`/is/stjornbord/notendur/${target}$`))
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(`${RUN} Markús`)

  const role = page.getByTestId('user-role')
  await expect(role).toContainText('Er ekki stjórnandi.')
  await role.getByRole('button', { name: 'Gera að stjórnanda' }).click()
  await expect(page.getByTestId('role-result')).toHaveText('Notandinn er nú stjórnandi.')
  await expect(role).toContainText('Er stjórnandi')
  await expect(page.getByTestId('user-history')).toContainText('Gerður að stjórnanda')

  // The admins filter finds them now.
  await page.goto(`${urlFor('is', '/stjornbord/notendur')}?role=admin&q=${encodeURIComponent(RUN)}`)
  await expect(page.getByRole('link', { name: `${RUN} Markús` })).toBeVisible()

  await page.goto(urlFor('is', `/stjornbord/notendur/${target}`))
  await page.getByRole('button', { name: 'Fjarlægja stjórnandaaðgang' }).click()
  await expect(page.getByTestId('role-result')).toHaveText('Stjórnandaaðgangur var fjarlægður.')
  await expect(page.getByTestId('user-role')).toContainText('Er ekki stjórnandi.')

  const log = await db.select().from(schema.userEvent).where(eq(schema.userEvent.userId, target))
  expect(log.map((e) => [e.type, e.actorUserId])).toEqual([
    ['role_granted', adminId],
    ['role_removed', adminId],
  ])
  const active = await db
    .select()
    .from(schema.userRole)
    .where(and(eq(schema.userRole.userId, target), isNull(schema.userRole.deletedAt)))
  expect(active).toEqual([])

  // The change shows in the overview's latest changes.
  await page.goto(urlFor('is', '/stjornbord'))
  await expect(page.getByTestId('overview-activity')).toContainText(`fjarlægði stjórnandaaðgang ${RUN} Markús`)
  await context.close()
})

test('an admin cannot remove their own admin role', async ({ browser }) => {
  const { context, id, page } = await admin(browser)
  await page.goto(urlFor('en', `/stjornbord/notendur/${id}`))
  await expect(page).toHaveURL(new RegExp(`/en/admin/users/${id}$`))
  const role = page.getByTestId('user-role')
  await expect(role).toContainText('You cannot remove your own admin access.')
  await expect(role.getByRole('button')).toHaveCount(0)
  await context.close()
})

test('a super admin is labelled, and an admin cannot change their access', async ({ browser }) => {
  const sup = await createUser(db, `${RUN}-super`)
  await db.update(schema.user).set({ name: `${RUN} Yfirmaður` }).where(eq(schema.user.id, sup))
  await db.insert(schema.userRole).values({ userId: sup, role: 'superadmin' })

  const { context, page } = await admin(browser)
  await page.goto(`${urlFor('is', '/stjornbord/notendur')}?role=admin&q=${encodeURIComponent(`${RUN} Yfirmaður`)}`)
  await expect(page.locator(`tr[data-user="${sup}"]`)).toContainText('Yfirstjórnandi')

  await page.goto(urlFor('is', `/stjornbord/notendur/${sup}`))
  const role = page.getByTestId('user-role')
  await expect(role).toContainText('Er yfirstjórnandi')
  await expect(page.getByTestId('superadmin-note')).toHaveText('Aðgangi yfirstjórnanda er ekki hægt að breyta hér.')
  await expect(role.getByRole('button')).toHaveCount(0)
  await context.close()
})

test('a super admin opens the admin and grants the admin role like any admin', async ({ browser }) => {
  const { context, page } = await admin(browser, `${RUN} Yfir`, 'superadmin')
  const target = await createUser(db, `${RUN}-target2`)
  await page.goto(urlFor('is', `/stjornbord/notendur/${target}`))
  await page.getByRole('button', { name: 'Gera að stjórnanda' }).click()
  await expect(page.getByTestId('role-result')).toHaveText('Notandinn er nú stjórnandi.')
  await context.close()
})

test('outcome messages in the query string cannot name an inherited property', async ({ browser }) => {
  const { context, id, page } = await admin(browser)
  for (const path of [
    `/stjornbord/notendur/${id}?role=error:__proto__`,
    `/stjornbord/notendur/${id}?role=error:constructor`,
    `/stjornbord/verkefni?changed=0&skip=x:__proto__&skip=y:constructor`,
  ]) {
    const res = await page.goto(urlFor('is', path))
    expect(res?.status(), path).toBe(200)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  }
  await context.close()
})
