import { expect, test } from '@playwright/test'
import { LOCALES, settle, urlFor } from './pages'

/**
 * The home page's content, `/` and `/en` (#18).
 *
 * The route-level sweeps already cover this page — it is in the `PAGES` table,
 * so smoke, headings, links and axe all visit it. What they deliberately do not
 * do is assert what is *on* it beyond the `<h1>`, and this page is four teaser
 * sections read from four different places in Payload. A page that quietly lost
 * its winners strip, or started listing the next event twice, would pass every
 * one of those sweeps.
 *
 * Everything here is asserted from the rendered page rather than from the seed
 * fixtures, so it stays true as the fixture dates roll past.
 */
test.describe('home', () => {
  for (const locale of LOCALES) {
    test(`${locale}: renders every section the design specifies`, async ({ page }) => {
      await page.goto(urlFor(locale, ''))
      await settle(page)

      const main = page.locator('main#main')

      // The three teaser sections, in order, each with the right-aligned link
      // the design puts on its heading row. Read from the header rows
      // themselves rather than from the page's links as a whole: the hero also
      // links to /vidburdir, so a count of hrefs would stay green with the
      // section link gone.
      const sectionLinks = await page.evaluate(() =>
        Array.from(document.querySelectorAll('main#main div'))
          .filter((d) => d.querySelector(':scope > h2') && d.querySelector(':scope > a'))
          .map((d) => d.querySelector(':scope > a')?.getAttribute('href') ?? ''),
      )
      // The winners and photos sections always render; the events section drops
      // out when the spotlight has taken the only upcoming event, so it is
      // asserted as an ordered subsequence rather than a fixed list — pinning
      // all three would make this test a hostage to the fixture dates.
      const expected = [
        urlFor(locale, '/vidburdir'),
        urlFor(locale, '/vefverdlaunin'),
        urlFor(locale, '/myndir'),
      ]
      expect(sectionLinks).toEqual(expected.filter((href) => sectionLinks.includes(href)))
      expect(sectionLinks).toContain(urlFor(locale, '/vefverdlaunin'))
      expect(sectionLinks).toContain(urlFor(locale, '/myndir'))

      // The hero's primary call to action.
      await expect(main.locator(`a[href="${urlFor(locale, '/skraning')}"]`)).toHaveCount(1)

      // Exactly one `<h1>`, and three or four `<h2>`s: the spotlight plus the
      // three section headings. The spotlight is absent when nothing is
      // upcoming, which is a real state rather than a failure.
      await expect(main.locator('h1')).toHaveCount(1)
      const h2s = await main.locator('h2').count()
      expect(h2s, 'expected the three section headings, plus the spotlight').toBeGreaterThanOrEqual(3)
      expect(h2s).toBeLessThanOrEqual(4)
    })

    test(`${locale}: shows the next event once, not twice`, async ({ page }) => {
      await page.goto(urlFor(locale, ''))
      await settle(page)

      const hrefs = await page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLAnchorElement>('main#main a[href]'))
          .map((a) => a.getAttribute('href') ?? '')
          .filter((h) => /^(\/en)?\/vidburdir\/[^/]+$/.test(h)),
      )
      expect(
        hrefs.length,
        'the home page linked to no event — is the database seeded?',
      ).toBeGreaterThan(0)
      // The spotlight names the soonest event and the list below it starts at
      // the one after, so no event may appear twice.
      expect(new Set(hrefs).size, `an event was listed twice: ${hrefs.join(', ')}`).toBe(
        hrefs.length,
      )
    })

    test(`${locale}: never announces an event and says there are none`, async ({ page }) => {
      await page.goto(urlFor(locale, ''))
      await settle(page)

      // The contradiction the events section is shaped to prevent: with one
      // event upcoming the spotlight takes it and the list is left empty, and an
      // empty state fired off the list would sit two blocks below a spotlight
      // announcing that very event. `planEventSection` owns the rule and is unit
      // tested on every input; this is the assertion against the rendered page.
      const spotlightEvent = await page
        .locator('main#main a[href*="/vidburdir/"]')
        .count()
      const emptyState = await page
        .getByRole('heading', { name: /Engir viðburðir framundan|No upcoming events/ })
        .count()
      expect(
        spotlightEvent > 0 && emptyState > 0,
        'the page linked to an event and also said there were none',
      ).toBe(false)
    })

    test(`${locale}: the winners strip shows at most three cards`, async ({ page }) => {
      await page.goto(urlFor(locale, ''))
      await settle(page)

      // Each card's heading is the winning site's domain. Scoped to the list
      // rather than to `h3`, because the event rows above are `h3`s too — the
      // winners are the only ones inside a `<ul>`.
      const cards = page.locator('main#main ul li h3')
      const count = await cards.count()
      expect(count, 'the winners strip rendered nothing').toBeGreaterThan(0)
      // Three is what the design draws. Fewer is legitimate while the archive
      // is being imported (svef/www#31); more would mean the cap was lost.
      expect(count).toBeLessThanOrEqual(3)
    })
  }

  test('the photo strip opens the same lightbox as /myndir', async ({ page }) => {
    await page.goto(urlFor('is', ''))
    await settle(page)

    // "Stækka mynd" rather than `/myndir`'s "Skoða mynd": the strip is a teaser
    // and the action it offers is the enlargement itself.
    const tiles = page.getByRole('button', { name: /^Stækka mynd/ })
    const count = await tiles.count()
    expect(count, 'the photo strip rendered no tiles').toBeGreaterThan(0)
    // The strip is capped, so its lightbox walks the strip and not the whole
    // archive — the counter in the dialog is what proves that.
    expect(count).toBeLessThanOrEqual(4)

    await tiles.first().click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText(`1 / ${count}`)

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
  })
})
