import { expect, test, type Page } from '@playwright/test'
import { settle } from './pages'
import { clickVisibleLink } from './click-visible-link'

/**
 * Back restores the scroll position, and following a link starts at the top (#145).
 *
 * The browser restores the position on a history traversal (`history.scrollRestoration`
 * stays `auto`), and the App Router leaves that alone, optimistic routing included (#115).
 * What these pin is that nothing on the site gets in the way: no scroll-to-top on route
 * change, no smooth-scroll CSS, no transition or late layout shift that moves the page after
 * the restore. Scroll a list down, open an item that is on screen, go Back, and the list is
 * where it was and stays there; open an item, and it starts at the top.
 *
 * The link is clicked with the mouse, where it is. A Playwright `locator.click()` first
 * scrolls the target into view, and the header is not sticky, so clicking a header link
 * from y=700 first scrolls to y=0: the page is then saved at the top, and Back "does not
 * restore" — which is how #145 was first reported. That was the test, not the site.
 */

const TOLERANCE = 5
const scrollY = (page: Page) => page.evaluate(() => Math.round(window.scrollY))

const LISTS = [
  { path: '/is/frettir', item: '/is/frettir/' },
  { path: '/en/news', item: '/en/news/' },
  { path: '/is/vidburdir', item: '/is/vidburdir/' },
  { path: '/en/events', item: '/en/events/' },
]

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'phone', width: 375, height: 740 },
]

/**
 * A scroll position well down the page that puts an item link mid-screen: the last item
 * that starts more than a screen down and can still be centred. The lists differ in length
 * and layout per page and width, so a fixed offset would sometimes land between cards.
 */
function scrollTargetFor(page: Page, item: string) {
  return page.evaluate((item) => {
    const max = document.documentElement.scrollHeight - innerHeight
    let best = 0
    for (const a of document.querySelectorAll<HTMLAnchorElement>(
      `main a[href^="${item}"]`,
    )) {
      const r = a.getBoundingClientRect()
      if (r.height > innerHeight - 200) continue
      const y = Math.round(r.top + window.scrollY + r.height / 2 - innerHeight / 2)
      if (y > innerHeight / 2 && y <= max) best = y
    }
    return best
  }, item)
}

for (const reducedMotion of ['reduce', 'no-preference'] as const) {
  for (const viewport of VIEWPORTS) {
    test.describe(`Back restores scroll (${viewport.name}, motion: ${reducedMotion})`, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height } })
      test.beforeEach(({ page }) => page.emulateMedia({ reducedMotion }))

      for (const { path, item } of LISTS) {
        test(path, async ({ page }) => {
          await page.goto(path)
          await settle(page)
          const target = await scrollTargetFor(page, item)
          expect(target, 'the list is long enough to scroll to an item').toBeGreaterThan(
            300,
          )
          await page.evaluate((y) => window.scrollTo(0, y), target)
          await expect.poll(() => scrollY(page)).toBe(target)

          // Forward: the item opens at the top, not at the list's offset.
          const opened = await clickVisibleLink(page, `main a[href^="${item}"]`)
          expect(opened.startsWith(item)).toBe(true)
          await expect(page.locator('main h1').first()).toBeVisible()
          expect(await scrollY(page)).toBe(0)
          await page.waitForTimeout(500)
          expect(await scrollY(page)).toBe(0)

          // Back: the list is where it was, and not undone a moment later by layout settling.
          await page.goBack()
          await page.waitForURL((u) => u.pathname === path)
          await expect.poll(() => scrollY(page)).toBeGreaterThan(target - TOLERANCE)
          await page.waitForTimeout(1500)
          expect(Math.abs((await scrollY(page)) - target)).toBeLessThan(TOLERANCE)
        })
      }
    })
  }
}
