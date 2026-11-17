import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import {
  collectPageErrors,
  describeProblem,
  dynamicHrefsInMain,
  LOCALES,
  settle,
  urlFor,
} from './pages'
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
async function firstArticleUrl(
  page: Page,
  locale: (typeof LOCALES)[number],
): Promise<string> {
  const index = urlFor(locale, '/frettir')
  await page.goto(index)
  await settle(page)

  const [href] = await dynamicHrefsInMain(page, '/frettir/[slug]')

  expect(
    href,
    `the news index at ${index} linked to no article — is the database seeded?`,
  ).toBeTruthy()
  return href as string
}

test.describe('news article route', () => {
  for (const locale of LOCALES) {
    test(`${locale}: an article renders, is accessible and stays quiet`, async ({
      page,
    }) => {
      // Resolve the slug first, then start listening: the collector would
      // otherwise also pick up whatever the news index logged on the way here,
      // and this test is about the article route.
      const url = await firstArticleUrl(page, locale)
      const errors = collectPageErrors(page)

      const response = await page.goto(url)
      expect(response?.status(), `status for ${url}`).toBe(200)
      // Served where it was linked: no redirect on the way.
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

      // The console must be clean, with nothing waved through. This route was
      // never subject to svef/www#60: measured, its toggle prefetch of
      // `/frettir/<slug>?_rsc=…` came back 200 where the index's
      // `/frettir?_rsc=…` came back 404. #60 is fixed now in any case
      // (`experimental.optimisticRouting` is off), so there is nothing left to
      // exempt and the assertion is the plain one.
      expect(errors.map(describeProblem), `console errors on ${url}`).toEqual([])

      const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
      const { unexpected } = triage(results.violations, url)
      expect(unexpected.join('\n\n'), `axe violations on ${url}`).toBe('')
    })

    test(`${locale}: the index is a page head over cards that link to articles`, async ({
      page,
    }) => {
      await page.goto(urlFor(locale, '/frettir'))
      await settle(page)

      await expect(page.locator('h1')).toHaveText(locale === 'is' ? 'Fréttir' : 'News')
      // The page opens with the violet band, and its title sits in a notch.
      await expect(page.locator('main header [data-notch="tl"] h1')).toHaveCount(1)

      const cards = page.locator('main a[href*="/frettir/"], main a[href*="/news/"]')
      expect(await cards.count(), 'no news cards on the index').toBeGreaterThan(0)
      const first = cards.first()
      await expect(first.locator('h2')).not.toHaveText('')
      await expect(first.locator('time[datetime]')).toHaveCount(1)
      const href = await first.getAttribute('href')
      await first.click()
      await expect(page).toHaveURL(new RegExp(`${href}$`))
      await expect(page.locator('h1')).toHaveCount(1)
    })

    test(`${locale}: an article has a crumb back, a dated head, a body and a share row`, async ({
      page,
    }) => {
      const url = await firstArticleUrl(page, locale)
      await page.goto(url)
      await settle(page)

      const head = page.locator('main article > header')
      await expect(head.locator('h1')).not.toHaveText('')
      await expect(head.locator('time[datetime]')).toHaveCount(1)
      await expect(
        head.locator('a[href$="' + (locale === 'is' ? '/frettir' : '/news') + '"]'),
      ).toHaveCount(1)

      // Body: the article's text (or its summary when it has no body) under the head.
      const body = page.locator('main article > section')
      await expect(body.locator('p').first()).not.toHaveText('')
      await expect(body.getByRole('group').getByRole('link')).toHaveCount(3)
    })

    test(`${locale}: an unknown slug is a 404, not a crash`, async ({
      page,
      request,
    }) => {
      const url = urlFor(locale, '/frettir/there-is-no-article-with-this-slug')
      const response = await request.get(url, { maxRedirects: 0 })
      expect(response.status(), `status for ${url}`).toBe(404)

      // And it renders the site's 404 rather than an unstyled error.
      await page.goto(url)
      await expect(page.locator('h1')).toHaveCount(1)
    })
  }

  // The three byline cases (#142), one seeded article each. Fixture slugs are pinned here on
  // purpose: the byline is data, so the test needs the article that has each kind.
  test.describe('byline', () => {
    for (const locale of LOCALES) {
      test(`${locale}: a board-member author shows photo block, name and role`, async ({ page }) => {
        await page.goto(urlFor(locale, locale === 'is' ? '/frettir/ny-stjorn-er-tekin-vid' : '/news/ny-stjorn-er-tekin-vid'))
        const byline = page.locator('article footer').locator('div:has(> p:has-text("Salena"))')
        await expect(byline).toHaveCount(1)
        await expect(byline).toContainText('Salena Raquel Kauffman')
        await expect(byline).toContainText('Formaður')
        // The photo block is drawn even when the member has no photo uploaded.
        await expect(byline.locator('span').first()).toBeVisible()
      })

      test(`${locale}: a text author shows the name alone`, async ({ page }) => {
        await page.goto(urlFor(locale, locale === 'is' ? '/frettir/innsendingar-opna-i-agust' : '/news/innsendingar-opna-i-agust'))
        const foot = page.locator('article footer')
        await expect(foot).toContainText('Ritstjórn vefsins')
        // No role line and no photo block: the byline is a single paragraph of label + name.
        await expect(foot.locator('p', { hasText: 'Ritstjórn vefsins' }).locator('> span')).toHaveCount(2)
        await expect(foot.locator('img')).toHaveCount(0)
      })

      test(`${locale}: an article with neither has no byline`, async ({ page }) => {
        await page.goto(urlFor(locale, locale === 'is' ? '/frettir/adgengi-verdur-ahersluatridi-arsins' : '/news/adgengi-verdur-ahersluatridi-arsins'))
        const foot = page.locator('article footer')
        await expect(foot).toBeVisible()
        await expect(foot.getByText(locale === 'is' ? 'Höfundur' : 'Author')).toHaveCount(0)
        // The share row is still there.
        await expect(foot.getByRole('group')).toHaveCount(1)
      })
    }
  })

  test("/is/<other-language page name>/<slug> redirects to the page's own name", async ({
    page,
    request,
  }) => {
    const url = await firstArticleUrl(page, 'is')
    // `/is/frettir/x` is the canonical form; the English name for the same page
    // is a real page under the wrong name, so it is sent to the right one.
    const wrongName = url.replace('/is/frettir/', '/is/news/')
    expect(wrongName, 'the test did not build a different URL').not.toBe(url)

    const response = await request.get(wrongName, { maxRedirects: 0 })
    expect(response.status(), `${wrongName} should redirect`).toBeGreaterThanOrEqual(300)
    expect(response.status()).toBeLessThan(400)
    expect(new URL(response.headers()['location'], 'http://localhost').pathname).toBe(url)
  })
})
