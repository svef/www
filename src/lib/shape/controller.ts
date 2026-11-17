/**
 * One shape on the page: measures, paints and animates it. Client only.
 *
 * The export kept this state on the element (`el._r`, `el._g`, `el._ex`, `el._rising`);
 * here it lives on a controller the `useShape` hook owns. Shared concerns — the
 * entrance observer, the resize observer, the ambient beat — are in `scheduler.ts`,
 * so a page with forty shapes still has one of each.
 */
import {
  barOffset,
  computeGeometry,
  markLeft,
  polygonPoints,
  resolveAuto,
  toClipPath,
  type Corner,
  type Geometry,
} from './geometry'
import { ATTR, markEntrance, readNotches, readText } from './measure'
import {
  DRIFT,
  interpolateGeometry,
  MORPH,
  MORPH_BREATHE,
  tweenLength,
  walkDraws,
  type Tween,
} from './motion'
import { createRng, initialDraws, type Rng } from './random'
import * as scheduler from './scheduler'

export interface ShapeConfig {
  auto: readonly Corner[]
  autoMobile?: readonly Corner[]
  autoSize?: 'lg'
  pad?: number
  breathe?: number
  /** A band: bottom decorative notches are capped to its bottom padding. */
  capped: boolean
  nocap: boolean
  ambient: false | 'calm' | 'lively'
  morphOnHover: boolean
  /** Extra wait before the entrance (the export's `_hold`), ms. */
  riseDelay: number
  /** `false` draws the resting shape with no motion at all, as reduced motion does. */
  motion: boolean
  revealHeadings: boolean
}

export type ShapeState = 'pending' | 'in'

