/**
 * Scroll parallax: the export's `data-speed` and its photo drift, on one shared registry.
 *
 * - **Offset** (stickers, `data-speed`): the element is pushed
 *   `(host centre - viewport centre) * speed * 0.5` px, where the host is its parent
 *   (the band it sits on). Written as `--py` for the element's CSS to apply.
 * - **Drift** (`.photo>.shp img`): the image slides up to `amplitude` px (18) over a
 *   viewport of scrolling, `(centre - viewport centre) / viewport height * -amplitude`.
 *   Written as `--drift`.
 * - **One passive listener for all of them** (`scroll-bus`), work done in an animation
 *   frame. Elements off screen are skipped (300px margin for offsets).
 * - **Native scrolling is never touched.** Nothing here calls `preventDefault` or moves
 *   the scroll position.
 * - **Reduced motion**: nothing registers, no listener is attached, the property is never
 *   written, so the element rests where the layout puts it.
 *
 * The registry only writes a custom property; the element's own CSS decides how it moves
 * (`translate: 0 var(--py, 0px)`), so it composes with other transforms.
 */
import { requestScrollFrame, subscribeScroll } from './scroll-bus'

/** Offsets are skipped further than this outside the viewport, px. */
export const PARALLAX_MARGIN = 300
/** Photo drift over one viewport of scrolling, px. */
export const DRIFT_AMPLITUDE = 18
/** The export halves the speed: `* speed * .5`. */
const OFFSET_FACTOR = 0.5

/** Offset in px for a host (`hostTop`, `hostHeight`) in a viewport of `vh`, at `speed`. */
export function parallaxOffset(
  hostTop: number,
  hostHeight: number,
  vh: number,
  speed: number,
): number {
  return (hostTop + hostHeight / 2 - vh / 2) * speed * OFFSET_FACTOR
}

/** Photo drift in px: negative while the image is below the centre, positive above. */
export function parallaxDrift(
  top: number,
  height: number,
  vh: number,
  amplitude = DRIFT_AMPLITUDE,
): number {
  return ((top + height / 2 - vh / 2) / vh) * -amplitude
}

export type ParallaxOptions =
  | { mode?: 'offset'; speed: number }
  | { mode: 'drift'; amplitude?: number }

interface Entry {
  options: ParallaxOptions
}

const entries = new Map<HTMLElement, Entry>()
let unsubscribe: (() => void) | null = null

const prefersReducedMotion = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

function frame() {
  const vh = window.innerHeight
  entries.forEach(({ options }, el) => {
    // Not rendered (display: none, e.g. a sticker hidden on phones): nothing to move.
    if (!el.offsetParent) return
    const host = el.parentElement
    if (!host) return
    const r = host.getBoundingClientRect()
    if (options.mode === 'drift') {
      if (r.bottom < 0 || r.top > vh) return
      const v = parallaxDrift(r.top, r.height, vh, options.amplitude)
      el.style.setProperty('--drift', v.toFixed(1) + 'px')
    } else {
      if (r.bottom < -PARALLAX_MARGIN || r.top > vh + PARALLAX_MARGIN) return
      el.style.setProperty('--py', parallaxOffset(r.top, r.height, vh, options.speed).toFixed(1) + 'px')
    }
  })
}

/**
 * Opts an element into parallax. Returns the function that opts it out (and clears the
 * property). Does nothing under reduced motion, or for a speed of 0.
 */
export function registerParallax(el: HTMLElement, options: ParallaxOptions): () => void {
  if (prefersReducedMotion()) return () => {}
  if (options.mode !== 'drift' && options.speed === 0) return () => {}
  entries.set(el, { options })
  unsubscribe ??= subscribeScroll(frame)
  requestScrollFrame()
  return () => {
    entries.delete(el)
    el.style.removeProperty(options.mode === 'drift' ? '--drift' : '--py')
    if (entries.size === 0) {
      unsubscribe?.()
      unsubscribe = null
    }
  }
}

/** For tests: how many elements are registered. */
export function _parallaxCount(): number {
  return entries.size
}
