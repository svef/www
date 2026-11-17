/**
 * Band inset: every full-width band and stair pulls in from both edges (24px, 12px on
 * phones) as you scroll past where it first sits. Ported from the export's "pattern
 * inset" block.
 *
 * - **One passive listener for all of them.** A single `scroll` and `resize` listener
 *   (both passive), attached when the first element registers and removed with the
 *   last. Handlers only request an animation frame; the work happens in it.
 * - **Eased.** Each element chases its target by 7% a frame, so a fast scroll glides
 *   instead of snapping. The loop stops once everything has settled.
 * - **Native scrolling is never touched**: nothing here calls `preventDefault`, moves
 *   the scroll position or hooks wheel/touch events.
 * - **Reduced motion**: no listener and no inset; the element keeps its full width.
 *
 * The value is written as `--hin` (px) on the element; `inset-mask` in
 * `styles/_mixins.scss` turns it into the mask.
 */

export const INSET_DESKTOP = 24
export const INSET_PHONE = 12
/** Viewports narrower than this count as phones. */
export const INSET_PHONE_MAX = 700
/** Scroll distance over which the inset grows from 0 to full, px. */
export const INSET_RANGE = 320
/** Share of the remaining distance covered each frame. */
export const INSET_EASE = 0.07
/** Closer than this to the target, the value snaps to it. */
export const INSET_SNAP = 0.05
/** Elements further than this from the viewport are skipped, px. */
export const INSET_MARGIN = 300

/** Full inset for a viewport width. */
export function insetMax(viewportWidth: number): number {
  return viewportWidth < INSET_PHONE_MAX ? INSET_PHONE : INSET_DESKTOP
}

/**
 * Where an element's inset should be: 0 until the scroll position reaches the point
 * where it first sits (its document top minus 75% of the viewport), then growing
 * linearly over `INSET_RANGE` px of scrolling.
 */
export function insetTarget(
  scrollY: number,
  docTop: number,
  viewportHeight: number,
  max: number,
): number {
  const start = Math.max(0, docTop - viewportHeight * 0.75)
  const p = Math.min(1, Math.max(0, (scrollY - start) / INSET_RANGE))
  return max * p
}

/** One frame of easing toward `target`; snaps when close. Returns the new value and whether it is still moving. */
export function easeInset(
  value: number,
  target: number,
): { value: number; moving: boolean } {
  const next = value + (target - value) * INSET_EASE
  if (Math.abs(target - next) < INSET_SNAP) return { value: target, moving: false }
  return { value: next, moving: true }
}

export interface InsetOptions {
  /**
   * Another element whose position decides when the inset starts. The export's intro
   * band follows the hero's staircase this way, so the two pull in together.
   */
  anchor?: () => HTMLElement | null | undefined
}

interface Entry {
  anchor?: InsetOptions['anchor']
  value: number
}

const entries = new Map<HTMLElement, Entry>()
let frame: number | null = null
let attached = false

const prefersReducedMotion = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

function request() {
  if (frame === null) frame = requestAnimationFrame(tick)
}

function tick() {
  frame = null
  const vh = window.innerHeight
  const max = insetMax(window.innerWidth)
  let moving = false
  entries.forEach((entry, el) => {
    if (!el.offsetParent) return
    const own = el.getBoundingClientRect()
    if (own.bottom < -INSET_MARGIN || own.top > vh + INSET_MARGIN) return
    const ref = entry.anchor?.() ?? el
    const docTop = ref.getBoundingClientRect().top + window.scrollY
    const target = insetTarget(window.scrollY, docTop, vh, max)
    const step = easeInset(entry.value, target)
    entry.value = step.value
    if (step.moving) moving = true
    el.style.setProperty('--hin', step.value.toFixed(2) + 'px')
  })
  if (moving) request()
}

function attach() {
  if (attached) return
  attached = true
  window.addEventListener('scroll', request, { passive: true })
  window.addEventListener('resize', request, { passive: true })
}

function detach() {
  if (!attached) return
  attached = false
  window.removeEventListener('scroll', request)
  window.removeEventListener('resize', request)
  if (frame !== null) cancelAnimationFrame(frame)
  frame = null
}

/** Opts an element into the inset. Returns the function that opts it out again. */
export function registerInset(el: HTMLElement, options: InsetOptions = {}): () => void {
  if (prefersReducedMotion()) return () => {}
  entries.set(el, { anchor: options.anchor, value: 0 })
  attach()
  request()
  return () => {
    entries.delete(el)
    el.style.removeProperty('--hin')
    if (entries.size === 0) detach()
  }
}

/** For tests: how many elements are registered. */
export function _insetCount(): number {
  return entries.size
}
