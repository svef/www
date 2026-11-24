import { existsSync } from 'node:fs'
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Browser, type Page } from '@playwright/test'
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
import { settle, urlFor, type Locale } from './pages'

/**
 * "Mínar innsendingar" (svef/www#164): the entrant's dashboard.
 *
 * Users act through the test-session cookie; its clock cookie moves the server clock to the
 * dates the deadline line turns on (the real date is before the edition opens). Projects and
 * entries are inserted through the schema and retired (soft-deleted) afterwards. Each test
 * makes its own user, so rows other specs leave in the edition never show up here.
 */
if (existsSync('.env.local')) process.loadEnvFile('.env.local')

// One pool per worker, reopened if a worker runs another group of tests after `afterAll` closed it.
let fixtures: ReturnType<typeof openFixtureDb> | undefined
const db = () => (fixtures ??= openFixtureDb()).db
const made: string[] = []
const baseURL = () => test.info().project.use.baseURL as string

test.afterAll(async () => {
  await retireProjects(db(), made.splice(0))
  await fixtures?.close()
  fixtures = undefined
})

const at = (iso: string) => Date.parse(iso) - Date.now()
const EARLY = at('2026-12-25T12:00:00Z') // 11 days (rounded up from 10.5) before the early-bird bound (5 Jan 00:00)
const LAST_DAY = at('2027-01-04T10:00:00Z')
const AFTER_EARLY = at('2027-01-10T12:00:00Z')
const CLOSED = at('2027-02-03T00:00:00Z')

const DASH = (l: Locale) => urlFor(l, '/minar-sidur/verkefni')

async function signedIn(browser: Browser, label: string, clock = EARLY, viewport?: { width: number; height: number }) {
  const context = await browser.newContext({ baseURL: baseURL(), viewport })
  const id = await createUser(db(), label)
  await actAs(context, baseURL(), id, clock)
  return { context, id, page: await context.newPage() }
}

/** Anna: a draft + an early-bird submission, a project under request, and an eligible one. */
async function seedAnna(userId: string) {
  const ed = await seededEdition(db())
  const [c1, c2] = ed.categories
  const run = uniqueKennitala().slice(0, 6)
  const billing = await createBillingProfile(db(), userId, {
    kennitala: '4501012340',
    companyName: `Þórsmörk ${run} ehf.`,
  })
  const mk = async (title: string, billingProfileId?: string) => {
    const id = await createProject(db(), { editionId: ed.editionId, userId, title: `${title} ${run}`, billingProfileId })
    made.push(id)
    return id
  }
  const alpha = await mk('Alpha', billing)
  const alphaDraft = await createEntry(db(), { projectId: alpha, categoryId: c1.id, status: 'draft' })
  const alphaSub = await createEntry(db(), { projectId: alpha, categoryId: c2.id, status: 'submitted', priceAmount: 18900 })
  const beta = await mk('Beta', billing)
  const betaEntry = await createEntry(db(), { projectId: beta, categoryId: c1.id, status: 'needs_clarification', priceAmount: 6900, priceRegular: 9900 })
  await db().insert(schema.entryRequest).values({
    entryId: betaEntry,
    authorUserId: userId,
    message: 'Please add the login details',
    deadlineAt: new Date('2027-01-20T00:00:00Z'),
  })
  const gamma = await mk('Gamma', billing)
  await createEntry(db(), { projectId: gamma, categoryId: c1.id, status: 'eligible', priceAmount: 26900, priceRegular: 38900, discountPercent: 30 })
  const delta = await mk('Delta')
  await createEntry(db(), { projectId: delta, categoryId: c1.id, status: 'withdrawn' })
  return { run, ed, alpha, alphaDraft, alphaSub, beta, gamma, delta }
}

const money = (n: number) => `${new Intl.NumberFormat('en-GB').format(n)} kr.`

