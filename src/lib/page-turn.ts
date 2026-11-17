/**
 * The page turn (#138): a stepped block of violet sweeps up over the screen, the page
 * swaps underneath, and the block carries on off the top.
 *
 * It is a View Transition, not a click handler. The App Router starts every navigation
 * (Link click, Back, Forward, `router.push`) inside a React transition; React's
 * `<ViewTransition>` turns that into `document.startViewTransition` at the moment the new
 * page is ready to commit. So the router still owns the click, the scroll position and
 * focus, the sweep never waits for anything and never holds an unready page: if the new
 * route is slow, nothing starts until it arrives. The choreography is CSS, in
 * `styles/page-turn.scss`; the numbers below are the other half of it and must stay in
 * step with that file.
 */

/** Whole sweep, ms. The export's two legs: 520 up, 70 hold, 620 out. */
export const PAGE_TURN_MS = 1210

/**
 * When the swapped-in page is first uncovered, as a fraction of the sweep. The block spans
 * 160vh and rests at -22vh after the first leg, so the screen is fully covered from the
 * end of the first leg (520ms) until the block's lower edge crosses the screen's bottom.
 */
export const PAGE_TURN_SWAP = 520 / PAGE_TURN_MS

/**
 * How long a shape arriving with the new page waits before it rises, so it climbs in as
 * the block leaves instead of finishing behind it. About when the block's lower edge has
 * crossed the bottom of the screen.
 */
export const PAGE_TURN_RISE_HOLD_MS = 760

/** The CSS name of the block's `view-transition-name`. */
export const PAGE_TURN_NAME = 'page-turn'

type Draw = () => number

const pct = (draw: Draw, a: number, b: number) => (a + draw() * (b - a)).toFixed(1)

/**
 * The block's outline, the export's `stepPath()`: a full-width rectangle with a step cut
 * into the top edge and another into the bottom edge, so it reads as the brand's stepped
 * shape rather than a flat wipe. `draw` returns numbers in [0, 1).
 */
export function stepPath(draw: Draw): string {
  const x1 = pct(draw, 18, 38)
  const x2 = pct(draw, 52, 78)
  const t1 = pct(draw, 4, 9)
  const t2 = pct(draw, 0, 3)
  const t3 = pct(draw, 3, 8)
  const b1 = pct(draw, 91, 96)
  const b2 = pct(draw, 97, 100)
  const b3 = pct(draw, 92, 97)
  const x3 = pct(draw, 22, 45)
  const x4 = pct(draw, 58, 82)
  return (
    `polygon(0 ${t1}%,${x1}% ${t1}%,${x1}% ${t2}%,${x2}% ${t2}%,${x2}% ${t3}%,` +
    `100% ${t3}%,100% ${b1}%,${x4}% ${b1}%,${x4}% ${b2}%,${x3}% ${b2}%,${x3}% ${b3}%,0 ${b3}%)`
  )
}

/** What the block looks like before the first roll, so server and client agree. */
export const RESTING_PATH =
  'polygon(0 6%,28% 6%,28% 1%,65% 1%,65% 5%,100% 5%,100% 94%,70% 94%,70% 98%,34% 98%,34% 95%,0 95%)'

export interface PageTurnEnv {
  /** A View Transition is running right now. */
  active: boolean
  /** `prefers-reduced-motion: reduce`. */
  reduced: boolean
}

/**
 * How long content arriving with a navigation should hold its entrance. Nothing when no
 * page turn is covering the screen (reduced motion, a browser without View Transitions, a
 * first load, a navigation React did not animate); otherwise long enough to rise as the
 * block leaves.
 */
export function pageTurnHold({ active, reduced }: PageTurnEnv): number {
  return active && !reduced ? PAGE_TURN_RISE_HOLD_MS : 0
}

/** Reads the environment for `pageTurnHold`; safe on the server and in old browsers. */
export function readPageTurnEnv(): PageTurnEnv {
  if (typeof document === 'undefined') return { active: false, reduced: true }
  const reduced =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  let active = false
  try {
    active =
      Boolean(
        (document as Document & { activeViewTransition?: unknown }).activeViewTransition,
      ) || document.documentElement.matches(':active-view-transition')
  } catch {
    // an engine that does not know the pseudo-class: no View Transitions to wait for
  }
  return { active, reduced }
}
