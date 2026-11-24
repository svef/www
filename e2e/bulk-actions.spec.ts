import AxeBuilder from '@axe-core/playwright'
import { existsSync } from 'node:fs'
import { expect, test, type Browser, type Page } from '@playwright/test'
import { and, eq } from 'drizzle-orm'
import * as schema from '../src/lib/awards/db/schema'
import {
  createBillingProfile,
  createEntry,
  createProject,
  openFixtureDb,
  retireProjects,
  seededEdition,
  uniqueKennitala,
} from '../src/lib/awards/staff/test-fixtures'
import { actAs, awardsPool, closeAwardsPool, createUser } from './awards-session'
import { settle, urlFor } from './pages'

/**
 * Withdraw and bulk actions (svef/www#166): withdrawing from the project page with the cost
 * stated, submitting again at the new price, and the dashboard list's bulk submit, withdraw
 * and billing change, including the projects they skip. Verified users act through the
 * test-session cookie; its clock cookie moves the server clock into the intake window.
 * Projects are built through the real services and retired afterwards.
 */
if (existsSync('.env.local')) process.loadEnvFile('.env.local')

let fixtures: ReturnType<typeof openFixtureDb> | undefined
const db = () => (fixtures ??= openFixtureDb()).db
const made: string[] = []
test.afterAll(async () => {
  await retireProjects(db(), made.splice(0))
  await fixtures?.close()
  fixtures = undefined
  await closeAwardsPool()
})

const baseURL = () => test.info().project.use.baseURL as string
const at = (iso: string) => Date.parse(iso) - Date.now()
const EARLY = at('2026-12-25T12:00:00Z')
const AFTER_EARLY = at('2027-01-10T12:00:00Z')
const DASH = urlFor('en', '/minar-sidur/verkefni')

async function person(browser: Browser, label: string, clock = EARLY) {
  const context = await browser.newContext({ baseURL: baseURL() })
  const id = await createUser(label, true)
  await actAs(context, baseURL(), id, clock)
  return { context, id, page: await context.newPage() }
}

const profile = (owner: string, company = 'Fjall ehf.') =>
  createBillingProfile(db(), owner, { kennitala: uniqueKennitala(), companyName: company })

/**
 * A complete App project (the answers the submit rules ask for) with billing and accepted
 * terms, and nobody holding its lock. Rows go in through the schema, as the other specs do.
 */
async function project(owner: string, title: string, opts: { fill?: boolean; submitted?: boolean } = {}) {
  const ed = await seededEdition(db())
  const [app] = await db()
    .select({ id: schema.category.id })
    .from(schema.category)
    .where(and(eq(schema.category.editionId, ed.editionId), eq(schema.category.slug, 'app')))
  const id = await createProject(db(), {
    editionId: ed.editionId,
    userId: owner,
    title,
    billingProfileId: await profile(owner),
  })
  made.push(id)
  await createEntry(db(), {
    projectId: id,
    categoryId: app.id,
    status: opts.submitted ? 'submitted' : 'draft',
    priceRegular: 26900,
    discountPercent: 30,
    priceAmount: 18900,
    submittedAt: new Date(),
  })
  if (opts.fill ?? true) {
    await db()
      .insert(schema.projectAnswer)
      .values([
        { projectId: id, fieldKey: 'description', value: 'A fine app.' },
        { projectId: id, fieldKey: 'publicCredit', value: 'Anna Ltd.' },
        { projectId: id, fieldKey: 'appLinks', value: ['https://apps.apple.com/is/app/x/id1'] },
      ])
    await db()
      .insert(schema.projectPerson)
      .values({ projectId: id, kind: 'owner', name: 'Anna', email: 'anna@example.is' })
  }
  await db().insert(schema.termsAcceptance).values({ userId: owner, projectId: id, termsVersion: '2026-1' })
  return id
}

/** Bjarni is editing the project right now (on the shifted server clock). */
async function editing(projectId: string, userId: string, clock = EARLY) {
  await db().insert(schema.projectPerson).values({
    projectId,
    kind: 'collaborator',
    name: 'Bjarni',
    canEdit: true,
    userId,
    acceptedAt: new Date(),
  })
  const now = new Date(Date.now() + clock)
  await db()
    .insert(schema.projectEditLock)
    .values({ projectId, holderUserId: userId, acquiredAt: now, lastActivityAt: now })
}

async function listView(page: Page) {
  await page.goto(DASH)
  await settle(page)
  await expect(page.locator('[data-project]').first()).toBeVisible()
}
const selectAll = (page: Page) => page.getByRole('checkbox', { name: 'Select all shown' }).check()
const statusOf = async (projectId: string) =>
  (await awardsPool().query(`select status from entry where project_id = $1`, [projectId])).rows[0].status as string

