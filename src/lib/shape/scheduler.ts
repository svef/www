/**
 * Everything the shapes on a page share. Client only; created lazily by the first shape.
 *
 * - **Entrance.** Shapes mounting in the same frame are armed together, as the export's
 *   `arm()` does for a page: those already on screen rise 120ms in, 90ms apart in
 *   document order; the rest rise when 20% of them scrolls into view.
 * - **Ambient drift.** One 8s beat for `ambient` shapes (each 900ms after the one
 *   before it) and one 6s beat for `"lively"` ones — two timers in total, not one per
 *   shape. Shapes off screen are skipped, and both timers stop while the tab is hidden.
 * - **Resize.** One ResizeObserver. A shape re-measures 120ms after its width changes.
 *   A height-only change is ignored when the viewport's height changed with it — the
 *   phone address bar showing or hiding mid-scroll, which the export ignores too — and
 *   honoured otherwise (content inside the shape changed size).
 * - **Fonts.** Every shape re-measures when web fonts finish loading.
 * - **Stairs** (`components/Stair`) borrow two things: the on-screen tracking, and a
 *   third beat — one 5s timer that steps every visible stair — plus one shared
 *   IntersectionObserver for "its section head has arrived". Same rules as the shapes:
 *   off-screen ones are skipped and the timer stops while the tab is hidden or motion
 *   is reduced.
 */
import type { ShapeController } from './controller'
import { byDocumentOrder } from './measure'
import {
  AMBIENT_INTERVAL,
  AMBIENT_STAGGER,
  LIVELY_INTERVAL,
  RISE_DELAY,
  RISE_STAGGER,
  RISE_THRESHOLD,
  RISE_VIEWPORT,
  STAIR_INTERVAL,
  STAIR_THRESHOLD,
} from './motion'

const RESIZE_DEBOUNCE = 120

const byElement = new Map<Element, ShapeController>()
const onScreen = new Set<Element>()
const sizes = new WeakMap<Element, { w: number; h: number }>()
const resizeTimers = new Map<Element, ReturnType<typeof setTimeout>>()

let resizeObserver: ResizeObserver | null = null
let riseObserver: IntersectionObserver | null = null
let screenObserver: IntersectionObserver | null = null
let viewportHeight = 0
let started = false

let armQueue: ShapeController[] = []
let armFrame: number | null = null

let calmTimer: ReturnType<typeof setInterval> | null = null
let livelyTimer: ReturnType<typeof setInterval> | null = null
let stairTimer: ReturnType<typeof setInterval> | null = null

const stairs = new Map<Element, () => void>()
const arrivals = new Map<Element, () => void>()
let arrivalObserver: IntersectionObserver | null = null

function start() {
  if (started) return
  started = true
  viewportHeight = window.innerHeight
  document.addEventListener('visibilitychange', syncAmbient)
  const fonts = document.fonts
  if (fonts) {
    fonts.ready.then(refreshAll, () => {})
    fonts.addEventListener?.('loadingdone', refreshAll)
  }
}

// The observers are created on first use, where the browser has them.

function resizeObs(): ResizeObserver | null {
  if (!resizeObserver && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(onResize)
  }
  return resizeObserver
}

function riseObs(): IntersectionObserver | null {
  if (!riseObserver && typeof IntersectionObserver !== 'undefined') {
    // Several thresholds, so a shape taller than five screens (which can never be
    // 20% visible) still rises once a fifth of the screen is filled with it.
    riseObserver = new IntersectionObserver(onRiseEntries, {
      threshold: [0, 0.05, 0.1, 0.15, RISE_THRESHOLD],
    })
  }
  return riseObserver
}

function screenObs(): IntersectionObserver | null {
  if (!screenObserver && typeof IntersectionObserver !== 'undefined') {
    screenObserver = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) onScreen.add(e.target)
        else onScreen.delete(e.target)
      }
    })
  }
  return screenObserver
}

function arrivalObs(): IntersectionObserver | null {
  if (!arrivalObserver && typeof IntersectionObserver !== 'undefined') {
    arrivalObserver = new IntersectionObserver(onArrivals, {
      threshold: [0, 0.05, 0.1, 0.15, STAIR_THRESHOLD],
    })
  }
  return arrivalObserver
}

function refreshAll() {
  byElement.forEach((c) => c.refresh())
}

export function register(c: ShapeController): void {
  start()
  byElement.set(c.el, c)
  resizeObs()?.observe(c.el)
  screenObs()?.observe(c.el)
  syncAmbient()
}

export function unregister(c: ShapeController): void {
  if (byElement.get(c.el) !== c) return
  byElement.delete(c.el)
  onScreen.delete(c.el)
  resizeObserver?.unobserve(c.el)
  screenObserver?.unobserve(c.el)
  riseObserver?.unobserve(c.el)
  const t = resizeTimers.get(c.el)
  if (t) clearTimeout(t)
  resizeTimers.delete(c.el)
  armQueue = armQueue.filter((q) => q !== c)
  syncAmbient()
}

// ---------- entrance ----------

export function arm(c: ShapeController): void {
  start()
  if (!riseObs()) {
    // no IntersectionObserver: show everything, as the export does
    c.rise()
    return
  }
  armQueue.push(c)
  if (armFrame === null) armFrame = requestAnimationFrame(flushArm)
}

function flushArm() {
  armFrame = null
  const queue = armQueue.filter((c) => c.el.isConnected && byElement.get(c.el) === c)
  armQueue = []
  queue.sort((a, b) => byDocumentOrder(a.el, b.el))
  queue.forEach((c, i) => {
    const r = c.el.getBoundingClientRect()
    if (r.top < window.innerHeight * RISE_VIEWPORT && r.bottom > 0) {
      c.later(() => c.rise(), RISE_DELAY + i * RISE_STAGGER)
    } else riseObs()?.observe(c.el)
  })
}

