/**
 * Stickers shy away from the mouse and spring back when it leaves. Ported from the
 * export's "stickers: nudge away from the mouse".
 *
 * - **Fine pointers only** (`(pointer: fine)`): on touch there is no pointer to avoid, so
 *   nothing registers and no listener is attached.
 * - **One loop for all stickers**, on one set of listeners (`pointermove`, and the
 *   shared scroll bus: a still pointer meets a moving sticker). The loop runs only while
 *   something is still moving and then goes idle.
 * - **Reduced motion**: nothing registers; the sticker stays where it is placed.
 *
 * It writes `--rx`, `--ry` (px) and `--rr` (deg); the sticker's CSS adds them to its
 * position and rotation.
 */
import { subscribeScroll } from './scroll-bus'

/** Beyond this the pointer is ignored: half the larger side, 75%, plus 90px. */
export const SPRING_REACH = 90
/** The push at point-blank range, px. */
export const SPRING_PUSH = 22
/** The tilt, degrees per px pushed. */
export const SPRING_TILT = 0.12
/** Share of the remaining distance covered each frame. */
export const SPRING_EASE = 0.06
/** Closer than this to rest in total, the loop idles. */
export const SPRING_REST = 0.05

export interface SpringTarget {
  x: number
  y: number
  r: number
}

const NONE: SpringTarget = { x: 0, y: 0, r: 0 }

/**
 * Where a sticker wants to be, given the pointer. `box` is its on-screen rect, `offset`
 * is how far the spring has already moved it (so the rest position can be recovered).
 */
export function springTarget(
  box: { left: number; top: number; width: number; height: number },
  offset: { x: number; y: number },
  pointer: { x: number; y: number },
): SpringTarget {
  const cx = box.left + box.width / 2 - offset.x
  const cy = box.top + box.height / 2 - offset.y
  const dx = cx - pointer.x
  const dy = cy - pointer.y
  const d = Math.hypot(dx, dy) || 1
  const reach = Math.max(box.width, box.height) * 0.75 + SPRING_REACH
  if (d >= reach) return NONE
  const f = Math.pow(1 - d / reach, 1.6) * SPRING_PUSH
  return { x: (dx / d) * f, y: (dy / d) * f, r: (dx > 0 ? 1 : -1) * f * SPRING_TILT }
}

interface State extends SpringTarget {
  tx: number
  ty: number
  tr: number
}

const entries = new Map<HTMLElement, State>()
const FAR = -1e4
let pointer = { x: FAR, y: FAR }
let running = false
let attached = false
let unsubscribeScroll: (() => void) | null = null

const matches = (q: string) => typeof window.matchMedia === 'function' && window.matchMedia(q).matches

function tick() {
  let live = false
  entries.forEach((o, el) => {
    if (!el.offsetParent) {
      o.tx = o.ty = o.tr = 0
    } else {
      const t = springTarget(el.getBoundingClientRect(), o, pointer)
      o.tx = t.x
      o.ty = t.y
      o.tr = t.r
    }
    o.x += (o.tx - o.x) * SPRING_EASE
    o.y += (o.ty - o.y) * SPRING_EASE
    o.r += (o.tr - o.r) * SPRING_EASE
    if (Math.abs(o.tx - o.x) + Math.abs(o.ty - o.y) + Math.abs(o.tr - o.r) > SPRING_REST) live = true
    el.style.setProperty('--rx', o.x.toFixed(2) + 'px')
    el.style.setProperty('--ry', o.y.toFixed(2) + 'px')
    el.style.setProperty('--rr', o.r.toFixed(2) + 'deg')
  })
  if (live) requestAnimationFrame(tick)
  else running = false
}

function go() {
  if (running || entries.size === 0) return
  running = true
  requestAnimationFrame(tick)
}

function onMove(e: PointerEvent) {
  pointer = { x: e.clientX, y: e.clientY }
  go()
}

function onLeave() {
  pointer = { x: FAR, y: FAR }
  go()
}

function attach() {
  if (attached) return
  attached = true
  window.addEventListener('pointermove', onMove, { passive: true })
  document.addEventListener('pointerleave', onLeave)
  unsubscribeScroll = subscribeScroll(go)
}

function detach() {
  attached = false
  window.removeEventListener('pointermove', onMove)
  document.removeEventListener('pointerleave', onLeave)
  unsubscribeScroll?.()
  unsubscribeScroll = null
  pointer = { x: FAR, y: FAR }
}

/** Opts a sticker into the spring. Returns the function that opts it out. */
export function registerSpring(el: HTMLElement): () => void {
  if (matches('(prefers-reduced-motion: reduce)') || !matches('(pointer: fine)')) return () => {}
  entries.set(el, { x: 0, y: 0, r: 0, tx: 0, ty: 0, tr: 0 })
  attach()
  return () => {
    entries.delete(el)
    el.style.removeProperty('--rx')
    el.style.removeProperty('--ry')
    el.style.removeProperty('--rr')
    if (entries.size === 0) detach()
  }
}

/** For tests: how many stickers are registered, and whether the loop is running. */
export function _springState(): { count: number; running: boolean } {
  return { count: entries.size, running }
}
