import { expect, test } from '@playwright/test'
import { everyHiddenPage, everyPage, HIDDEN_PAGE_SPECS, settle } from './pages'
import { isHiddenPath } from '@/lib/i18n'

/**
 * Pages switched off in `HIDDEN_PAGES` (src/lib/i18n/routes.ts, svef/www#128).
 *
 * A hidden page is built and stays on disk, but it answers 404, nothing links
 * to it and the sitemap does not list it. Which pages those are comes from the
 * app's own switch, so un-hiding one makes the 404 sweep vacuous for it rather
 * than failing, and the ordinary sweeps pick it up again.
 */
test.describe('hidden pages', () => {
  test('the switch covers the two pages on hold', () => {
    // Guards against the sweep below silently testing nothing. When a page is
    // un-hidden on purpose, update this list.
    expect(HIDDEN_PAGE_SPECS.map((spec) => spec.name).sort()).toEqual(['awards', 'membership'])
  })

  for (const { url } of everyHiddenPage()) {
    test(`${url} answers 404`, async ({ request, page }) => {
      const response = await request.get(url, { maxRedirects: 0 })
      expect(response.status()).toBe(404)

      // And in a real browser, so a client-side surprise cannot hide behind the status.
      const navigation = await page.goto(url)
      expect(navigation?.status()).toBe(404)
    })
  }

  test('the sitemap does not list them', async ({ request }) => {
    const body = await (await request.get('/sitemap.xml')).text()
    const locs = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname)
    expect(locs.length, 'sitemap has no entries').toBeGreaterThan(0)
    expect(locs.filter(isHiddenPath)).toEqual([])
  })

  for (const { url } of everyPage()) {
    test(`${url} links to no hidden page`, async ({ page }) => {
      await page.goto(url)
      await settle(page)

      // Every href, anywhere in the document: header, footer and body alike.
      const hrefs = await page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]')).map((a) => {
          const raw = a.getAttribute('href') ?? ''
          const parsed = new URL(raw, window.location.href)
          return { raw, path: parsed.origin === window.location.origin ? parsed.pathname : '' }
        }),
      )
      const offenders = hrefs.filter(({ path }) => path !== '' && isHiddenPath(path))
      expect(offenders, `links to a hidden page on ${url}`).toEqual([])
    })
  }
})
