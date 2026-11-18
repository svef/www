import { expect, test } from '@playwright/test'
import { isHiddenPath } from '@/lib/i18n'
import { dynamicHrefsInMain, LOCALES, settle, urlFor } from './pages'

/**
 * The home page's content, `/is` and `/en` (#129): the export's `forsida` — hero, intro
 * band, the Web Awards section, the events zig-zag and the about block, and nothing else.
 *
 * The route-level sweeps already cover this page (smoke, headings, links, axe); what they
 * deliberately do not do is assert what is *on* it. Everything here is read from the
 * rendered page rather than from the seed fixtures, so it stays true as fixture dates roll
 * and when the `home-page` global is empty (every piece of copy then falls back to the
 * export's own).
 */
test.describe('home', () => {
  for (const locale of LOCALES) {
    // `scrollWidth` is no proof: the layout clips horizontal overflow, so a headline can run
    // off the right edge with no sideways scroll at all (#129). Every visible piece of
    // text is measured instead.
    test(`${locale}: no text leaves the screen, and the headline keeps its lines`, async ({
      page,
    }) => {
      for (const width of [320, 390, 768, 1024, 1440, 1920]) {
        await page.setViewportSize({ width, height: 900 })
        await page.goto(urlFor(locale, ''))
        await settle(page)
        const h1 = page.locator('main#main h1')
        await expect(h1).toHaveCount(1)

        // The headline is split into one box per word; it still reads as one phrase.
        const text = (await h1.innerText()).replace(/\s+/g, ' ').trim()
        expect(text.split(' ').length).toBeGreaterThan(3)
        expect(await h1.locator('[data-word]').count()).toBeGreaterThan(3)

        // Set on several lines, each line one line on screen: no line wraps, and none
        // is run together with the next.
        const lines = await h1.evaluate((el) => {
          const lh = parseFloat(getComputedStyle(el).lineHeight)
          return Array.from(el.children).map((line) => line.getBoundingClientRect().height / lh)
        })
        expect(lines.length, `${width}px: the headline is on one line`).toBeGreaterThan(1)
        for (const [i, h] of lines.entries()) {
          expect(h, `${width}px: headline line ${i + 1} wraps`).toBeLessThan(1.5)
        }

        const outside = await page.evaluate(() => {
          const selector = [
            'h1',
            'h2',
            'h3',
            '[data-word]',
            'p',
            'a',
            'button',
            'time',
            'li',
          ].join(',')
          return Array.from(document.querySelectorAll<HTMLElement>(
            `header ${selector.split(',').join(', header ')}, main ${selector.split(',').join(', main ')}`,
          ))
            .filter(
              (el) =>
                !el.closest('[aria-hidden="true"]') &&
                el.getAttribute('href') !== '#main' &&
                el.checkVisibility({ opacityProperty: true, visibilityProperty: true }) &&
                (el.textContent ?? '').trim() !== '',
            )
            .map((el) => ({ el, r: el.getBoundingClientRect() }))
            .filter(({ r }) => r.width > 0 && (r.right > innerWidth + 1 || r.left < -1))
            .map(
              ({ el, r }) =>
                `<${el.tagName.toLowerCase()}> "${(el.textContent ?? '').trim().slice(0, 40)}" ${Math.round(r.left)}–${Math.round(r.right)}`,
            )
        })
        expect(outside, `${width}px: text outside the screen`).toEqual([])
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
      // The home has no news section.
      await expect(main.locator('#home-news')).toHaveCount(0)
      expect(await dynamicHrefsInMain(page, '/frettir/[slug]')).toEqual([])
    })

    test(`${locale}: the Web Awards section is there, without a link to the awards page`, async ({
      page,
    }) => {
      await page.goto(urlFor(locale, ''))
      await settle(page)
      const section = page.locator('section[aria-labelledby="home-awards"]')
      await expect(section).toHaveCount(1)
      await expect(section.getByRole('heading', { level: 2 })).toHaveText(
        /Íslensku\s+vefverðlaunin|The Icelandic\s+Web Awards/,
      )
      // The date · venue line sits above it, and the three photos are decorative.
      expect((await section.locator('p').first().innerText()).trim().length).toBeGreaterThan(5)
      // Where the export's button sits, a teaser for the next submissions date — text, not a link.
      await expect(section.getByText(/innsendingar 1\. desember 2026|Submissions open 1 December 2026/)).toBeVisible()
      await expect(section.locator('[aria-hidden="true"] img')).toHaveCount(3)
      // The export's "Lesa meira" button is left out: no link at all while the awards page is
      // on hold.
      await expect(section.locator('a')).toHaveCount(0)
      await expect(
        page.locator(`main a[href="${urlFor(locale, '/vefverdlaunin')}"]`),
      ).toHaveCount(0)
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
