import { expect, test } from '@playwright/test'
import { settle } from './pages'
import { clickVisibleLink } from './click-visible-link'

/**
 * Back restores the scroll position (#145).
 *
 * The browser restores it on a history traversal, and the App Router leaves that alone.
 * What these pin is that nothing on the site gets in the way: scroll a page down, follow
 * a link that is on screen, go Back, and the page is where it was and stays there.
 *
 * The link is clicked with the mouse, where it is. A Playwright `locator.click()` first
 * scrolls the target into view, and the header is not sticky, so clicking a header link
 * from y=700 first scrolls to y=0: the page is then saved at the top, and Back "does not
 * restore" — which is how #145 was first reported. That was the test, not the site.
 */

const CASES = [
  { path: '/is/frettir', target: 700 },
  { path: '/is/vidburdir', target: 700 },
  { path: '/en/events', target: 700 },
]

for (const reducedMotion of ['reduce', 'no-preference'] as const) {
  test.describe(`Back restores scroll (motion: ${reducedMotion})`, () => {
    test.beforeEach(({ page }) => page.emulateMedia({ reducedMotion }))

    for (const { path, target } of CASES) {
      test(path, async ({ page }) => {
        await page.goto(path)
        await settle(page)
        await page.evaluate((y) => window.scrollTo(0, y), target)
        await expect.poll(() => page.evaluate(() => Math.round(scrollY))).toBe(target)

        await clickVisibleLink(page)
        await expect(page.locator('main h1').first()).toBeVisible()
        await page.waitForTimeout(500)
        await page.goBack()
        await page.waitForURL((u) => u.pathname === new URL(path, u).pathname)

        // Restored, and not undone a moment later by layout settling.
        await expect
          .poll(() => page.evaluate(() => Math.round(scrollY)))
          .toBeGreaterThan(target - 5)
        await page.waitForTimeout(1500)
        expect(Math.abs((await page.evaluate(() => scrollY)) - target)).toBeLessThan(5)
      })
    }
  })
}