const prefersReducedMotion = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export class ShapeController {
  readonly el: HTMLElement
  config: ShapeConfig
  state: ShapeState = 'in'

  private rng: Rng
  private draws: number[]
  private expand: [number, number] = [0, 0]
  /** Set by the hover morph; replaces the configured breathe from then on, as in the export. */
  private hoverBreathe: number | null = null
  private hold: number
  /** The shape at rest (the export's `el._g`). */
  private resting: Geometry | null = null
  /** What is on screen now, mid-animation included. */
  private painted: Geometry | null = null
  private frame: number | null = null
  private dirty = false
  private timers = new Set<ReturnType<typeof setTimeout>>()
  private cleanup: (() => void)[] = []

  constructor(el: HTMLElement, config: ShapeConfig, seed: number) {
    this.el = el
    this.config = config
    this.rng = createRng(seed)
    this.draws = initialDraws(this.rng)
    this.hold = config.riseDelay
  }

  get reduced(): boolean {
    return !this.config.motion || prefersReducedMotion()
  }

  get animating(): boolean {
    return this.frame !== null
  }

  /** Called once, before the first paint after the element is in the DOM. */
  mount(): void {
    markEntrance(this.el, this.config.revealHeadings)
    if (this.reduced) {
      this.setState('in')
      this.final()
    } else {
      // the export's arm(): hidden content, resting shape, then rise
      this.setState('pending')
      this.final()
      scheduler.arm(this)
    }
    scheduler.register(this)
    if (this.config.morphOnHover) this.bindHover()
  }

  destroy(): void {
    this.cancel()
    this.timers.forEach(clearTimeout)
    this.timers.clear()
    this.cleanup.forEach((f) => f())
    this.cleanup = []
    scheduler.unregister(this)
  }

  update(config: ShapeConfig): void {
    const hoverChanged = config.morphOnHover !== this.config.morphOnHover
    this.config = config
    if (hoverChanged) {
      this.cleanup.forEach((f) => f())
      this.cleanup = []
      if (config.morphOnHover) this.bindHover()
    }
    scheduler.ambientChanged()
    this.refresh()
  }

  /** setTimeout that dies with the shape. */
  later(fn: () => void, ms: number): void {
    const id = setTimeout(() => {
      this.timers.delete(id)
      fn()
    }, ms)
    this.timers.add(id)
  }

  private setState(s: ShapeState) {
    this.state = s
    this.el.setAttribute(ATTR.state, s)
  }

  /** Reads the DOM and computes the shape for the current draws and options. */
  measure(): Geometry | null {
    const el = this.el
    const W = el.offsetWidth
    const H = el.offsetHeight
    if (!W || !H) return null
    const vw = window.innerWidth
    const c = this.config
    return computeGeometry({
      width: W,
      height: H,
      auto: resolveAuto(c.auto, c.autoMobile, vw),
      draws: this.draws,
      pad: c.pad,
      autoSize: c.autoSize,
      capped: c.capped,
      nocap: c.nocap,
      paddingBottom: c.capped ? parseFloat(getComputedStyle(el).paddingBottom) || 0 : 0,
      breathe: this.hoverBreathe ?? c.breathe ?? 0,
      expand: this.expand,
      notches: readNotches(el, vw),
      text: readText(el),
    })
  }

  /** Draws the resting shape now (or as soon as a running animation ends). */
  final(): void {
    if (this.animating) {
      this.dirty = true
      return
    }
    markEntrance(this.el, this.config.revealHeadings)
    const g = this.measure()
    if (!g) return
    this.resting = g
    this.paint(g)
    this.placeMark(g)
  }

  /** Re-measure after a resize, a font swap or an option change. */
  refresh(): void {
    this.final()
  }

  private layer(): HTMLElement | null {
    return this.el.querySelector<HTMLElement>(`:scope > [${ATTR.layer}]`)
  }

  private paint(g: Geometry): void {
    this.painted = g
    const layer = this.layer()
    if (layer) layer.style.clipPath = toClipPath(polygonPoints(g))
    this.placeBars(g)
    if (!this.el.hasAttribute(ATTR.painted)) this.el.setAttribute(ATTR.painted, '')
  }

  private placeBars(g: Geometry): void {
    this.el.querySelectorAll<HTMLElement>(`:scope > [${ATTR.bar}]`).forEach((b) => {
      const at = barOffset(g.notches, g.width, g.height, {
        width: b.offsetWidth,
        height: b.offsetHeight,
      })
      if (at) {
        b.style.translate = `${at.x.toFixed(1)}px ${at.y.toFixed(1)}px`
        b.style.visibility = ''
      } else b.style.visibility = 'hidden'
    })
  }

  private placeMark(g: Geometry): void {
    const m = this.el.querySelector<HTMLElement>(`:scope > [${ATTR.mark}]`)
    if (m) m.style.left = `${markLeft(g)}px`
  }

  /** Entrance: content reveals over the resting shape (the export no longer grows the shape in). */
  rise(): void {
    if (this.hold > 0) {
      const d = this.hold
      this.hold = 0
      this.later(() => this.rise(), d)
      return
    }
    if (this.state === 'in') return
    this.setState('in')
    this.final()
  }

  /** Ambient drift: new draws, then the corners slide over one edge at a time. */
  drift(): void {
    if (this.reduced || this.state === 'pending' || this.animating || !this.resting)
      return
    this.draws = walkDraws(this.draws, this.rng, this.config.ambient === 'lively')
    if (this.hoverBreathe ?? this.config.breathe) this.expand = [this.rng(), this.rng()]
    const target = this.measure()
    if (target) this.tween(target, DRIFT)
  }

  /** Hover: text notches step open by 40px, and back. */
  morph(on: boolean): void {
    if (this.reduced || this.state === 'pending' || !this.resting) return
    this.hoverBreathe = on ? MORPH_BREATHE : 0
    this.expand = on ? [1, 1] : [0, 0]
    const target = this.measure()
    if (target) this.tween(target, MORPH)
  }

  private tween(to: Geometry, t: Tween): void {
    const from = this.painted ?? this.resting
    this.cancel()
    if (!from) return
    const t0 = performance.now()
    const length = tweenLength(t)
    const tick = (now: number) => {
      const elapsed = now - t0
      this.paint(interpolateGeometry(from, to, elapsed, t))
      if (elapsed < length) {
        this.frame = requestAnimationFrame(tick)
        return
      }
      this.frame = null
      this.resting = to
      if (this.dirty) {
        this.dirty = false
        this.final()
      }
    }
    tick(t0)
  }

  private cancel(): void {
    if (this.frame !== null) cancelAnimationFrame(this.frame)
    this.frame = null
  }

  private bindHover(): void {
    const el = this.el
    const enter = () => this.morph(true)
    const leave = () => this.morph(false)
    // keyboard focus opens the card like the pointer does
    const focusIn = (e: FocusEvent) => {
      if (!el.contains(e.relatedTarget as Node | null)) enter()
    }
    const focusOut = (e: FocusEvent) => {
      if (!el.contains(e.relatedTarget as Node | null) && !el.matches(':hover')) leave()
    }
    el.addEventListener('mouseenter', enter)
    el.addEventListener('mouseleave', leave)
    el.addEventListener('focusin', focusIn)
    el.addEventListener('focusout', focusOut)
    this.cleanup.push(() => {
      el.removeEventListener('mouseenter', enter)
      el.removeEventListener('mouseleave', leave)
      el.removeEventListener('focusin', focusIn)
      el.removeEventListener('focusout', focusOut)
    })
  }
}