test('signed out, it sends the reader to sign-in and back', async ({ page }) => {
  await page.goto(DASH('en'))
  await expect(page).toHaveURL(
    new RegExp(`/en/sign-in\\?next=${encodeURIComponent('/en/my-pages/projects').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
  )
})

test('a new user sees an empty state with a way to start', async ({ browser }) => {
  const { context, page } = await signedIn(browser, 'Newcomer')
  await page.goto(DASH('en'))
  await settle(page)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('My projects')
  const empty = page.locator('[data-empty]')
  await expect(empty).toContainText('You have no submissions yet')
  await expect(empty.getByRole('link', { name: 'New project' })).toHaveAttribute('href', '/en/my-pages/projects/new')
  await expect(page.getByRole('group', { name: 'View' })).toHaveCount(0)
  await expect(page.locator('[data-invoices]')).toHaveCount(0)
  await context.close()
})

test('the Icelandic page uses the Icelandic names', async ({ browser }) => {
  const { context, page } = await signedIn(browser, 'Nýliði')
  await page.goto(DASH('is'))
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Verkefnin mín')
  await expect(page.locator('[data-deadline]')).toHaveText('11 dagar eftir til að tryggja snemmskráningarverðið')
  await expect(page.locator('[data-empty]').getByRole('link', { name: 'Nýtt verkefni' })).toHaveAttribute(
    'href',
    '/is/minar-sidur/verkefni/nytt',
  )
  await context.close()
})

test.describe('with projects', () => {
  test.describe.configure({ mode: 'serial' })

  test('needs-action first, one row per entry with status, price and what is missing or asked', async ({ browser }) => {
    const { context, id, page } = await signedIn(browser, 'Anna')
    const s = await seedAnna(id)
    await page.goto(DASH('en'))
    await settle(page)

    // Beta has an open request: it leads. Alpha has a draft within two weeks of the early-bird bound (at EARLY, ten and a half days).
    const order = await page.locator('[data-project]').evaluateAll((els) => els.map((e) => e.getAttribute('data-project')))
    expect(order.slice(0, 2)).toEqual([s.beta, s.alpha])
    await expect(page.locator(`[data-project="${s.beta}"]`)).toHaveAttribute('data-needs-action', '')

    const beta = page.locator(`[data-project="${s.beta}"]`)
    await expect(beta.locator('[data-status="needs_clarification"]').first()).toContainText('Needs clarification')
    await expect(beta.locator('[data-request]')).toContainText('SVEF has asked for changes by 20 January')
    await expect(beta.locator('[data-request]')).toContainText('Please add the login details')
    await expect(beta.locator('[data-price]')).toHaveText(money(6900))

    const alpha = page.locator(`[data-project="${s.alpha}"]`)
    const draft = alpha.locator(`[data-entry="${s.alphaDraft}"]`)
    await expect(draft).toContainText('Draft')
    await expect(draft).toContainText('Early-bird price if submitted now')
    // What is missing, in one line: the count and the first item, linking to the form's review step.
    await expect(draft.locator('[data-missing]')).toHaveText(/^Missing \((\d+)\): \S.* and \d+ more$/)
    await expect(draft.locator('[data-missing] a')).toHaveAttribute('href', `/en/my-pages/projects/${s.alpha}#section-review`)
    await expect(draft.locator('[data-early-bird="secured"]')).toHaveCount(0)
    const sub = alpha.locator(`[data-entry="${s.alphaSub}"]`)
    await expect(sub).toContainText('Submitted')
    await expect(sub.locator('[data-price]')).toHaveText(money(18900))
    await expect(sub.locator('[data-early-bird="secured"]')).toHaveText('Early bird secured')

    // Eligible, locked price with no early-bird marker lost; withdrawn shows its would-be price.
    await expect(page.locator(`[data-project="${s.gamma}"] [data-status="eligible"]`).first()).toContainText('Eligible')
    await expect(page.locator(`[data-project="${s.delta}"] [data-status="withdrawn"]`).first()).toContainText('Withdrawn')
    await expect(page.locator(`[data-project="${s.delta}"] [data-missing]`)).toHaveCount(0)

    // The title links to the form.
    await expect(alpha.getByRole('link', { name: new RegExp(`^Alpha ${s.run}$`) })).toHaveAttribute(
      'href',
      `/en/my-pages/projects/${s.alpha}`,
    )
    await context.close()
  })

  test('the invoice note sums the submitted, non-withdrawn entries per billing profile', async ({ browser }) => {
    const { context, id, page } = await signedIn(browser, 'Anna')
    const s = await seedAnna(id)
    await page.goto(DASH('en'))
    // 18,900 (submitted) + 6,900 (needs clarification) + 26,900 (eligible); the draft and the withdrawn entry are left out.
    await expect(page.locator('[data-invoice]')).toHaveText(
      `An invoice for 52,700 kr. will be sent to Þórsmörk ${s.run} ehf., kt. 450101-2340, after submissions close.`,
    )
    await context.close()
  })

  test('the deadline line follows the clock', async ({ browser }) => {
    const cases: [number, string, string][] = [
      [EARLY, 'early-bird', '11 days left to secure the early-bird price'],
      [LAST_DAY, 'early-bird', '1 day left to secure the early-bird price'],
      [AFTER_EARLY, 'closes', 'Submissions close 1 February'],
      [CLOSED, 'closed', 'Submissions are closed'],
    ]
    for (const [clock, kind, text] of cases) {
      const { context, page } = await signedIn(browser, 'Clock', clock)
      await page.goto(DASH('en'))
      const line = page.locator('[data-deadline]')
      await expect(line).toHaveText(text)
      await expect(line).toHaveAttribute('data-deadline', kind)
      await context.close()
    }
  })

  test('the early bird price on a draft turns regular once the early-bird date has passed', async ({ browser }) => {
    const { context, id, page } = await signedIn(browser, 'Late', AFTER_EARLY)
    const s = await seedAnna(id)
    await page.goto(DASH('en'))
    const draft = page.locator(`[data-entry="${s.alphaDraft}"]`)
    await expect(draft).toContainText('Price if submitted now')
    await expect(draft).not.toContainText('Early-bird price if submitted now')
    // The locked early-bird entry keeps its price and its marker.
    await expect(page.locator(`[data-entry="${s.alphaSub}"] [data-price]`)).toHaveText(money(18900))
    await expect(page.locator(`[data-entry="${s.alphaSub}"] [data-early-bird="secured"]`)).toBeVisible()
    await context.close()
  })

  test('one list: searchable, filterable, selectable by keyboard (no view toggle)', async ({ browser }) => {
    const { context, id, page } = await signedIn(browser, 'Anna')
    const s = await seedAnna(id)
    await page.goto(DASH('en'))
    await settle(page)

    const rows = page.getByRole('list', { name: 'Your entries' }).locator('[data-entry]')
    await expect(page.getByRole('group', { name: 'View' })).toHaveCount(0)
    await expect(rows).toHaveCount(5) // alpha x2, beta, gamma, delta

    // Search by project title.
    await page.getByRole('searchbox', { name: 'Search projects' }).fill(`beta ${s.run}`)
    await expect(rows).toHaveCount(1)
    await expect(page.locator('[data-results]')).toHaveText('Showing 1 of 5 entries')
    await page.getByRole('searchbox', { name: 'Search projects' }).fill('zzz-nothing')
    await expect(page.getByText('No entries match these filters.')).toBeVisible()
    await page.getByRole('button', { name: 'Clear filters' }).click()
    await expect(rows).toHaveCount(5)

    // Filter by status, then by category (names come from the seeded catalogue).
    await page.getByLabel('Status').selectOption('draft')
    await expect(rows).toHaveCount(1)
    await expect(page.locator(`[data-entry="${s.alphaDraft}"]`)).toBeVisible()
    await page.getByLabel('Status').selectOption('')
    const category = page.getByLabel('Category')
    const firstOption = await category.locator('option').nth(1).getAttribute('value')
    await category.selectOption(firstOption!)
    const filtered = await rows.count()
    expect(filtered).toBeGreaterThan(0)
    expect(filtered).toBeLessThan(5)

    // Selection: checkboxes by keyboard; the bulk bar counts them and sticks to the bottom.
    await page.getByRole('button', { name: 'Clear filters' }).click()
    const bar = page.locator('[data-slot="bulk-actions"]')
    await expect(bar.getByRole('button')).toHaveCount(0)
    const first = page.getByRole('checkbox', { name: /^Select (?!all)/ }).first()
    await first.focus()
    await page.keyboard.press('Space')
    await expect(first).toBeChecked()
    await expect(page.locator('[data-selected-count]')).toHaveText('1 selected')
    await expect(bar.getByRole('button', { name: 'Submit', exact: true })).toBeVisible()
    expect(await bar.evaluate((el) => getComputedStyle(el).position)).toBe('sticky')
    await page.getByRole('checkbox', { name: 'Select all shown' }).check()
    await expect(page.locator('[data-selected-count]')).toHaveText('5 selected')
    await context.close()
  })

  test('an editor sees a shared project; a project in an edit session shows who is editing', async ({ browser }) => {
    const owner = await signedIn(browser, 'Owner')
    const s = await seedAnna(owner.id)
    const { context, id, page } = await signedIn(browser, 'Helper')
    await db().insert(schema.projectPerson).values({
      projectId: s.alpha,
      kind: 'collaborator',
      name: 'Helper',
      canEdit: true,
      userId: id,
      acceptedAt: new Date(),
    })
    // The server clock is shifted by EARLY for this user, so the lock's activity is stamped on that clock.
    await db()
      .insert(schema.projectEditLock)
      .values({ projectId: s.alpha, holderUserId: owner.id, lastActivityAt: new Date(Date.now() + EARLY) })
    await page.goto(DASH('en'))
    const alpha = page.locator(`[data-project="${s.alpha}"]`)
    await expect(alpha).toContainText('You can edit')
    await expect(alpha.locator('[data-lock]')).toContainText('Owner is editing (since ')
    // The owner's billing profile is not the helper's: no invoice note.
    await expect(page.locator('[data-invoices]')).toHaveCount(0)
    // Their other projects are not visible to them.
    await expect(page.locator('[data-project]')).toHaveCount(1)
    await context.close()
    await owner.context.close()
  })
})

async function noOverflow(page: Page, width: number) {
  const bad = await page.evaluate((w) => {
    const out: string[] = []
    for (const el of document.querySelectorAll<HTMLElement>('main h1, main h2, main a, main button, main p, main li, main label, main td, main th, main select, main input')) {
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) continue
      if (r.right > w + 1 || r.left < -1) out.push(`${el.tagName} "${el.textContent?.slice(0, 40)}" ${Math.round(r.left)}..${Math.round(r.right)}`)
    }
    return out
  }, width)
  expect(bad).toEqual([])
}

for (const [label, width, height] of [
  ['desktop', 1440, 900],
  ['mobile', 390, 844],
] as const) {
  test(`accessible and inside the viewport at ${width}px (with and without a selection)`, async ({ browser }) => {
    const { context, id, page } = await signedIn(browser, 'Axe', EARLY, { width, height })
    await seedAnna(id)
    await page.goto(DASH('en'))
    await settle(page)
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
    await noOverflow(page, width)
    await page.getByRole('checkbox', { name: 'Select all shown' }).check()
    await expect(page.locator('[data-slot="bulk-actions"]').getByRole('button').first()).toBeVisible()
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
    await noOverflow(page, width)
    void label
    await context.close()
  })
}
