import { expect, test, type Page } from '@playwright/test'
import { getDictionary } from '@/lib/i18n'
import { LOCALES, PAGES, settle, urlFor } from './pages'

/**
 * The header at phone width.
 *
 * The rest of the suite runs at the project's desktop viewport, where the nav
 * is a row and none of this exists: the toggle is `display: none`, the panel is
 * `display: contents`, and every assertion here would pass vacuously. So these
 * tests set their own width — which is also the only way to catch the thing
 * that prompted svef/www#26, a nav that wrapped into three rows of plain links
 * on the first screen anyone sees on a phone.
 *
 * Focus management is the part unit tests cover least well: jsdom has no
 * layout, so "the panel is hidden and therefore not tabbable" is something only
 * a real browser can tell you.
 */
test.use({ viewport: { width: 390, height: 844 } })

const toggle = (page: Page) => page.locator('header button[aria-controls="site-menu"]')
const panel = (page: Page) => page.locator('#site-menu')

test.describe('header at 390px', () => {
  for (const locale of LOCALES) {
    const t = getDictionary(locale)

    test(`${locale}: the nav is behind a labelled toggle`, async ({ page }) => {
      await page.goto(urlFor(locale, ''))
      await settle(page)

      await expect(page.getByRole('button', { name: t.nav.menu })).toBeVisible()
      await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false')
      await expect(panel(page)).toBeHidden()

      await toggle(page).click()
      await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true')
      await expect(panel(page)).toBeVisible()
      await expect(panel(page).getByRole('link', { name: t.nav.news })).toBeVisible()
    })

    test(`${locale}: opening moves focus into the menu and traps it`, async ({ page }) => {
      await page.goto(urlFor(locale, ''))
      await settle(page)
      await toggle(page).click()

      const inMenu = () =>
        page.evaluate(() => {
          const region = document.getElementById('site-menu')?.parentElement
          return Boolean(region && document.activeElement && region.contains(document.activeElement))
        })

      await expect.poll(inMenu, { message: 'focus never entered the menu' }).toBe(true)
      for (let i = 0; i < 9; i += 1) {
        await page.keyboard.press('Tab')
        expect(await inMenu(), `Tab ${i + 1} escaped the menu`).toBe(true)
      }
    })

    test(`${locale}: Esc closes the menu and gives focus back to the toggle`, async ({ page }) => {
      await page.goto(urlFor(locale, ''))
      await settle(page)
      await toggle(page).click()
      await expect(panel(page)).toBeVisible()

      await page.keyboard.press('Escape')
      await expect(panel(page)).toBeHidden()
      await expect(toggle(page)).toBeFocused()
    })

    test(`${locale}: following a link navigates and leaves the menu closed`, async ({ page }) => {
      await page.goto(urlFor(locale, ''))
      await settle(page)
      await toggle(page).click()
      await panel(page).getByRole('link', { name: t.nav.news }).click()

      await expect(page).toHaveURL(new RegExp(`${urlFor(locale, '/frettir')}$`))
      await expect(panel(page)).toBeHidden()
      await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false')
    })
  }

  // A menu that overflows sideways is the failure this replaced, so it is
  // checked on every page rather than on the home page alone.
  for (const { path, name } of PAGES) {
    test(`no page scrolls sideways with the menu open: ${name}`, async ({ page }) => {
      await page.goto(urlFor('is', path))
      await settle(page)
      await toggle(page).click()
      await expect(panel(page)).toBeVisible()

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow, 'the page scrolls horizontally at 390px').toBe(0)
    })
  }
})

test.describe('the current page is marked in the nav', () => {
  for (const locale of LOCALES) {
    // Home and the photo gallery are not nav items, so nothing is marked there.
    const marked = [
      { path: '/vidburdir', key: 'events' },
      { path: '/frettir', key: 'news' },
      { path: '/hafa-samband', key: 'contact' },
    ] as const

    for (const { path, key } of marked) {
      test(`${locale}: ${path} carries aria-current="page"`, async ({ page }) => {
        const t = getDictionary(locale)
        await page.goto(urlFor(locale, path))
        await settle(page)

        const current = page.locator('header [aria-current="page"]')
        await expect(current).toHaveCount(1)
        await expect(current).toHaveText(t.nav[key])
      })
    }

    test(`${locale}: nothing is marked on a page the nav does not list`, async ({ page }) => {
      await page.goto(urlFor(locale, '/myndir'))
      await settle(page)
      await expect(page.locator('header [aria-current]')).toHaveCount(0)
    })
  }
})
