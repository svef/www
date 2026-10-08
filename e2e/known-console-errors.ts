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

// Empty, and worth keeping that way.
//
// The one entry this list ever held was svef/www#60: every English page logged
// a 404 for the RSC prefetch of its own language toggle. Turning off
// `experimental.optimisticRouting` fixed it, the guard test below went red, and
// the entry was deleted — which is the whole point of the guard.

export const KNOWN_CONSOLE_ERRORS: readonly KnownConsoleError[] = []

export function findKnownConsoleError(
  url: string,
  problem: PageProblem,
): KnownConsoleError | undefined {
  return KNOWN_CONSOLE_ERRORS.find(
    (known) => url in known.urls && known.matches(problem),
  )
}
