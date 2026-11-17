import { expect, test } from '@playwright/test'
import { LOCALES, PAGES, urlFor } from './pages'

/**
 * Content assertions for the four rebuilt "about" pages (#132): the route-level sweeps check a
 * page loads and is accessible; these check that what the redesign put on it is there and works.
 */
const h1Of = (name: string, locale: (typeof LOCALES)[number]) =>
  PAGES.find((p) => p.name === name)!.h1[locale]

for (const locale of LOCALES) {
  test.describe(`about pages (${locale})`, () => {
    test('about: heading, press list and brand kit sections', async ({ page }) => {
      await page.goto(urlFor(locale, '/um-svef'))
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        h1Of('about', locale),
      )
      await expect(page.locator('#h-press')).toBeVisible()
      await expect(page.locator('#h-brand')).toBeVisible()
      // Ten logo versions and a download for the primary mark.
      await expect(
        page.getByRole('list', { name: /Útgáfur merkisins|Logo versions/ }).locator('li'),
      ).toHaveCount(10)
      const download = page.locator('a[download][href="/brand/logo-02.svg"]')
      await expect(download).toBeVisible()
      expect((await page.request.get('/brand/logo-02.svg')).ok()).toBe(true)
    })

    test('about: the stats row and a press date come from the CMS', async ({ page }) => {
      await page.goto(urlFor(locale, '/um-svef'))
      const stats = page.locator('main ul', { has: page.locator('b:text-is("2005")') })
      await expect(stats.locator('li')).toHaveCount(3)
      await expect(stats.locator('li b')).toHaveText(['2005', '300', '6'])
      await expect(stats.locator('li span')).toHaveText(
        locale === 'is' ? ['Stofnað', 'Félagar', 'Í stjórn'] : ['Founded', 'Members', 'On the board'],
      )
      // Month and year under the outlet, in the page's language.
      const date = page.locator('section[aria-labelledby="h-press"] ol time').first()
      await expect(date).toHaveText(locale === 'is' ? 'Mars 2025' : 'March 2025')
      await expect(date).toHaveAttribute('datetime', /^2025-03-01/)
    })

    test('brand kit: a swatch copies its hex code, by keyboard, and says so', async ({
      page,
      context,
    }) => {
      await context.grantPermissions(['clipboard-read', 'clipboard-write'])
      await page.goto(urlFor(locale, '/um-svef'))
      const swatch = page.locator('button[data-hex="#8917E1"]')
      await swatch.scrollIntoViewIfNeeded()
      await swatch.focus()
      await page.keyboard.press('Enter')
      await expect(page.getByTestId('copy-status')).toContainText('#8917E1')
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('#8917E1')
      // And it clears again.
      await expect(page.getByTestId('copy-status')).toHaveText('', { timeout: 4000 })
    })

    test('board: every member is listed with a name', async ({ page }) => {
      await page.goto(urlFor(locale, '/stjorn'))
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        h1Of('board', locale),
      )
      const members = page.locator('main figure')
      expect(await members.count()).toBeGreaterThan(0)
      for (const caption of await members.locator('figcaption').allInnerTexts()) {
        expect(caption.trim().length).toBeGreaterThan(0)
      }
    })

    test('bylaws: the articles are listed under a title, with the note after', async ({
      page,
    }) => {
      await page.goto(urlFor(locale, '/log-svef'))
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        h1Of('bylaws', locale),
      )
      expect(await page.locator('main section h3').count()).toBeGreaterThan(5)
      await expect(page.locator('#bylaws-process')).toBeVisible()
    })

    test('faq: questions toggle by keyboard with the right aria', async ({ page }) => {
      await page.goto(urlFor(locale, '/spurt-og-svarad'))
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        h1Of('faq', locale),
      )
      const first = page.locator('main button[aria-expanded]').first()
      const panelId = await first.getAttribute('aria-controls')
      const panel = page.locator(`[id="${panelId}"]`)
      await expect(first).toHaveAttribute('aria-expanded', 'false')
      await expect(panel).toBeHidden()

      await first.focus()
      await page.keyboard.press('Enter')
      await expect(first).toHaveAttribute('aria-expanded', 'true')
      await expect(panel).toBeVisible()
      await expect(panel).toHaveAttribute('role', 'region')

      await page.keyboard.press('Space')
      await expect(first).toHaveAttribute('aria-expanded', 'false')
      await expect(panel).toBeHidden()
    })
  })
}
