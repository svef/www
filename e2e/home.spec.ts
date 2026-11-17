import { expect, test } from '@playwright/test'
import { isHiddenPath } from '@/lib/i18n'
import { dynamicHrefsInMain, LOCALES, settle, urlFor } from './pages'

/**
 * The home page's content, `/is` and `/en` (#129): the export's `forsida` — hero, intro
 * band, the events zig-zag and the about block, and nothing else.
 *
 * The route-level sweeps already cover this page (smoke, headings, links, axe); what they
 * deliberately do not do is assert what is *on* it. Everything here is read from the
 * rendered page rather than from the seed fixtures, so it stays true as fixture dates roll
 * and when the `home-page` global is empty (every piece of copy then falls back to the
 * export's own).
 */
test.describe('home', () => {
  for (const locale of LOCALES) {
    test(`${locale}: one h1, set on several lines that wrap inside the screen`, async ({
      page,
    }) => {
      for (const width of [320, 390, 1440]) {
        await page.setViewportSize({ width, height: 900 })
        await page.goto(urlFor(locale, ''))
        await settle(page)
        const h1 = page.locator('main#main h1')
        await expect(h1).toHaveCount(1)

        // The headline is split into one box per word; it still reads as one phrase.
        const text = (await h1.innerText()).replace(/\s+/g, ' ').trim()
        expect(text.split(' ').length).toBeGreaterThan(3)
        expect(await h1.locator('[data-word]').count()).toBeGreaterThan(3)

        // More than one line, and none of it past the right edge.
        const box = (await h1.boundingBox())!
        const lineHeight = await h1.evaluate((el) => parseFloat(getComputedStyle(el).lineHeight))
        expect(box.height, `${width}px: the headline is on one line`).toBeGreaterThan(
          lineHeight * 1.5,
        )
        expect(box.x + box.width, `${width}px: the headline runs off the screen`).toBeLessThanOrEqual(
          width,
        )
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
          `${width}px: the page scrolls sideways`,
        ).toBeLessThanOrEqual(width)
      }
    })

    test(`${locale}: the intro band's statement, and no awards, membership or news`, async ({
      page,
    }) => {
      await page.goto(urlFor(locale, ''))
      await settle(page)
      const main = page.locator('main#main')

      // The statement under the hero is always there: it falls back to the export's copy.
      const intro = main.locator('p[data-notch]')
      await expect(intro).toHaveCount(1)
      expect((await intro.innerText()).trim().length).toBeGreaterThan(40)

      for (const path of ['/vefverdlaunin', '/skraning']) {
        if (isHiddenPath(path)) {
          await expect(main.locator(`a[href="${urlFor(locale, path)}"]`)).toHaveCount(0)
        }
      }
      // The export's Web Awards section is left out while that page is on hold, and its
      // home has no news section.
      await expect(main.locator('#h-verdl')).toHaveCount(0)
      await expect(main.locator('#home-news')).toHaveCount(0)
      expect(await dynamicHrefsInMain(page, '/frettir/[slug]')).toEqual([])
    })

    test(`${locale}: the events zig-zag links to at most four events, each once`, async ({
      page,
    }) => {
      await page.goto(urlFor(locale, ''))
      await settle(page)

      const section = page.locator('section[aria-labelledby="home-events"]')
      await expect(section).toHaveCount(1)
      await expect(section.getByRole('link', { name: /Allir viðburðir|All events/ })).toHaveCount(1)

      const hrefs = await dynamicHrefsInMain(page, '/vidburdir/[slug]')
      if (hrefs.length === 0) {
        // Nothing upcoming and nothing past: an intentional empty state.
        await expect(
          section.getByRole('heading', { name: /Engir viðburðir framundan|No upcoming events/ }),
        ).toHaveCount(1)
        return
      }
      // Upcoming events under "Næstu viðburðir", or, with none, the latest past ones under
      // "Liðnir viðburðir".
      await expect(section.locator('h2')).toHaveText(
        /Næstu viðburðir|Upcoming events|Liðnir viðburðir|Past events/,
      )
      const items = section.getByRole('list').first().getByRole('listitem')
      expect(await items.count()).toBe(hrefs.length)
      expect(hrefs.length).toBeLessThanOrEqual(4)
      expect(new Set(hrefs).size, `an event was listed twice: ${hrefs.join(', ')}`).toBe(
        hrefs.length,
      )
      // No carousel: the posters sit in a grid.
      await expect(section.getByRole('group')).toHaveCount(0)
    })

    test(`${locale}: zig-zags on wide screens, one column on phones`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 })
      await page.goto(urlFor(locale, ''))
      await settle(page)
      const items = page.locator('section[aria-labelledby="home-events"] li')
      const n = await items.count()
      test.skip(n < 2, 'fewer than two events to lay out')

      const a = (await items.nth(0).boundingBox())!
      const b = (await items.nth(1).boundingBox())!
      // The second poster sits to the right of the first and starts lower, still beside it.
      expect(b.x).toBeGreaterThan(a.x + a.width)
      expect(b.y).toBeGreaterThan(a.y)
      expect(b.y).toBeLessThan(a.y + a.height)

      await page.setViewportSize({ width: 390, height: 900 })
      const a2 = (await items.nth(0).boundingBox())!
      const b2 = (await items.nth(1).boundingBox())!
      expect(b2.x).toBe(a2.x)
      expect(b2.y).toBeGreaterThanOrEqual(a2.y + a2.height)
    })

    test(`${locale}: the about block links to the About page`, async ({ page }) => {
      await page.goto(urlFor(locale, ''))
      await settle(page)
      const about = page.locator('section[aria-labelledby="home-about"]')
      await expect(about.locator('h2')).toHaveText(/Um SVEF|About SVEF/)
      await expect(about.locator('p')).toHaveCount(1)
      await expect(about.locator(`a[href="${urlFor(locale, '/um-svef')}"]`)).toHaveCount(1)
    })
  }
})
