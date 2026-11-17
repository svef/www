/**
 * Pure pieces of the shape engine's motion: easing, the corner-by-corner
 * interpolation that drift and the hover morph share, and the drift's random walk.
 */
import { CORNERS, type Corner, type Geometry, type Notches } from './geometry'
import type { Rng } from './random'

/** In-out quart, "like the motion files" (the export's `ease`). */
export function ease(x: number): number {
  return x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2
}

export interface Tween {
  /** Duration of each corner's move, ms. */
  duration: number
  /** Delay between one corner and the next (tl, tr, br, bl), ms. */
  stagger: number
}

/** Slow ambient drift: the free corners slide to new positions one edge at a time. */
export const DRIFT: Tween = { duration: 1900, stagger: 220 }
/** Hover: content notches step open, the same stepped motion, quicker. */
export const MORPH: Tween = { duration: 560, stagger: 70 }

/** Total running time of a tween across all four corners. */
export function tweenLength(t: Tween): number {
  return t.duration + (CORNERS.length - 1) * t.stagger
}

/** Notches `elapsed` ms into a tween from `a` to `b`. */
export function interpolateNotches(
  a: Notches,
  b: Notches,
  elapsed: number,
  t: Tween,
): Notches {
  const out = {} as Record<Corner, [number, number]>
  CORNERS.forEach((k, i) => {
    const e = ease(Math.min(1, Math.max(0, (elapsed - i * t.stagger) / t.duration)))
    out[k] = [a[k][0] + (b[k][0] - a[k][0]) * e, a[k][1] + (b[k][1] - a[k][1]) * e]
  })
  return out
}

export function interpolateGeometry(
  a: Geometry,
  b: Geometry,
  elapsed: number,
  t: Tween,
): Geometry {
  return {
    width: b.width,
    height: b.height,
    notches: interpolateNotches(a.notches, b.notches, elapsed, t),
  }
}

/** Ambient beats, ms. `data-ambient` shapes drift every 8s, staggered 900ms apart; `"lively"` ones every 6s together. */
export const AMBIENT_INTERVAL = 8000
export const AMBIENT_STAGGER = 900
export const LIVELY_INTERVAL = 6000

/** The drift's random walk: every draw moves by up to ±0.2 (±0.3 when lively), clamped to [0, 1]. */
export function walkDraws(draws: readonly number[], rng: Rng, lively: boolean): number[] {
  const span = lively ? 0.6 : 0.4
  return draws.map((v) => Math.min(1, Math.max(0, v + (rng() - 0.5) * span)))
}

/** Entrance timing (the export's `arm()`): shapes already on screen rise 120ms in, 90ms apart. */
export const RISE_DELAY = 120
export const RISE_STAGGER = 90
/** A shape counts as already on screen when its top is above 90% of the viewport. */
export const RISE_VIEWPORT = 0.9
/** Shapes further down rise when 20% of them has scrolled into view. */
export const RISE_THRESHOLD = 0.2

/** Hover morph: text notches open by 40px across (20px down). */
export const MORPH_BREATHE = 40