function onRiseEntries(entries: IntersectionObserverEntry[]) {
  for (const e of entries) {
    if (!e.isIntersecting) continue
    const root = e.rootBounds?.height ?? window.innerHeight
    if (
      e.intersectionRatio < RISE_THRESHOLD &&
      e.intersectionRect.height < root * RISE_THRESHOLD
    ) {
      continue
    }
    riseObserver?.unobserve(e.target)
    byElement.get(e.target)?.rise()
  }
}

// ---------- resize ----------

function onResize(entries: ResizeObserverEntry[]) {
  const vh = window.innerHeight
  const viewportMoved = vh !== viewportHeight
  viewportHeight = vh
  for (const e of entries) {
    const el = e.target as HTMLElement
    const box = e.borderBoxSize?.[0]
    const w = box ? box.inlineSize : el.offsetWidth
    const h = box ? box.blockSize : el.offsetHeight
    const prev = sizes.get(el)
    sizes.set(el, { w, h })
    if (!prev) continue // the observation every element gets on observe(); it was just painted
    const widthChanged = Math.abs(prev.w - w) >= 0.5
    const heightChanged = Math.abs(prev.h - h) >= 0.5
    if (!widthChanged && !(heightChanged && !viewportMoved)) continue
    const c = byElement.get(el)
    if (!c) continue
    const t = resizeTimers.get(el)
    if (t) clearTimeout(t)
    resizeTimers.set(
      el,
      setTimeout(() => {
        resizeTimers.delete(el)
        c.refresh()
      }, RESIZE_DEBOUNCE),
    )
  }
}

// ---------- ambient ----------

/** Shapes that may drift now: ambient, on screen, laid out. In document order. */
function ambientNow(kind: 'calm' | 'lively'): ShapeController[] {
  const out: ShapeController[] = []
  byElement.forEach((c) => {
    if (c.config.ambient !== kind) return
    if (screenObserver && !onScreen.has(c.el)) return
    if (c.el.offsetParent === null) return
    out.push(c)
  })
  return out.sort((a, b) => byDocumentOrder(a.el, b.el))
}

function calmBeat() {
  if (document.hidden) return
  ambientNow('calm').forEach((c, i) => c.later(() => c.drift(), i * AMBIENT_STAGGER))
}

function livelyBeat() {
  if (document.hidden) return
  ambientNow('lively').forEach((c) => c.drift())
}

/** Runs the two beats only while some shape is ambient and the tab is visible. */
function syncAmbient() {
  let calm = false
  let lively = false
  byElement.forEach((c) => {
    if (c.config.ambient === 'calm') calm = true
    if (c.config.ambient === 'lively') lively = true
  })
  // under reduced motion nothing drifts or steps, so nothing needs to tick
  const reduce =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const visible = !document.hidden && !reduce
  if (calm && visible) calmTimer ??= setInterval(calmBeat, AMBIENT_INTERVAL)
  else if (calmTimer) {
    clearInterval(calmTimer)
    calmTimer = null
  }
  if (lively && visible) livelyTimer ??= setInterval(livelyBeat, LIVELY_INTERVAL)
  else if (livelyTimer) {
    clearInterval(livelyTimer)
    livelyTimer = null
  }
  if (stairs.size > 0 && visible) stairTimer ??= setInterval(stairBeat, STAIR_INTERVAL)
  else if (stairTimer) {
    clearInterval(stairTimer)
    stairTimer = null
  }
}

// ---------- stairs ----------

/** Hosts a stair on the ambient beat: `step` runs each beat while the stair is on screen. */
export function registerStair(el: Element, step: () => void): void {
  start()
  stairs.set(el, step)
  screenObs()?.observe(el)
  syncAmbient()
}

export function unregisterStair(el: Element): void {
  if (!stairs.delete(el)) return
  onScreen.delete(el)
  screenObserver?.unobserve(el)
  syncAmbient()
}

function stairBeat() {
  if (document.hidden) return
  stairs.forEach((step, el) => {
    if (screenObserver && !onScreen.has(el)) return
    if ((el as HTMLElement).offsetParent === null) return
    step()
  })
}

/**
 * Calls `cb` once, when `el` (a stair's section head) has arrived: a quarter of it, or
 * a quarter of the screen for a very tall one, is in view. Without an
 * IntersectionObserver it arrives at once, as the export's shapes do.
 */
export function onArrival(el: Element, cb: () => void): () => void {
  const obs = arrivalObs()
  if (!obs) {
    cb()
    return () => {}
  }
  arrivals.set(el, cb)
  obs.observe(el)
  return () => {
    arrivals.delete(el)
    arrivalObserver?.unobserve(el)
  }
}

function onArrivals(entries: IntersectionObserverEntry[]) {
  for (const e of entries) {
    if (!e.isIntersecting) continue
    const root = e.rootBounds?.height ?? window.innerHeight
    if (
      e.intersectionRatio < STAIR_THRESHOLD &&
      e.intersectionRect.height < root * STAIR_THRESHOLD
    ) {
      continue
    }
    const cb = arrivals.get(e.target)
    arrivals.delete(e.target)
    arrivalObserver?.unobserve(e.target)
    cb?.()
  }
}

export function ambientChanged(): void {
  if (started) syncAmbient()
}

/** For tests: whether the stair beat is running. */
export function _stairTimerCount(): number {
  return stairTimer ? 1 : 0
}

/** For tests: how many ambient timers are running. */
export function _ambientTimerCount(): number {
  return (calmTimer ? 1 : 0) + (livelyTimer ? 1 : 0)
}
