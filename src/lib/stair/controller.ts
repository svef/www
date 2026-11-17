/**
 * One stair divider: draws its polygon, waits for its section head, then steps one edge
 * per ambient beat. Client only. The beat, the on-screen tracking and the arrival
 * observer are the shape engine's shared scheduler, so a page with several stairs has
 * one timer and one observer between them.
 */
import { createRng, type Rng } from '@/lib/shape/random'
import * as scheduler from '@/lib/shape/scheduler'
import {
  restingPolygon,
  STAIRS,
  stepStair,
  toPolygon,
  type StairPreset,
  type StairValues,
} from './stairs'

/** How long one edge takes to step to its new spot (the export's `1.8s cubic-bezier(.65,0,.35,1)`). */
export const STEP_TRANSITION = 'clip-path 1.8s cubic-bezier(.65,0,.35,1)'

export type StairState = 'pending' | 'in'

export interface StairOptions {
  preset: StairPreset
  /** `false`: the resting shape, no entrance and no stepping (what reduced motion gets). */
  motion: boolean
  /** Holds the entrance and the stepping until true (the hero's stair waits for the loader). */
  revealed: boolean
}

const prefersReducedMotion = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export class StairController {
  private rng: Rng
  private values: StairValues
  private opts: StairOptions
  private arrived = false
  private shown = false
  private stopArrival: (() => void) | null = null

  /**
   * @param el    the polygon element
   * @param head  the section head to wait for, or null for a bare stair that rises at once
   */
  constructor(
    readonly el: HTMLElement,
    readonly head: HTMLElement | null,
    opts: StairOptions,
    seed: number,
  ) {
    this.opts = opts
    this.rng = createRng(seed)
    this.values = STAIRS[opts.preset].p
  }

  private get reduced(): boolean {
    return !this.opts.motion || prefersReducedMotion()
  }

  mount(): void {
    this.el.style.transition = 'none'
    this.el.style.clipPath = restingPolygon(this.opts.preset)
    if (this.reduced) {
      this.shown = true
      this.setState('in')
      return
    }
    scheduler.registerStair(this.el, () => this.step())
    if (this.head) {
      this.setState('pending')
      this.stopArrival = scheduler.onArrival(this.head, () => {
        this.arrived = true
        this.tryShow()
      })
    } else {
      this.arrived = true
      this.tryShow()
    }
  }

  setRevealed(revealed: boolean): void {
    this.opts = { ...this.opts, revealed }
    this.tryShow()
  }

  destroy(): void {
    this.stopArrival?.()
    scheduler.unregisterStair(this.el)
  }

  /** The head's children rise, and the stair starts to step. */
  private tryShow(): void {
    if (this.shown || !this.arrived || !this.opts.revealed) return
    this.shown = true
    this.setState('in')
  }

  /** One beat: one edge moves to a new spot. */
  step(): void {
    if (!this.shown || this.reduced) return
    this.values = stepStair(this.opts.preset, this.values, this.rng)
    this.el.style.transition = STEP_TRANSITION
    this.el.style.clipPath = toPolygon(STAIRS[this.opts.preset].pts(this.values))
  }

  private setState(state: StairState): void {
    this.head?.setAttribute('data-stair-state', state)
    this.el.setAttribute('data-stair-state', state)
  }
}
