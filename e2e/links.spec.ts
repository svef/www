import { expect, test, type Page } from '@playwright/test'
import { allKnownUrls, dynamicRouteFor, everyPage, settle } from './pages'
import {
  KNOWN_DEAD_LINKS,
  describeLink,
  findKnownDeadLink,
  type LinkProblem,
  type PageLink,
} from './known-links'

/**
 * Internal link integrity.
 *
 * The rest of the suite proves each route exists. Nothing proved that anything
 * *links* to them correctly — a nav item repointed at the wrong page, or a card
 * pointing at a route that does not exist, went unnoticed. This walks every
 * internal link on every page and asserts it goes somewhere real.
 *
 * Links that are knowingly dead (placeholders for pages not yet built) are
 * listed in `known-links.ts` with the issue that removes them, and guarded by a
 * still-reproduces test so the list cannot outlive its reason.
 */
const KNOWN_URLS = new Set(allKnownUrls())

/** Every `<a href>` on the page, tagged with the landmark it sits in. */
async function collectLinks(page: Page): Promise<PageLink[]> {
  return page.evaluate(() => {
    const landmark = (el: Element): 'header' | 'main' | 'footer' | 'other' => {
      if (el.closest('main#main')) return 'main'
      if (el.closest('header')) return 'header'
      if (el.closest('footer')) return 'footer'
      return 'other'
    }
    return Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]')).map((a) => {
      const raw = a.getAttribute('href') ?? ''
      let resolved = ''
      if (raw.startsWith('/')) {
        resolved = new URL(raw, window.location.origin).pathname
      } else if (/^https?:/i.test(raw)) {
        const u = new URL(raw)
        if (u.origin === window.location.origin) resolved = u.pathname
      }
      return {
        href: raw,
        resolved,
        where: landmark(a),
        text: (a.textContent ?? '').trim().slice(0, 60),
      }
    })
  })
}

/** Ids present on the page, for checking in-page `#anchor` links. */
async function anchorIds(page: Page): Promise<Set<string>> {
  return new Set(
    await page.evaluate(() =>
      Array.from(document.querySelectorAll('[id]')).map((el) => el.id),
    ),
  )
}

function problemFor(
  link: PageLink,
  currentPath: string,
  ids: Set<string>,
): LinkProblem | null {
  const raw = link.href

  // Not a link into this site: someone else's problem.
  if (/^(mailto:|tel:)/i.test(raw)) return null
  if (/^https?:/i.test(raw) && link.resolved === '') return null

  if (raw === '#') return 'placeholder-hash'
  if (raw.startsWith('#')) {
    return ids.has(decodeURIComponent(raw.slice(1))) ? null : 'dead-anchor'
  }

  if (link.resolved === '') return null

  const path = normalisePath(link.resolved)
  // A path the static table does not have is only acceptable if it belongs to a
  // declared dynamic route. Matching the shape is not enough on its own — the
  // caller also fetches it — but an undeclared shape is dead on sight.
  if (!KNOWN_URLS.has(path) && !dynamicRouteFor(path)) return 'unknown-route'

  // A link in the page body pointing at the page it is already on is almost
  // always a placeholder for a detail page that does not exist yet. Header and
  // footer are excluded: the nav legitimately contains the current page.
  if (path === currentPath && link.where === 'main') return 'self-link'

  return null
}

function normalisePath(resolved: string): string {
  return resolved.length > 1 ? resolved.replace(/\/$/, '') : resolved
}

test.describe('internal links', () => {
  for (const { locale, page: spec, url } of everyPage()) {
    test(`${locale} ${spec.name} (${url}) links only to real routes`, async ({
      page,
      request,
    }) => {
      await page.goto(url)
      await settle(page)

      const links = await collectLinks(page)
      const ids = await anchorIds(page)
      expect(links.length, `no links at all on ${url}`).toBeGreaterThan(0)

      const unexpected: string[] = []
      const seen = new Map<(typeof KNOWN_DEAD_LINKS)[number], number>()

      for (const link of links) {
        const problem = problemFor(link, url, ids)
        if (!problem) continue

        const known = findKnownDeadLink(problem, url, link)
        if (known) {
          seen.set(known, (seen.get(known) ?? 0) + 1)
          continue
        }
        unexpected.push(describeLink(problem, link))
      }

      for (const known of KNOWN_DEAD_LINKS) {
        if (!(url in known.urls)) continue
        const actual = seen.get(known) ?? 0
        if (actual > known.urls[url]) {
          unexpected.push(
            `[allowlist] svef/www#${known.issue} matched ${actual} links on ${url}, but only ` +
              `${known.urls[url]} are accepted. A new dead link has appeared — fix it, or ` +
              `update the count in e2e/known-links.ts with a reason.`,
          )
        }
      }

      // Links into a dynamic route matched a declared shape, which says nothing
      // about whether that particular slug exists. Fetch each distinct one and
      // require a 200 — this is what actually covers the article links on
      // /frettir, where the slug comes from the database.
      const dynamicTargets = new Set(
        links
          .map((link) => normalisePath(link.resolved))
          .filter((path) => path !== '' && !KNOWN_URLS.has(path) && dynamicRouteFor(path)),
      )
      for (const target of dynamicTargets) {
        const response = await request.get(target, { maxRedirects: 0 })
        if (response.status() !== 200) {
          unexpected.push(
            `[dead-dynamic-route] ${target} is linked from ${url} and matches ` +
              `${dynamicRouteFor(target)?.pattern}, but returned ${response.status()}`,
          )
        }
      }

      expect(unexpected.join('\n'), `dead or misdirected links on ${url}`).toBe('')
    })
  }

  // The guard on the allowlist: every accepted dead link has to still be dead.
  // Fix the issue and this goes red, which is the prompt to delete the entry.
  for (const known of KNOWN_DEAD_LINKS) {
    test(`known dead links for #${known.issue} still reproduce`, async ({ page }) => {
      // One test, but up to 16 page loads inside it — an entry that lists every
      // page (the footer placeholders, #26) does the work of sixteen of the
      // per-page tests above while sharing their 30s budget, and each load ends
      // in a `settle()` that may wait 5s. It measures ~11s alone and has timed
      // out on a loaded machine, so the budget is scaled to the work rather
      // than the assertion being weakened: this still fails on a real hang,
      // just not on a busy laptop.
      test.setTimeout(120_000)

      const wrong: string[] = []

      for (const [url, expected] of Object.entries(known.urls)) {
        await page.goto(url)
        await settle(page)
        const links = await collectLinks(page)
        const ids = await anchorIds(page)

        const actual = links.filter((link) => {
          const problem = problemFor(link, url, ids)
          return problem === known.problem && known.matches(link)
        }).length

        if (actual !== expected) wrong.push(`${url}: expected ${expected}, found ${actual}`)
      }

      expect(
        wrong.join('\n'),
        `svef/www#${known.issue} no longer reproduces as recorded. If it is fixed, delete ` +
          `the entry from e2e/known-links.ts so these links are enforced again. (${known.why})`,
      ).toBe('')
    })
  }
})
