import { existsSync } from 'node:fs'
import AxeBuilder from '@axe-core/playwright'
import { eq } from 'drizzle-orm'
import { expect, test, type Browser, type Page } from '@playwright/test'
import * as schema from '../src/lib/awards/db/schema'
import {
  createEntry,
  createProject,
  createUser,
  openFixtureDb,
  retireProjects,
  seededEdition,
} from '../src/lib/awards/staff/test-fixtures'
import { actAs } from './awards-session'
import { settle, urlFor } from './pages'

/**
 * The portal's shell (Mínar síður and Stjórnborð): the sidebar's navigation and where it
 * marks you, the avatar menu, the skip link, and on a phone the top bar whose menu button
 * opens the navigation as a modal drawer. Users act through the test-session cookie.
 */
if (existsSync('.env.local')) process.loadEnvFile('.env.local')

let fixtures: ReturnType<typeof openFixtureDb> | undefined
const db = () => (fixtures ??= openFixtureDb()).db
const made: string[] = []
const baseURL = () => test.info().project.use.baseURL as string
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
const DESKTOP = { width: 1440, height: 900 }
const PHONE = { width: 375, height: 740 }

test.afterAll(async () => {
  await retireProjects(db(), made.splice(0))
  await fixtures?.close()
  fixtures = undefined
})

async function person(browser: Browser, name: string, opts: { admin?: boolean; viewport?: { width: number; height: number } } = {}) {
  const context = await browser.newContext({ baseURL: baseURL(), viewport: opts.viewport ?? DESKTOP })
  const id = await createUser(db(), 'shell')
  await db().update(schema.user).set({ name }).where(eqUser(id))
  if (opts.admin) await db().insert(schema.userRole).values({ userId: id, role: 'admin' })
  await actAs(context, baseURL(), id)
  return { context, id, page: await context.newPage() }
}

const eqUser = (id: string) => eq(schema.user.id, id)

