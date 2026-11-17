import { expect, test } from '@playwright/test'
import { isHiddenPath } from '@/lib/i18n'
import { dynamicHrefsInMain, LOCALES, settle, urlFor } from './pages'

/**
 * The home page's content, `/is` and `/en` (#129).
 *
 * The route-level sweeps already cover this page (smoke, headings, links, axe); what they
 * deliberately do not do is assert what is *on* it. Everything here is read from the
 * rendered page rather than from the seed fixtures, so it stays true as fixture dates roll.
 */
test.describe('home', () => {
  for (const locale of LOCALES) {
    test(`${locale}: one h1, the headline in words, and no awards or membership links`, async ({
      page,
    }) => {
      await page.goto(urlFor(locale, ''))
      await settle(page)
      const main = page.locator('main#main')

      await expect(main.locator('h1')).toHaveCount(1)
      // The headline is split into one box per word; it still reads as one phrase.
      const text = (await main.locator('h1').innerText()).replace(/\s+/g, ' ').trim()
      expect(text.split(' ').length).toBeGreaterThan(3)
      expect(await main.locator('h1 [data-word]').count()).toBeGreaterThan(3)

      for (const path of ['/vefverdlaunin', '/skraning']) {
        if (isHiddenPath(path)) {
          await expect(main.locator(`a[href="${urlFor(locale, path)}"]`)).toHaveCount(0)
        }
      }
      // The export's Web Awards section is left out while that page is on hold.
      await expect(main.locator('#h-verdl')).toHaveCount(0)
    })

    test(`${locale}: the events carousel links to events, each once`, async ({ page }) => {
      await page.goto(urlFor(locale, ''))
      await settle(page)

      const carousel = page.getByRole('group', { name: /Næstu viðburðir|Upcoming events/ })
      const hrefs = await dynamicHrefsInMain(page, '/vidburdir/[slug]')
      if (hrefs.length === 0) {
        // The seeded events have dates, so once they pass there is nothing upcoming.
        await expect(
          page.getByRole('heading', { name: /Engir viðburðir framundan|No upcoming events/ }),
        ).toHaveCount(1)
        return
      }
      await expect(carousel).toHaveCount(1)
      expect(await carousel.getByRole('link').count()).toBe(hrefs.length)
      expect(hrefs.length).toBeLessThanOrEqual(6)
      expect(new Set(hrefs).size, `an event was listed twice: ${hrefs.join(', ')}`).toBe(
        hrefs.length,
      )
    })

    test(`${locale}: shows the latest news, at most three cards, and links to all of it`, async ({
      page,
    }) => {
      await page.goto(urlFor(locale, ''))
      await settle(page)

      const news = page.locator('section[aria-labelledby="home-news"]')
      const cards = await dynamicHrefsInMain(page, '/frettir/[slug]')
      if (cards.length === 0) {
        await expect(news).toHaveCount(0)
        return
      }
      expect(cards.length).toBeLessThanOrEqual(3)
      await expect(news.locator(`a[href="${urlFor(locale, '/frettir')}"]`)).toHaveCount(1)
    })
  }
})
