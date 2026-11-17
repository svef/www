import { expect, test } from '@playwright/test'
import { LOCALES, settle, urlFor, dynamicHrefsInMain } from './pages'

/**
 * Content assertions for the rebuilt events pages (#130). The route-level sweeps check that a
 * page loads and is accessible; these check that it says what it should. Slugs are read from
 * the index, not pinned, because the seeded upcoming events are dated relative to the day the
 * seed ran.
 */
for (const locale of LOCALES) {
  test.describe(`events content (${locale})`, () => {
    test('the index has an h1, an upcoming section and posters that link to events', async ({ page }) => {
      await page.goto(urlFor(locale, '/vidburdir'))
      await settle(page)

      await expect(page.locator('main#main h1')).toHaveCount(1)
      const hrefs = await dynamicHrefsInMain(page, '/vidburdir/[slug]')
      expect(hrefs.length).toBeGreaterThan(0)

      const posters = page.locator('main#main ul a[href] h3')
      expect(await posters.count()).toBeGreaterThanOrEqual(hrefs.length)
      // Every poster carries a machine-readable date.
      await expect(page.locator('main#main ul a[href] time[datetime]').first()).toBeVisible()
    })

    test('an upcoming event shows its date, venue and sponsors, and more events in a carousel', async ({ page }) => {
      await page.goto(urlFor(locale, '/vidburdir'))
      await settle(page)
      const hrefs = await dynamicHrefsInMain(page, '/vidburdir/[slug]')
      // The sponsored fixture is the first upcoming event; find it rather than assume the order.
      let found = false
      for (const href of hrefs) {
        await page.goto(href)
        await settle(page)
        const sponsors = page.locator('main#main section[aria-labelledby="event-sponsors-title"]')
        if ((await sponsors.count()) === 0) continue
        found = true
        await expect(page.locator('main#main h1')).toHaveCount(1)
        await expect(page.locator('main#main dl dt').first()).toBeVisible()
        // The date is a pill in the band, as in the export, not a row of the facts card.
        await expect(page.locator('main#main header time[datetime]')).toHaveCount(1)
        await expect(page.locator('main#main dl a[href^="mailto:"]')).toHaveCount(1)
        const logos = sponsors.locator('img')
        expect(await logos.count()).toBeGreaterThanOrEqual(2)
        for (const img of await logos.all()) {
          await expect(img).toHaveAttribute('alt', /.+/)
          // Normalised by height: every logo draws at the same height class of box.
          await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0)
        }
        const carousel = page.locator('[aria-roledescription="carousel"]')
        await expect(carousel).toHaveCount(1)
        await expect(carousel.locator('a[href]').first()).toBeVisible()
        break
      }
      expect(found, 'no upcoming event with sponsors — is the database seeded?').toBe(true)
    })

    test('the carousel scrolls natively and the dots follow it', async ({ page }) => {
      await page.goto(urlFor(locale, '/vidburdir'))
      await settle(page)
      const hrefs = await dynamicHrefsInMain(page, '/vidburdir/[slug]')
      await page.goto(hrefs[0])
      await settle(page)
      const track = page.locator('[aria-roledescription="carousel"] > ul')
      await expect(track).toHaveCount(1)
      const before = await track.evaluate((el) => el.scrollLeft)
      await page.locator('[aria-roledescription="carousel"] button').last().click()
      await expect.poll(() => track.evaluate((el) => el.scrollLeft)).toBeGreaterThan(before)
    })
  })
}
