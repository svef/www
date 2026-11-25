import { expect, type Page } from '@playwright/test'

/**
 * Mouse-clicks the first internal link matching `selector` that is fully on screen, without
 * scrolling, and waits for its page. Returns the path it went to.
 */
export async function clickVisibleLink(
  page: Page,
  selector = 'main a[href^="/"], footer a[href^="/"]',
) {
  const hit = await page.evaluate((selector) => {
    const here = location.pathname
    for (const a of document.querySelectorAll<HTMLAnchorElement>(selector)) {
      const r = a.getBoundingClientRect()
      if (
        r.top > 80 &&
        r.bottom < innerHeight - 20 &&
        r.width > 10 &&
        a.pathname !== here &&
        !a.hash
      ) {
        return { x: r.x + r.width / 2, y: r.y + r.height / 2, path: a.pathname }
      }
    }
    return null
  }, selector)
  expect(hit, 'a link in the viewport to follow').not.toBeNull()
  await page.mouse.click(hit!.x, hit!.y)
  await page.waitForFunction((p) => location.pathname === p, hit!.path)
  return hit!.path
}
