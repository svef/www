import { expect, test } from '@playwright/test'
import { getDictionary } from '@/lib/i18n'
import { visibleNavItems } from '@/lib/nav'
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
 * names. The expectation is **derived from the nav's own data**
 * (`visibleNavItems`, which the layout renders from, with `HIDDEN_PAGES`
 * applied) rather than retyped here, so adding a submenu, reordering the items
 * or hiding a page needs no edit in this file. What this catches is the
 * rendered header drifting from that data.
 */
test.describe('site chrome links', () => {
  for (const locale of LOCALES) {
    const t = getDictionary(locale)

    test(`${locale}: the primary nav points every label at its own page`, async ({ page }) => {
      await page.goto(urlFor(locale, ''))
      await settle(page)

      // A parent link is followed by its submenu's links, which is also the
      // order they appear in the DOM.
      const expected = visibleNavItems(locale, t).flatMap((item) => [
        { label: item.label, href: item.href },
        ...(item.children ?? []),
      ])
      expect(expected.length, 'the nav data is empty').toBeGreaterThan(0)

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

    test(`${locale}: the footer's contact link and the header logo point where they should`, async ({
      page,
    }) => {
      await page.goto(urlFor(locale, '/um-svef'))
      await settle(page)

      // The contact page is linked from the footer and nowhere else (svef/www#107):
      // the header has no room for it, and it is not a nav item.
      const contact = page.locator('footer a', { hasText: t.nav.contact })
      await expect(contact).toHaveAttribute('href', urlFor(locale, '/hafa-samband'))
      await expect(page.locator('header a', { hasText: t.nav.contact })).toHaveCount(0)

      // The logo is the way back to the home page from everywhere.
      await expect(page.locator('header a[aria-label="SVEF"]')).toHaveAttribute(
        'href',
        urlFor(locale, ''),
      )
    })
  }
})