test.describe('withdraw on the project page', () => {
  test('states the cost, withdraws, and submitting again re-prices by the new date', async ({ browser }) => {
    const { context, id, page } = await person(browser, 'Anna')
    const projectId = await project(id, 'Fjallavefurinn', { submitted: true })
    await page.goto(urlFor('en', `/minar-sidur/verkefni/${projectId}#section-review`))
    await expect(page.locator('[data-lock="held"]')).toBeVisible()

    const withdraw = page.locator('[data-withdraw-entry="app"]')
    await withdraw.click()
    const d = page.getByRole('dialog', { name: 'Withdraw this entry?' })
    await expect(d).toBeVisible()
    await expect(d.locator('[data-withdraw-cost]')).toHaveText(
      'This entry has the early-bird price. If you submit it again after 4 January 2027 it will cost 26,900 kr.',
    )
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
    await page.keyboard.press('Escape')
    await expect(d).toHaveCount(0)
    await expect(withdraw).toBeFocused()

    await withdraw.click()
    await d.locator('[data-confirm-withdraw]').click()
    const done = page.locator('[data-withdraw-done]')
    await expect(done).toHaveText('App was withdrawn. Its price is no longer locked.')
    await expect(done).toBeFocused()
    await expect.poll(() => statusOf(projectId)).toBe('withdrawn')
    const row = page.locator('[data-withdrawn-entries] [data-entry-row="app"]')
    await expect(row).toContainText('Withdrawn')
    await expect(row).toContainText('18,900 kr. if submitted now (early-bird price)')

    // Days later, after the early bird: submitting again costs the regular price.
    await actAs(context, baseURL(), id, AFTER_EARLY)
    // A reload, not a same-URL visit (which, with a hash, would not load the page again).
    await page.reload()
    await expect(page.locator('[data-lock="held"]')).toBeVisible()
    await expect(page.locator('[data-withdrawn-entries] [data-entry-row="app"]')).toContainText(
      '26,900 kr. if submitted now (regular price)',
    )
    await page.locator('[data-resubmit-entry="app"]').click()
    const confirm = page.getByRole('dialog', { name: 'Submit your entries?' })
    await expect(confirm.locator('[data-dialog-price="app"]')).toContainText('26,900 kr.')
    await confirm.locator('[data-confirm-submit]').click()
    await expect(page.locator('[data-submit-done]')).toContainText('App: 26,900 kr. (regular price, locked)')
    await expect(page.locator('[data-entry-row="app"][data-status="submitted"]')).toContainText('26,900 kr.')
    const { rows } = await awardsPool().query(
      `select status, discount_percent, price_amount from entry where project_id = $1`,
      [projectId],
    )
    expect(rows[0]).toEqual({ status: 'submitted', discount_percent: 0, price_amount: 26900 })
    await context.close()
  })

  test('an editor does not see a withdraw button', async ({ browser }) => {
    const owner = await person(browser, 'Owner')
    const projectId = await project(owner.id, 'Sameiginlegt', { submitted: true })
    const editor = await person(browser, 'Helper')
    await db().insert(schema.projectPerson).values({
      projectId, kind: 'collaborator', name: 'Helper', canEdit: true, userId: editor.id, acceptedAt: new Date(),
    })
    await editor.page.goto(urlFor('en', `/minar-sidur/verkefni/${projectId}`))
    await expect(editor.page.locator('[data-entry-row="app"]')).toContainText('Submitted')
    await expect(editor.page.locator('[data-withdraw-entry]')).toHaveCount(0)
    await owner.context.close()
    await editor.context.close()
  })
})

