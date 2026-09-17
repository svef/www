import { expect, test } from '@playwright/test'
import { getDictionary } from '@/lib/i18n'
import { LOCALES, settle, urlFor } from './pages'

/**
 * The site chrome's link contract.
 *
 * Link integrity (`links.spec.ts`) only proves a link goes *somewhere real*, so
 * repointing a nav item at a different existing page slips straight through it:
 * `/um-svef` → `/skraning` is a perfectly valid route. But the header is on all
 * sixteen pages, so getting it wrong is the highest-blast-radius link mistake
 * available, and it is exactly the kind of thing a careless refactor does.
 *
 * So the pairing is pinned: each nav label must point at the page that label
 * names. Labels come from the i18n dictionary rather than being retyped here —
 * the point is to catch a changed `href`, not to duplicate copy.
 */
const NAV_ORDER = [
  { key: 'awards', path: '/vefverdlaunin' },
  { key: 'events', path: '/vidburdir' },
  { key: 'news', path: '/frettir' },
  { key: 'about', path: '/um-svef' },
  { key: 'membership', path: '/skraning' },
] as const

test.describe('site chrome links', () => {
  for (const locale of LOCALES) {
    const t = getDictionary(locale)

    test(`${locale}: the primary nav points every label at its own page`, async ({ page }) => {
      await page.goto(urlFor(locale, ''))
      await settle(page)

      const expected = NAV_ORDER.map(({ key, path }) => ({
        label: t.nav[key],
        href: urlFor(locale, path),
      }))

      // The nav's accessible name is localized chrome copy like everything else
      // in the header, so the selector reads it from the dictionary rather than
      // pinning the English string it used to have.
      const actual = await page.evaluate(
        (navLabel) =>
          Array.from(
            document.querySelectorAll<HTMLAnchorElement>(
              `header nav[aria-label="${navLabel}"] a[href]`,
            ),
          ).map((a) => ({
            label: (a.textContent ?? '').trim(),
            href: a.getAttribute('href') ?? '',
          })),
        t.nav.primary,
      )

      expect(actual, 'the primary nav label → href pairing').toEqual(expected)
    })

    test(`${locale}: the contact link and logo point where they should`, async ({ page }) => {
      await page.goto(urlFor(locale, '/um-svef'))
      await settle(page)

      const contact = page.locator('header a', { hasText: t.nav.contact })
      await expect(contact).toHaveAttribute('href', urlFor(locale, '/hafa-samband'))

      // The logo is the way back to the home page from everywhere.
      await expect(page.locator('header a[aria-label="SVEF"]')).toHaveAttribute(
        'href',
        urlFor(locale, ''),
      )
    })
  }
})