const nav = (page: Page) => page.getByRole('navigation', { name: /^(Mínar síður|My pages)$/ })
const axeClean = async (page: Page) => {
  const results = await new AxeBuilder({ page }).withTags(WCAG).analyze()
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' ')}`)).toEqual([])
}

test('signed out, the portal and the admin send the reader to sign in and back', async ({ page }) => {
  await page.goto(urlFor('is', '/minar-sidur'))
  await expect(page).toHaveURL(/\/is\/innskraning\?next=%2Fis%2Fminar-sidur$/)
  await page.goto(urlFor('en', '/stjornbord/notendur'))
  await expect(page).toHaveURL(/\/en\/sign-in\?next=%2Fen%2Fadmin%2Fusers$/)
})

test.describe('desktop', () => {
  test('the sidebar navigates and marks where you are; an entrant sees no admin', async ({ browser }) => {
    const { context, id, page } = await person(browser, 'Anna Sigríður Jónsdóttir')
    const ed = await seededEdition(db())
    const projectId = await createProject(db(), { editionId: ed.editionId, userId: id, title: 'Skelin' })
    made.push(projectId)
    await createEntry(db(), { projectId, categoryId: ed.categories[0].id, status: 'draft' })

    await page.goto(urlFor('is', '/minar-sidur'))
    await settle(page)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Yfirlit')
    // The shell replaces the site's header and footer.
    await expect(page.locator('footer')).toHaveCount(0)
    const n = nav(page)
    await expect(n).toBeVisible()
    await expect(n.getByRole('link')).toHaveText(['Yfirlit', 'Verkefnin mín', 'Nýtt verkefni'])
    await expect(n.getByRole('link', { name: 'Yfirlit' })).toHaveAttribute('aria-current', 'page')
    await expect(page.getByText('Stjórnborð', { exact: true })).toHaveCount(0)

    // The overview lists the draft as needing attention.
    await expect(page.getByTestId('overview-attention').getByRole('link', { name: 'Skelin' })).toBeVisible()

    await n.getByRole('link', { name: 'Verkefnin mín' }).click()
    await expect(page).toHaveURL(/\/is\/minar-sidur\/verkefni$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Verkefnin mín')
    await expect(n.getByRole('link', { name: 'Verkefnin mín' })).toHaveAttribute('aria-current', 'page')
    await expect(n.getByRole('link', { name: 'Yfirlit' })).not.toHaveAttribute('aria-current')

    // A project's own page is in the "my projects" section.
    await page.goto(urlFor('is', `/minar-sidur/verkefni/${projectId}`))
    await expect(n.getByRole('link', { name: 'Verkefnin mín' })).toHaveAttribute('aria-current', 'true')

    // An entrant gets a 404 from the admin.
    expect((await page.goto(urlFor('is', '/stjornbord')))?.status()).toBe(404)
    await context.close()
  })

  test('the skip link lands on the page, past the sidebar', async ({ browser }) => {
    const { context, page } = await person(browser, 'Skip')
    await page.goto(urlFor('en', '/minar-sidur'))
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Skip to content' })
    await expect(skip).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('main#main')).toBeFocused()
    await context.close()
  })

  test('the avatar menu opens with the keyboard, leads to the account and closes with Escape', async ({ browser }) => {
    const { context, page } = await person(browser, 'Bjarni Benedikt')
    await page.goto(urlFor('is', '/minar-sidur'))
    await settle(page)
    const button = page.locator('[data-user-menu]')
    await expect(button).toContainText('BB')
    await expect(button).toContainText('Bjarni Benedikt')
    await expect(button).toHaveAttribute('aria-expanded', 'false')

    await button.focus()
    await page.keyboard.press('Enter')
    await expect(button).toHaveAttribute('aria-expanded', 'true')
    const account = page.getByRole('link', { name: 'Aðgangur' })
    await expect(account).toBeVisible()
    await page.keyboard.press('Tab')
    await expect(account).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Skrá út' })).toBeFocused()

    await page.keyboard.press('Escape')
    await expect(button).toHaveAttribute('aria-expanded', 'false')
    await expect(button).toBeFocused()
    await expect(account).toBeHidden()

    await page.keyboard.press('Enter')
    await account.click()
    await expect(page).toHaveURL(/\/is\/minar-sidur\/adgangur$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Aðgangur')
    await context.close()
  })

  test('an admin also sees the admin group, and the language link keeps the page', async ({ browser }) => {
    const { context, page } = await person(browser, 'Stjórnandi', { admin: true })
    await page.goto(urlFor('is', '/stjornbord/notendur'))
    await settle(page)
    const n = nav(page)
    await expect(n.getByRole('list', { name: 'Stjórnborð' }).getByRole('link')).toHaveText([
      'Staðan',
      'Verkefni',
      'Beiðnir',
      'Notendur',
      'Verkfæri',
    ])
    await expect(n.getByRole('link', { name: 'Notendur' })).toHaveAttribute('aria-current', 'page')
    await page.getByRole('link', { name: 'English' }).click()
    await expect(page).toHaveURL(/\/en\/admin\/users$/)
    await expect(nav(page).getByRole('link', { name: 'Users' })).toHaveAttribute('aria-current', 'page')
    await context.close()
  })

  test('the overview has no axe violations in either language, with the menu open too', async ({ browser }) => {
    const { context, page } = await person(browser, 'Axe', { admin: true })
    for (const path of [urlFor('is', '/minar-sidur'), urlFor('en', '/minar-sidur')]) {
      await page.goto(path)
      await settle(page)
      await axeClean(page)
    }
    await page.locator('[data-user-menu]').click()
    await axeClean(page)
    await context.close()
  })
})

test.describe('phone', () => {
  test('a top bar with a menu button opens the navigation as a modal drawer', async ({ browser }) => {
    const { context, page } = await person(browser, 'Sími', { viewport: PHONE })
    await page.goto(urlFor('is', '/minar-sidur'))
    await settle(page)
    const menu = page.getByRole('button', { name: 'Valmynd' })
    await expect(menu).toBeVisible()
    await expect(nav(page)).toBeHidden()
    await expect(menu).toHaveAttribute('aria-expanded', 'false')

    await menu.click()
    const drawer = page.getByRole('dialog', { name: 'Valmynd' })
    await expect(drawer).toBeVisible()
    await expect(menu).toHaveAttribute('aria-expanded', 'true')
    await expect(drawer.getByRole('navigation')).toBeVisible()
    // Focus is kept inside: tabbing round never reaches the page behind it.
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab')
      expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true)
    }
    await axeClean(page)

    // Escape closes it and puts focus back on the menu button.
    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden()
    await expect(menu).toBeFocused()

    // Following a link closes it.
    await menu.click()
    await page.getByRole('dialog').getByRole('link', { name: 'Verkefnin mín' }).click()
    await expect(page).toHaveURL(/\/is\/minar-sidur\/verkefni$/)
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(menu).toHaveAttribute('aria-expanded', 'false')

    // The close button works too.
    await menu.click()
    await page.getByRole('button', { name: 'Loka valmynd' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await context.close()
  })

  test('nothing scrolls sideways at 320px, on the portal or the admin', async ({ browser }) => {
    const { context, page } = await person(browser, 'Mjór', { admin: true, viewport: { width: 320, height: 640 } })
    for (const path of ['/minar-sidur', '/minar-sidur/verkefni', '/minar-sidur/adgangur', '/stjornbord', '/stjornbord/verkefni?status=all', '/stjornbord/notendur']) {
      await page.goto(urlFor('is', path))
      await settle(page)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow, path).toBeLessThanOrEqual(0)
    }
    await context.close()
  })
})