test.describe('dashboard bulk actions', () => {
  test('submit: one confirmation with the total, what is skipped and why, then the result', async ({ browser }) => {
    const anna = await person(browser, 'Anna')
    const bjarni = await createUser('Bjarni', true)
    const one = await project(anna.id, 'Eitt')
    const two = await project(anna.id, 'Tvö')
    const busy = await project(anna.id, 'Upptekið')
    const partial = await project(anna.id, 'Ófullbúið', { fill: false })
    await editing(busy, bjarni)

    const { page } = anna
    await listView(page)
    await selectAll(page)
    await expect(page.locator('[data-selected-count]')).toHaveText('4 selected')
    await page.getByRole('button', { name: 'Submit', exact: true }).click()

    const d = page.getByRole('dialog', { name: 'Submit the selected entries' })
    await expect(d.locator('[data-bulk-item]')).toHaveCount(2)
    await expect(d.locator('[data-bulk-total]')).toHaveText('37,800 kr.')
    const skipped = d.locator('[data-bulk-skipped] li')
    await expect(skipped).toHaveCount(2)
    await expect(d.locator('[data-bulk-skip="locked"]')).toContainText('Bjarni is editing it')
    await expect(d.locator('[data-bulk-skip="locked"]')).toContainText('Upptekið')
    await expect(d.locator('[data-bulk-skip="project_incomplete"]')).toContainText(
      'the project still has something missing',
    )
    await expect(d.locator('[data-bulk-skip="project_incomplete"] a')).toHaveAttribute(
      'href',
      new RegExp(`/en/my-pages/projects/${partial}#section-review$`),
    )
    expect((await new AxeBuilder({ page }).include('dialog').analyze()).violations).toEqual([])

    await d.locator('[data-bulk-confirm]').click()
    const result = d.locator('[data-bulk-result]')
    await expect(result).toBeVisible()
    await expect(result).toHaveAttribute('role', 'status')
    await expect(result).toContainText('2 entries submitted')
    await expect(result).toContainText('Total locked price: 37,800 kr.')
    await expect(result).toContainText('2 receipt emails sent.')
    await expect(result).toContainText('Skipped (2)')
    await expect(result).toBeFocused()

    expect(await statusOf(one)).toBe('submitted')
    expect(await statusOf(two)).toBe('submitted')
    expect(await statusOf(busy)).toBe('draft') // never forced
    expect(await statusOf(partial)).toBe('draft')

    await d.getByRole('button', { name: 'Close' }).click()
    await expect(d).toHaveCount(0)
    // The dashboard reflects the new states, and the selection starts clean.
    await expect(page.locator('[data-selected-count]')).toHaveText('')
    await expect(page.locator(`[data-project="${one}"] [data-entry]`)).toHaveAttribute('data-status', 'submitted')
    await expect(page.locator(`[data-project="${busy}"] [data-entry]`)).toHaveAttribute('data-status', 'draft')
    await anna.context.close()
  })

  test('withdraw: only projects the person created; the rest are listed as skipped', async ({ browser }) => {
    const anna = await person(browser, 'Anna')
    const bjarni = await createUser('Bjarni', true)
    const mine = await project(anna.id, 'Mitt', { submitted: true })
    const theirs = await project(bjarni, 'Þeirra', { submitted: true })
    await db().insert(schema.projectPerson).values({
      projectId: theirs, kind: 'collaborator', name: 'Anna', canEdit: true, userId: anna.id, acceptedAt: new Date(),
    })

    const { page } = anna
    await listView(page)
    // A creator gets a per-row withdraw; an editor does not.
    await expect(page.locator(`[data-project="${mine}"] [data-withdraw-row]`)).toBeVisible()
    await expect(page.locator(`[data-project="${theirs}"] [data-withdraw-row]`)).toHaveCount(0)

    await selectAll(page)
    await page.getByRole('button', { name: 'Withdraw', exact: true }).click()
    const d = page.getByRole('dialog', { name: 'Withdraw the selected entries' })
    await expect(d.locator('[data-bulk-item]')).toHaveCount(1)
    await expect(d.locator('[data-bulk-cost]')).toHaveText(
      'Early-bird price. If you submit it again after 4 January 2027 it will cost 26,900 kr.',
    )
    await expect(d.locator('[data-bulk-skip="not_creator"]')).toContainText('Þeirra')
    await expect(d.locator('[data-bulk-skip="not_creator"]')).toContainText(
      'only the person who created the project can withdraw its entries',
    )
    await d.locator('[data-bulk-confirm]').click()
    await expect(d.locator('[data-bulk-result]')).toContainText('1 entry withdrawn')
    await expect(d.locator('[data-bulk-result]')).toContainText('Skipped (1)')
    expect(await statusOf(mine)).toBe('withdrawn')
    expect(await statusOf(theirs)).toBe('submitted')
    await d.getByRole('button', { name: 'Close' }).click()
    await expect(page.locator(`[data-project="${mine}"] [data-entry]`)).toHaveAttribute('data-status', 'withdrawn')
    await anna.context.close()
  })

  test('withdraw one entry from its row, then submit it again in bulk at the new price', async ({ browser }) => {
    const anna = await person(browser, 'Anna')
    const projectId = await project(anna.id, 'Eitt', { submitted: true })
    const { page } = anna
    await listView(page)
    await page.locator(`[data-withdraw-row]`).click()
    const d = page.getByRole('dialog', { name: 'Withdraw the selected entries' })
    await d.locator('[data-bulk-confirm]').click()
    await expect(d.locator('[data-bulk-result]')).toContainText('1 entry withdrawn')
    await d.getByRole('button', { name: 'Close' }).click()
    await expect.poll(() => statusOf(projectId)).toBe('withdrawn')

    await actAs(anna.context, baseURL(), anna.id, AFTER_EARLY)
    await listView(page)
    await selectAll(page)
    await page.getByRole('button', { name: 'Submit', exact: true }).click()
    const s = page.getByRole('dialog', { name: 'Submit the selected entries' })
    await expect(s.locator('[data-bulk-item]')).toContainText('submitted again')
    await expect(s.locator('[data-bulk-total]')).toHaveText('26,900 kr.')
    await s.locator('[data-bulk-confirm]').click()
    await expect(s.locator('[data-bulk-result]')).toContainText('1 entry submitted')
    expect(await statusOf(projectId)).toBe('submitted')
    await anna.context.close()
  })

  test('billing profile: changes the selected projects and skips one being edited', async ({ browser }) => {
    const anna = await person(browser, 'Anna')
    const bjarni = await createUser('Bjarni', true)
    const a = await project(anna.id, 'Eitt')
    const b = await project(anna.id, 'Tvö')
    const busy = await project(anna.id, 'Upptekið')
    await editing(busy, bjarni)
    const newProfile = await profile(anna.id, 'Nýtt fyrirtæki ehf.')

    const { page } = anna
    await listView(page)
    await selectAll(page)
    await page.getByRole('button', { name: 'Change billing profile' }).click()
    const d = page.getByRole('dialog', { name: 'Change billing profile' })
    await expect(d.locator('[data-bulk-confirm]')).toHaveAttribute('aria-disabled', 'true')
    await d.getByLabel('Invoice to').selectOption(newProfile)
    await expect(d.locator('[data-bulk-item]')).toHaveCount(2)
    await expect(d.locator('[data-bulk-skip="locked"]')).toContainText('Bjarni is editing it')
    await d.locator('[data-bulk-confirm]').click()
    await expect(d.locator('[data-bulk-result]')).toContainText('2 projects changed')
    await expect(d.locator('[data-bulk-result]')).toContainText('Skipped (1)')
    const { rows } = await awardsPool().query(
      `select id, billing_profile_id from project where id = any($1::uuid[])`,
      [[a, b, busy]],
    )
    const by = new Map(rows.map((r: { id: string; billing_profile_id: string }) => [r.id, r.billing_profile_id]))
    expect(by.get(a)).toBe(newProfile)
    expect(by.get(b)).toBe(newProfile)
    expect(by.get(busy)).not.toBe(newProfile)
    await anna.context.close()
  })

  test('"select all shown" works on a phone', async ({ browser }) => {
    const anna = await person(browser, 'Anna')
    await project(anna.id, 'Fyrsta', { submitted: true })
    await project(anna.id, 'Önnur', { submitted: true })
    await anna.context.close()
    const context = await browser.newContext({ baseURL: baseURL(), viewport: { width: 390, height: 800 } })
    await actAs(context, baseURL(), anna.id, EARLY)
    const page = await context.newPage()
    await listView(page)
    const box = page.getByRole('checkbox', { name: 'Select all shown' })
    await expect(box).toBeVisible()
    const rect = await box.boundingBox()
    expect(rect!.x).toBeGreaterThanOrEqual(0)
    expect(rect!.x + rect!.width).toBeLessThanOrEqual(390)
    await box.check()
    await expect(page.locator('[data-selected-count]')).toHaveText('2 selected')
    await box.uncheck()
    await expect(page.locator('[data-selected-count]')).toHaveText('')
    await context.close()
  })

  test('the dialogs fit a phone: nothing runs past the edge', async ({ browser }) => {
    const anna = await person(browser, 'Anna')
    await project(anna.id, 'Mjög langt heiti á verkefni sem þarf að brjótast á milli lína', { submitted: true })
    await anna.context.close()
    const context = await browser.newContext({ baseURL: baseURL(), viewport: { width: 390, height: 800 } })
    await actAs(context, baseURL(), anna.id, EARLY)
    const page = await context.newPage()
    await listView(page)
    // Pick the row's own checkbox.
    await page.getByRole('checkbox', { name: /^Select (?!all)/ }).first().check()
    await page.getByRole('button', { name: 'Withdraw', exact: true }).click()
    const d = page.getByRole('dialog', { name: 'Withdraw the selected entries' })
    await expect(d.locator('[data-bulk-item]')).toHaveCount(1)
    const overflow = await d.evaluate((el) => {
      const w = window.innerWidth
      return [...el.querySelectorAll('h2, h3, p, li, span, a, button, select')]
        .map((n) => n.getBoundingClientRect())
        .filter((r) => r.width > 0 && (r.right > w + 1 || r.left < -1)).length
    })
    expect(overflow).toBe(0)
    await context.close()
  })
})
