import { expect, test } from '@playwright/test'
import { LOCALES, PAGES, urlFor } from './pages'

/**
 * Locale routing is asymmetric (see `src/proxy.ts`): Icelandic is served
 * unprefixed and only rewritten to `/is/...` internally, English is served at
 * `/en/...`, and `/is/...` is redirected back to the clean form. The internal
 * prefix must never reach the browser — not in the address bar, not in an href.
 */
test.describe('locale routing', () => {
  for (const spec of PAGES) {
    const prefixed = `/is${spec.path}`

    test(`${prefixed} redirects to the unprefixed path`, async ({ request }) => {
      const response = await request.get(prefixed, { maxRedirects: 0 })
      expect(response.status(), `${prefixed} should redirect`).toBeGreaterThanOrEqual(300)
      expect(response.status()).toBeLessThan(400)
      const location = response.headers()['location']
      expect(location, `Location header for ${prefixed}`).toBeDefined()
      expect(new URL(location, 'http://localhost').pathname).toBe(urlFor('is', spec.path))
    })

    test(`${urlFor('en', spec.path)} is served directly`, async ({ request }) => {
      const response = await request.get(urlFor('en', spec.path), { maxRedirects: 0 })
      expect(response.status()).toBe(200)
    })
  }

  for (const locale of LOCALES) {
    for (const spec of PAGES) {
      const url = urlFor(locale, spec.path)

      test(`${url} declares lang="${locale}" and leaks no /is href`, async ({ page }) => {
        await page.goto(url)

        await expect(page.locator('html')).toHaveAttribute('lang', locale)

        const leaked = await page.evaluate(() =>
          Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'))
            .map((a) => a.getAttribute('href') ?? '')
            .filter((href) => href === '/is' || href.startsWith('/is/')),
        )
        expect(leaked, `hrefs exposing the internal /is prefix on ${url}`).toEqual([])
      })
    }
  }

  // #40: the toggle used to send you to the other locale's home page. It has to
  // keep you where you are.
  for (const spec of PAGES) {
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
