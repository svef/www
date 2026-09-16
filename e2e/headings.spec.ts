import { expect, test } from '@playwright/test'
import { everyPage } from './pages'

/**
 * Heading outline: exactly one `<h1>` per page, and no skipped levels.
 *
 * #44 fixed this across the site (the bylaws markdown used to inject a second
 * `<h1>` and an h2 → h1 → h3 jump). axe's `heading-order` rule catches the skip
 * but not the duplicate `<h1>`, and it reports against a live page rather than
 * the whole outline, so this asserts the outline directly.
 */
test.describe('heading outline', () => {
  for (const { locale, page: spec, url } of everyPage()) {
    test(`${locale} ${spec.name} (${url}) has a sound outline`, async ({ page }) => {
      await page.goto(url)
      await expect(page.locator('h1')).toHaveCount(1)

      const levels = await page.evaluate(() =>
        Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map((node) => ({
          level: Number(node.tagName.slice(1)),
          text: (node.textContent ?? '').trim().slice(0, 60),
        })),
      )

      expect(levels.length, `no headings at all on ${url}`).toBeGreaterThan(0)
      expect(levels[0].level, `first heading on ${url} is not an h1`).toBe(1)

      const skips = levels
        .map((heading, i) => ({ heading, previous: levels[i - 1] }))
        .filter(({ heading, previous }) => previous && heading.level > previous.level + 1)
        .map(
          ({ heading, previous }) =>
            `h${previous.level} "${previous.text}" → h${heading.level} "${heading.text}"`,
        )

      expect(skips, `skipped heading levels on ${url}`).toEqual([])
    })
  }
})
