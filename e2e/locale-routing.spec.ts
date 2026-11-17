import { expect, test } from '@playwright/test'
import { localePath } from '@/lib/i18n'
import { LOCALES, VISIBLE_PAGES, everyPage, urlFor } from './pages'

/**
 * Locale routing is symmetric (see `src/proxy.ts` and CLAUDE.md "Routing and
 * language"): every page lives under an explicit prefix, `/is/...` and
 * `/en/...`, and both are served directly. Pages are named in the reader's
 * language (`/is/vidburdir`, `/en/events`); the same page asked for by the other
 * language's name redirects to the right one, and a path with no locale gains
 * one. Every href the site renders must be the canonical form for the locale of
 * the page it is on.
 */
const OTHER: Record<(typeof LOCALES)[number], (typeof LOCALES)[number]> = { is: 'en', en: 'is' }

test.describe('locale routing', () => {
  test('the root redirects to the default language', async ({ request }) => {
    const response = await request.get('/', { maxRedirects: 0 })
    expect(response.status()).toBeGreaterThanOrEqual(300)
    expect(response.status()).toBeLessThan(400)
    expect(new URL(response.headers()['location'], 'http://localhost').pathname).toBe('/is')
  })

  for (const { locale, page: spec, url } of everyPage()) {
    test(`${url} is served directly, with no redirect`, async ({ request }) => {
      const response = await request.get(url, { maxRedirects: 0 })
      expect(response.status()).toBe(200)
    })

    // A page's name in the other language is a real page under the wrong name:
    // it is sent to the right one rather than served at two URLs.
    const wrongName = urlFor(OTHER[locale], spec.path).replace(`/${OTHER[locale]}`, `/${locale}`)
    if (wrongName !== url) {
      test(`${wrongName} redirects to ${url}`, async ({ request }) => {
        const response = await request.get(wrongName, { maxRedirects: 0 })
        expect(response.status(), `${wrongName} should redirect`).toBeGreaterThanOrEqual(300)
        expect(response.status()).toBeLessThan(400)
        const location = response.headers()['location']
        expect(location, `Location header for ${wrongName}`).toBeDefined()
        expect(new URL(location, 'http://localhost').pathname).toBe(url)
      })
    }

    // The visitor typed or followed a path with no locale: it keeps the path
    // and gains the default language rather than being thrown away.
    if (locale === 'is' && spec.path !== '') {
      test(`${spec.path} gains the /is prefix`, async ({ request }) => {
        const response = await request.get(spec.path, { maxRedirects: 0 })
        expect(response.status()).toBeGreaterThanOrEqual(300)
        expect(response.status()).toBeLessThan(400)
        expect(new URL(response.headers()['location'], 'http://localhost').pathname).toBe(url)
      })
    }

    test(`${url} declares lang="${locale}" and links only to its own locale's URLs`, async ({
      page,
    }) => {
      await page.goto(url)

      await expect(page.locator('html')).toHaveAttribute('lang', locale)

      // The language toggle is the one link that is meant to point the other
      // way, and it is the only one carrying `hreflang`.
      const hrefs = await page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'))
          .filter((a) => !a.hasAttribute('hreflang'))
          .map((a) => a.getAttribute('href') ?? '')
          .filter((href) => href.startsWith('/') && !href.startsWith('//')),
      )

      // Canonical means: carries this page's own prefix, and names every page
      // in this page's language. `localePath` is the site's own rule for that.
      const notCanonical = hrefs.filter(
        (href) => !/^\/(admin|api)(\/|$)/.test(href) && localePath(href, locale) !== href,
      )
      expect(
        notCanonical,
        `hrefs on ${url} that are not in the ${locale} form (wrong or missing prefix, ` +
          `or a page named in the other language)`,
      ).toEqual([])
    })
  }

  // #40: the toggle used to send you to the other locale's home page. It has to
  // keep you where you are.
  for (const spec of VISIBLE_PAGES) {
    test(`language toggle keeps you on ${spec.name}`, async ({ page }) => {
      const toggle = page.locator('header a[hreflang]')

      await page.goto(urlFor('is', spec.path))
      await expect(toggle).toHaveAttribute('hreflang', 'en')
      await expect(toggle).toHaveAttribute('href', urlFor('en', spec.path))
      await toggle.click()
      await expect(page).toHaveURL(new RegExp(`${escapeForRegExp(urlFor('en', spec.path))}$`))
      await expect(page.locator('h1')).toHaveText(spec.h1.en)

      await expect(toggle).toHaveAttribute('hreflang', 'is')
      await expect(toggle).toHaveAttribute('href', urlFor('is', spec.path))
      await toggle.click()
      await expect(page).toHaveURL(new RegExp(`${escapeForRegExp(urlFor('is', spec.path))}$`))
      await expect(page.locator('h1')).toHaveText(spec.h1.is)
    })
  }
})

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
