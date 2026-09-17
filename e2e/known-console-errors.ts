import type { PageProblem } from './pages'

/**
 * Accepted, *tracked* console errors — the same shape, and the same bargain, as
 * `e2e/a11y/known-issues.ts` and `e2e/known-links.ts`.
 *
 * The smoke sweep asserts every public page loads without logging an error.
 * Where a page does log one and the fix belongs to another issue, it is listed
 * here rather than the assertion being weakened, and a guard test asserts it
 * still happens — so fixing the issue turns the suite red until the entry goes.
 */
export interface KnownConsoleError {
  /** GitHub issue on svef/www that tracks the fix. */
  issue: number
  why: string
  /**
   * Visible URL → exactly how many such messages are accepted there. A URL that
   * is not a key is not allowed to log it at all.
   */
  urls: Readonly<Record<string, number>>
  matches: (problem: PageProblem) => boolean
}

// The locale toggle on an English page links to the unprefixed Icelandic path.
// Next prefetches that as an RSC request, `src/proxy.ts` rewrites it, and the
// rewrite + RSC combination 404s. Real bug, tracked in svef/www#60 — not fatal
// (a real click falls back to a full navigation) but it fires on every load.
export const RSC_PREFETCH_404: KnownConsoleError = {
  issue: 60,
  why:
    'RSC prefetch of the unprefixed Icelandic path 404s because src/proxy.ts rewrites it. ' +
    'Tracked in svef/www#60.',
  // `/en` is not affected: its toggle points at `/`, which the proxy handles.
  //
  // `/en/frettir` came back to this list in #58. It had dropped off when #24
  // marked the route `force-dynamic`, because Next does not prefetch a dynamic
  // route's payload and the failing request was simply never made. #58 put the
  // route back on static rendering, so the prefetch — and the 404 — are back.
  // Nothing about the proxy bug changed in either direction; #60 is still the
  // fix, and it now has one more page to prove it on.
  urls: {
    '/en/frettir': 1,
    '/en/vidburdir': 1,
    '/en/vefverdlaunin': 1,
    '/en/um-svef': 1,
    '/en/skraning': 1,
    '/en/hafa-samband': 1,
    '/en/myndir': 1,
  },
  // `matches` is exported with the entry for `/frettir/[slug]`, which cannot be
  // a key here: `urls` holds visible URLs, and the article route's slug is
  // resolved from the fixtures at runtime rather than hard-coded. That route
  // turns out *not* to reproduce this — its toggle prefetch of
  // `/frettir/<slug>?_rsc=…` returns 200, where `/frettir?_rsc=…` on the index
  // returns 404 — so `article.spec.ts` asserts a count of 0 through this
  // predicate rather than listing a URL. The bargain still holds from the other
  // direction: fixing #60 and deleting this entry stops that file compiling.
  matches: (problem) =>
    problem.kind === 'console' &&
    problem.text.includes('Failed to load resource') &&
    problem.text.includes('404') &&
    // Pin it to the RSC prefetch specifically. Without this any 404 on the page
    // — a missing image, a dead API call — would be waved through.
    /[?&]_rsc=/.test(problem.url),
}

export const KNOWN_CONSOLE_ERRORS: readonly KnownConsoleError[] = [RSC_PREFETCH_404]

export function findKnownConsoleError(
  url: string,
  problem: PageProblem,
): KnownConsoleError | undefined {
  return KNOWN_CONSOLE_ERRORS.find(
    (known) => url in known.urls && known.matches(problem),
  )
}
