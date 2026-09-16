import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { everyPage, settle, urlFor } from '../pages'
import { KNOWN_ISSUES, triage } from './known-issues'

// The association gives out an award for accessibility, so its own site sweeps
// every page against the WCAG 2.0/2.1 A and AA rule sets.
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

test.describe('axe sweep', () => {
  for (const { locale, page: spec, url } of everyPage()) {
    test(`${locale} ${spec.name} (${url}) has no untracked violations`, async ({ page }) => {
      await page.goto(url)
      await settle(page)
      const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()

      const { unexpected } = triage(results.violations, url)
      expect(unexpected.join('\n\n'), `axe violations on ${url}`).toBe('')
    })
  }

  // The gallery lightbox is the only modal on the site — a focus trap, a
  // `role="dialog"`, and controls that only exist while it is open. The page
  // sweep above only ever sees /myndir with the lightbox closed, so its
  // highest-risk markup would never be swept at all.
  //
  // This found a real violation when it was added (svef/www#59, the close button
  // had no accessible name). That is fixed and merged, so there is no allowlist
  // entry here any more: the open lightbox is expected to be completely clean.
  for (const locale of ['is', 'en'] as const) {
    test(`${locale} the open /myndir lightbox has no violations`, async ({ page }) => {
      const url = urlFor(locale, '/myndir')
      await page.goto(url)
      await settle(page)

      await page
        .getByRole('button', { name: locale === 'is' ? 'Skoða mynd 1' : 'View photo 1' })
        .click()
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()
      // Sweep the settled modal, not the one still fading in. axe reads computed
      // colours, and mid-transition they are whatever the compositor happens to
      // have blended — which invents violations that are not really there.
      await expect
        .poll(() => dialog.evaluate((node) => getComputedStyle(node).opacity), {
          message: 'the lightbox never finished its open transition',
        })
        .toBe('1')

      const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()

      const { unexpected } = triage(results.violations, url)
      expect(unexpected.join('\n\n'), `axe violations in the open lightbox on ${url}`).toBe('')
    })
  }

  // The guard on the allowlist above: each accepted issue has to still be real,
  // on every URL it claims, in the number it claims. When the tracked issue is
  // fixed these go red, and the entry must be deleted — that is what stops the
  // allowlist quietly outliving its reason.
  for (const known of KNOWN_ISSUES) {
    for (const url of Object.keys(known.urls)) {
      const expectedCount = known.urls[url]

      test(`known issue #${known.issue} (${known.rule}) still reproduces on ${url}`, async ({
        page,
      }) => {
        await page.goto(url)
        await settle(page)
        const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()

        const actualCount = results.violations
          .filter((violation) => violation.id === known.rule)
          .reduce(
            (total, violation) => total + violation.nodes.filter((n) => known.matches(n)).length,
            0,
          )

        expect(
          actualCount,
          `svef/www#${known.issue} reproduced ${actualCount} times on ${url}, expected ` +
            `${expectedCount}. If it is fixed, delete the entry from ` +
            `e2e/a11y/known-issues.ts so the rule is enforced again. (${known.why})`,
        ).toBe(expectedCount)
      })
    }
  }
})
