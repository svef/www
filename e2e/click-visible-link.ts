import { expect, type Page } from '@playwright/test'

/** Mouse-clicks the first internal link that is fully on screen, without scrolling. */
export async function clickVisibleLink(page: Page) {
  const hit = await page.evaluate(() => {
    const here = location.pathname
    for (const a of document.querySelectorAll<HTMLAnchorElement>(
      'main a[href^="/"], footer a[href^="/"]',
    )) {
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
  })
  expect(hit, 'a link in the viewport to follow').not.toBeNull()
  await page.mouse.click(hit!.x, hit!.y)
  await page.waitForFunction((p) => location.pathname === p, hit!.path)
  return hit!.path
}
