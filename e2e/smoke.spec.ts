import { expect, test } from '@playwright/test'
import { collectPageErrors, describeProblem, everyPage, settle } from './pages'
import { KNOWN_CONSOLE_ERRORS, findKnownConsoleError } from './known-console-errors'

/**
 * Does every public route still load, render its own heading, and stay quiet in
 * the console? This is the regression net the page-building PRs land on top of.
 *
 * ## What this suite does NOT cover
 *
 * Be clear about the ceiling, because the tempting mistake is to trust it further
 * than it deserves:
 *
 *  - **No copy is asserted.** Beyond the `<h1>` text and the presence of at least
 *    one content `<section>`, nothing checks what a page actually says. Replace
 *    every paragraph on a page with lorem ipsum and the suite stays green.
 *  - **Layout and visual design are not checked.** No snapshots, no visual
 *    regression, no assertion that anything is positioned or styled correctly.
 *  - **Nothing is asserted about where a link goes**, only that it resolves to a
 *    known route (see `links.spec.ts`). A nav item pointing at the wrong real
 *    page is caught only where `locale-routing.spec.ts` or `links.spec.ts`
 *    happens to pin it.
 *  - **Only Chromium, only desktop.** No Firefox, no WebKit, no mobile viewport.
 *  - **Forms are not submitted** and no authenticated or `/admin` surface is
 *    touched.
 *
 * That is a deliberate scope: this is a route-level regression net, and asserting
 * on body copy would make it a chore to update on every content PR. Per-page
 * content assertions belong with the PR that builds the page.
 */
test.describe('page smoke', () => {
  for (const { locale, page: spec, url } of everyPage()) {
    test(`${locale} ${spec.name} (${url}) loads`, async ({ page }) => {
      const errors = collectPageErrors(page)

      const response = await page.goto(url)
      expect(response, `no response for ${url}`).not.toBeNull()
      expect(response!.status(), `status for ${url}`).toBe(200)

      // The visible URL must be exactly what we asked for: no redirect, and no
      // internal `/is` prefix leaking into the address bar.
      expect(new URL(page.url()).pathname).toBe(url)

      const h1 = page.locator('h1')
      await expect(h1).toHaveCount(1)
      await expect(h1).toHaveText(spec.h1[locale])

      const main = page.locator('main#main')
      await expect(main).toBeVisible()

      // The page must have a body, not just a heading. Pages are built out of
      // `<section>`s (the `Section` component) or an `<article>`, so requiring
      // one is the cheapest assertion that fails when a page is gutted —
      // without pinning any actual copy, which would make this a chore on
      // every content PR.
      await expect(
        main.locator('section, article'),
        `${url} rendered its <h1> but no content body`,
      ).not.toHaveCount(0)

      // Only assert on the console once the page has stopped working. Asserting
      // at `load` catches an error thrown at 0ms and misses one thrown at 250ms.
      // (Making this wait is what surfaced svef/www#60, which had been logging
      // on every English page the whole time.)
      await settle(page)

      const unexpected: string[] = []
      const seen = new Map<(typeof KNOWN_CONSOLE_ERRORS)[number], number>()
      for (const problem of errors) {
        const known = findKnownConsoleError(url, problem)
        if (known) {
          seen.set(known, (seen.get(known) ?? 0) + 1)
          continue
        }
        unexpected.push(describeProblem(problem))
      }
      for (const known of KNOWN_CONSOLE_ERRORS) {
        if (!(url in known.urls)) continue
        const actual = seen.get(known) ?? 0
        if (actual > known.urls[url]) {
          unexpected.push(
            `[allowlist] svef/www#${known.issue} logged ${actual} times on ${url}, but only ` +
              `${known.urls[url]} accepted. Fix it, or update the count in ` +
              `e2e/known-console-errors.ts with a reason.`,
          )
        }
      }

      expect(unexpected.join('\n'), `console errors on ${url}`).toBe('')
    })
  }

  // The guard on the allowlist: every accepted console error has to still
  // happen. Fix the issue and this goes red, which is the prompt to delete it.
  for (const known of KNOWN_CONSOLE_ERRORS) {
    test(`known console error for #${known.issue} still reproduces`, async ({ page }) => {
      const wrong: string[] = []
      // Attach once: a collector per iteration would stack listeners and count
      // each message as many times as the loop had run.
      const errors = collectPageErrors(page)

      for (const [url, expected] of Object.entries(known.urls)) {
        const before = errors.length
        await page.goto(url)
        await settle(page)
        const actual = errors.slice(before).filter((p) => known.matches(p)).length
        if (actual !== expected) wrong.push(`${url}: expected ${expected}, found ${actual}`)
      }

      expect(
        wrong.join('\n'),
        `svef/www#${known.issue} no longer reproduces as recorded. If it is fixed, delete the ` +
          `entry from e2e/known-console-errors.ts so the assertion is enforced again. (${known.why})`,
      ).toBe('')
    })
  }
})
