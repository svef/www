import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { collectPageErrors, describeProblem, LOCALES, settle, urlFor } from './pages'
import { triage } from './a11y/known-issues'

/**
 * The event route, `/vidburdir/[slug]` (#19).
 *
 * Same bargain as `article.spec.ts`: a dynamic segment cannot live in the
 * `PAGES` table the other sweeps iterate, so the core checks are run here
 * against a real event instead.
 *
 * Slugs are **resolved at runtime** from the index rather than pinned from the
 * seed fixtures, for the reasons spelled out in `article.spec.ts` — and here
 * there is a second one. The index has two kinds of link into this route: the
 * spotlight and the upcoming rows point at an event that has not happened yet,
 * and the "Liðnir viðburðir" cards point at one that has. Those render
 * different things — the pinned eyebrow, the tense of the photo heading — so
 * both are visited, taken from the page rather than from a fixture whose dates
 * will eventually roll into the past.
 */
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

/** Every event href on the index, in order, split by which section it came from. */
async function eventUrls(
  page: Page,
  locale: (typeof LOCALES)[number],
): Promise<{ first: string; last: string }> {
  const index = urlFor(locale, '/vidburdir')
  await page.goto(index)
  await settle(page)

  const hrefs = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLAnchorElement>('main#main a[href]'))
      .map((a) => a.getAttribute('href') ?? '')
      .filter((h) => /^(\/en)?\/vidburdir\/[^/]+$/.test(h)),
  )

  expect(
    hrefs.length,
    `the events index at ${index} linked to no event — is the database seeded?`,
  ).toBeGreaterThan(0)

  // First link on the page is the spotlight (the next event); the last is the
  // oldest past event's card. With one event they are the same page, which is
  // a fine thing to check twice.
  return { first: hrefs[0], last: hrefs[hrefs.length - 1] }
}

async function checkEventPage(page: Page, url: string, locale: (typeof LOCALES)[number]) {
  const errors = collectPageErrors(page)

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

  // The practical-information panel is the part of this page that is not prose,
  // and a `<dl>` with no pairs in it is the way it fails. The contact address
  // is unconditional, so there is always at least one.
  const facts = main.locator('dl')
  await expect(facts, `${url} rendered no practical-information list`).toHaveCount(1)
  await expect(facts.locator('dt')).not.toHaveCount(0)
  await expect(
    main.locator('a[href^="mailto:"]'),
    `${url} rendered no contact address in the sidebar`,
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

  // The console must be clean, with nothing waved through. `KNOWN_CONSOLE_ERRORS`
  // is empty since #69 turned off `experimental.optimisticRouting` and closed
  // svef/www#60, so there is no tracked exception left to allow for: anything
  // this route logs is a defect on this route.
  expect(errors.map(describeProblem), `console errors on ${url}`).toEqual([])

  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  const { unexpected } = triage(results.violations, url)
  expect(unexpected.join('\n\n'), `axe violations on ${url}`).toBe('')
}

test.describe('event route', () => {
  for (const locale of LOCALES) {
    test(`${locale}: the next event renders, is accessible and stays quiet`, async ({ page }) => {
      // Resolve the slug first, then start listening: the collector would
      // otherwise also pick up whatever the index logged on the way here.
      const { first } = await eventUrls(page, locale)
      await checkEventPage(page, first, locale)
    })

    test(`${locale}: a past event renders, is accessible and stays quiet`, async ({ page }) => {
      const { last } = await eventUrls(page, locale)
      await checkEventPage(page, last, locale)

      // Assert it really is past, rather than trusting that the last link on
      // the index came from the "Liðnir viðburðir" grid. With no past events
      // that grid is not rendered at all, `last` would quietly be an upcoming
      // event, and this test would pass under a name claiming otherwise —
      // losing exactly the coverage its docblock argues for. Read from the
      // `<time datetime>` rather than from copy, so it stays locale-free.
      const startedAt = await page
        .locator('main#main time[datetime]')
        .first()
        .getAttribute('datetime')
      expect(startedAt, `${last} rendered no machine-readable start date`).toBeTruthy()
      expect(
        new Date(startedAt as string).getTime(),
        `${last} was reached as "a past event" but starts in the future — the ` +
          `index has no past events, so this test is not testing what it says`,
      ).toBeLessThan(Date.now())
    })

    test(`${locale}: an unknown slug is a 404, not a crash`, async ({ page, request }) => {
      const url = urlFor(locale, '/vidburdir/there-is-no-event-with-this-slug')
      const response = await request.get(url, { maxRedirects: 0 })
      expect(response.status(), `status for ${url}`).toBe(404)

      // And it renders the site's 404 rather than an unstyled error.
      await page.goto(url)
      await expect(page.locator('h1')).toHaveCount(1)
    })
  }

  for (const locale of LOCALES) {
    test(`${locale}: the photos link lands on the album, not the top of /myndir`, async ({
      page,
    }) => {
      // A past event's card links at `/myndir#album-<galleryId>`, an id that
      // `/myndir` renders (#73). `links.spec.ts` cannot check this: it resolves
      // the *path* of a cross-page link and never looks at the fragment, so a
      // rename on either side would break the link silently. This is the test
      // that makes it a contract rather than a hopeful string.
      const index = urlFor(locale, '/vidburdir')
      await page.goto(index)
      await settle(page)

      const href = await page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLAnchorElement>('main#main a[href]'))
          .map((a) => a.getAttribute('href') ?? '')
          .find((h) => /#album-\d+$/.test(h)),
      )

      // The seeded fixtures have three albums against past events. If that ever
      // stops being true this fails loudly rather than skipping quietly, which
      // is the point — a test that silently covers nothing is worse than none.
      expect(
        href,
        `${index} offered no "Myndir frá viðburði" link — are galleries seeded ` +
          `against past events?`,
      ).toBeTruthy()

      const fragment = (href as string).slice((href as string).indexOf('#') + 1)
      await page.goto(href as string)
      await settle(page)

      // An attribute selector rather than `#id`: this runs in Node, where
      // `CSS.escape` does not exist, and an id is not a CSS selector.
      const target = page.locator(`[id="${fragment}"]`)
      await expect(
        target,
        `${href} points at #${fragment}, but /myndir renders no element with that id`,
      ).toHaveCount(1)
      await expect(target).toBeVisible()
    })
  }

  test('/is/vidburdir/<slug> redirects to the unprefixed path', async ({ page, request }) => {
    const { first } = await eventUrls(page, 'is')

    const response = await request.get(`/is${first}`, { maxRedirects: 0 })
    expect(response.status(), `/is${first} should redirect`).toBeGreaterThanOrEqual(300)
    expect(response.status()).toBeLessThan(400)
    expect(new URL(response.headers()['location'], 'http://localhost').pathname).toBe(first)
  })
})
