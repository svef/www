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
const RSC_PREFETCH_404: KnownConsoleError = {
  issue: 60,
  why:
    'RSC prefetch of the unprefixed Icelandic path 404s because src/proxy.ts rewrites it. ' +
    'Tracked in svef/www#60.',
  // `/en` is not affected: its toggle points at `/`, which the proxy handles.
  //
  // `/en/frettir` dropped off this list when #56 wired it to Payload: the page
  // is dynamic now, and Next does not prefetch it the same way, so the failing
  // request is never made. The underlying proxy bug is unchanged — it is the
  // prefetch that stopped happening, not the rewrite that got fixed — so #60
  // stays open and the other seven pages still reproduce it.
  urls: {
    '/en/vidburdir': 1,
    '/en/vefverdlaunin': 1,
    '/en/um-svef': 1,
    '/en/skraning': 1,
    '/en/hafa-samband': 1,
    '/en/myndir': 1,
  },
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
