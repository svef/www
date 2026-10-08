import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { getDictionary } from '@/lib/i18n'
import { LOCALES, PAGES, settle, urlFor } from './pages'
import { triage } from './a11y/known-issues'

// The same rule sets the page sweep uses.
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

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

    /**
     * Going Back must not reopen the menu.
     *
     * The first version of this component derived `open` from a stored path
     * (`openedAt === pathname`), which is true again the moment you return to
     * that path. Open the menu, tap through to two pages, press Back, and the
     * menu was waiting for you: expanded, pushing the page down, the focus trap
     * re-armed and focus on the first item. Nothing in the unit tests could see
     * it — a mocked `usePathname` has no history — so the regression test has
     * to be here, with a real Back button.
     */
    test(`${locale}: Back does not reopen the menu`, async ({ page }) => {
      await page.goto(urlFor(locale, ''))
      await settle(page)

      await toggle(page).click()
      await panel(page).getByRole('link', { name: t.nav.news }).click()
      await expect(page).toHaveURL(new RegExp(`${urlFor(locale, '/frettir')}$`))

      await toggle(page).click()
      await panel(page).getByRole('link', { name: t.nav.events }).click()
      await expect(page).toHaveURL(new RegExp(`${urlFor(locale, '/vidburdir')}$`))

      await page.goBack()
      await expect(page).toHaveURL(new RegExp(`${urlFor(locale, '/frettir')}$`))
      await expect(panel(page)).toBeHidden()
      await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false')
      // Nothing inside the menu may hold focus on a page nobody opened it on.
      expect(
        await page.evaluate(() =>
          Boolean(document.getElementById('site-menu')?.contains(document.activeElement)),
        ),
      ).toBe(false)
    })

    // Tapping the item for the page you are already on does not change the
    // path, so the close cannot come from the navigation.
    test(`${locale}: the current page's own item closes the menu`, async ({ page }) => {
      await page.goto(urlFor(locale, '/frettir'))
      await settle(page)
      await toggle(page).click()
      await panel(page).getByRole('link', { name: t.nav.news }).click()

      await expect(panel(page)).toBeHidden()
      await expect(toggle(page)).toBeFocused()
    })

    /**
     * axe over the *open* menu.
     *
     * `playwright.config.ts` pins `devices['Desktop Chrome']` and the page
     * sweep sets no viewport of its own, so it only ever sees this header as a
     * plain row — the toggle is `display: none` and the panel is
     * `display: contents`. The biggest new surface in svef/www#26 would
     * otherwise never be swept in a real browser at all. Same reasoning as the
     * open-lightbox test in `a11y/axe.spec.ts`, which svef/www#59 added for
     * exactly this gap and which found a real violation when it landed.
     */
    test(`${locale}: the open menu has no axe violations at 390px`, async ({ page }) => {
      const url = urlFor(locale, '/um-svef')
      await page.goto(url)
      await settle(page)
      await toggle(page).click()
      await expect(panel(page)).toBeVisible()
      // Sweep the settled panel: axe reads computed colours, and mid-animation
      // they are whatever the compositor happened to blend.
      await expect
        .poll(() => panel(page).evaluate((node) => getComputedStyle(node).opacity), {
          message: 'the menu never finished its open animation',
        })
        .toBe('1')

      const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
      const { unexpected } = triage(results.violations, url)
      expect(unexpected.join('\n\n'), `axe violations in the open menu on ${url}`).toBe('')
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
