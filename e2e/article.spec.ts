import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { LOCALES, settle, urlFor } from './pages'
import { triage } from './a11y/known-issues'

/**
 * The news article route, `/frettir/[slug]` (#24).
 *
 * It has a dynamic segment, so it cannot live in the `PAGES` table that the
 * other sweeps iterate — but "not in the table" must not mean "not covered", so
 * this runs the same core checks against a real article.
 *
 * The slug is **resolved at runtime** from the news index rather than hard-coded
 * from the seed fixtures. Pinning a fixture slug here would make this spec a
 * chore to update every time `seed-data.ts` changes, and it would be testing the
 * fixtures rather than the route. Taking the first card's href also means the
 * thing under test is the link a reader would actually click.
 */
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

/** The href of the first article on the news index, in this locale. */
async function firstArticleUrl(page: Page, locale: (typeof LOCALES)[number]): Promise<string> {
  const index = urlFor(locale, '/frettir')
  await page.goto(index)
  await settle(page)

  const href = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLAnchorElement>('main#main a[href]'))
      .map((a) => a.getAttribute('href') ?? '')
      .find((h) => /^(\/en)?\/frettir\/[^/]+$/.test(h)),
  )

  expect(
    href,
    `the news index at ${index} linked to no article — is the database seeded?`,
  ).toBeTruthy()
  return href as string
}

test.describe('news article route', () => {
  for (const locale of LOCALES) {
    test(`${locale}: an article renders, is accessible and stays quiet`, async ({ page }) => {
      const errors: string[] = []
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text())
      })
      page.on('pageerror', (e) => errors.push(e.message))

      const url = await firstArticleUrl(page, locale)

      const response = await page.goto(url)
      expect(response?.status(), `status for ${url}`).toBe(200)
      // No redirect, and no internal `/is` prefix in the address bar.
      expect(new URL(page.url()).pathname).toBe(url)
      await settle(page)

      await expect(page.locator('html')).toHaveAttribute('lang', locale)

      const h1 = page.locator('h1')
      await expect(h1).toHaveCount(1)
      await expect(h1).not.toHaveText('')

      const main = page.locator('main#main')
      await expect(main).toBeVisible()
      await expect(
        main.locator('section, article'),
        `${url} rendered its <h1> but no content body`,
      ).not.toHaveCount(0)

      // Same outline rule as every other page: starts at h1, never skips a level.
      const levels = await page.evaluate(() =>
        Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map((n) =>
          Number(n.tagName.slice(1)),
        ),
      )
      expect(levels[0], `first heading on ${url} is not an h1`).toBe(1)
      const skips = levels.filter((level, i) => i > 0 && level > levels[i - 1] + 1)
      expect(skips, `skipped heading levels on ${url}`).toEqual([])

      expect(errors, `console errors on ${url}`).toEqual([])

      const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
      const { unexpected } = triage(results.violations, url)
      expect(unexpected.join('\n\n'), `axe violations on ${url}`).toBe('')
    })

    test(`${locale}: an unknown slug is a 404, not a crash`, async ({ page, request }) => {
      const url = urlFor(locale, '/frettir/there-is-no-article-with-this-slug')
      const response = await request.get(url, { maxRedirects: 0 })
      expect(response.status(), `status for ${url}`).toBe(404)

      // And it renders the site's 404 rather than an unstyled error.
      await page.goto(url)
      await expect(page.locator('h1')).toHaveCount(1)
    })
  }

  test('/is/frettir/<slug> redirects to the unprefixed path', async ({ page, request }) => {
    const url = await firstArticleUrl(page, 'is')

    const response = await request.get(`/is${url}`, { maxRedirects: 0 })
    expect(response.status(), `/is${url} should redirect`).toBeGreaterThanOrEqual(300)
    expect(response.status()).toBeLessThan(400)
    expect(new URL(response.headers()['location'], 'http://localhost').pathname).toBe(url)
  })
})
