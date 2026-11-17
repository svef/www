/**
 * Pure maths for the stair dividers: param-driven stepped polygons, ported from the
 * export's `STAIRS` table, `polyOf` and the ambient beat.
 *
 * A stair is a polygon whose vertices are functions of a few named parameters (in % of
 * its box). The resting values are `p`; every ambient beat one parameter is moved to a
 * new spot within `±r × 0.9` of its resting value, so the staircase keeps stepping
 * without ever wandering far from the designed shape.
 */
import type { Rng } from '@/lib/shape/random'

export type StairPreset = 'pink' | 'yellow' | 'red' | 'violet'
export type StairValues = Readonly<Record<string, number>>
export type Point = readonly [number, number]

export interface StairDef {
  /** Resting value of every parameter, % of the box. */
  p: StairValues
  /** How far each parameter may wander from its resting value, in %-points. */
  r: StairValues
  /** The outline for a set of parameter values, % of the box. */
  pts: (v: StairValues) => Point[]
}

export const STAIRS: Record<StairPreset, StairDef> = {
  pink: {
    p: { A: 35.5, B: 15, C: 57.7, D: 44, E: 46.3, F: 70, G: 5, H: 60, I: 20.6, J: 22.5 },
    r: { A: 4, B: 5, C: 1.2, D: 6, E: 2, F: 6, G: 2, H: 6, I: 4, J: 5 },
    pts: (v) => [
      [v.A, 0],
      [100, 0],
      [100, v.B],
      [v.C, v.B],
      [v.C, v.D],
      [v.E, v.D],
      [v.E, 100],
      [0, 100],
      [0, v.F],
      [v.G, v.F],
      [v.G, v.H],
      [v.I, v.H],
      [v.I, v.J],
      [v.A, v.J],
    ],
  },
  yellow: {
    p: {
      K: 5,
      L: 15,
      M: 60,
      N: 8,
      O: 50,
      P: 83.5,
      Q: 34,
      R: 25.6,
      S: 17.4,
      T: 10.9,
      U: 13.3,
    },
    r: { K: 4, L: 5, M: 6, N: 5, O: 6, P: 3, Q: 5, R: 1.2, S: 4, T: 3, U: 3 },
    pts: (v) => [
      [0, v.K],
      [v.L, v.K],
      [v.L, 0],
      [v.M, 0],
      [v.M, v.N],
      [100, v.N],
      [100, v.O],
      [v.P, v.O],
      [v.P, v.Q],
      [v.R, v.Q],
      [v.R, v.S],
      [v.T, v.S],
      [v.T, v.U],
      [0, v.U],
    ],
  },
  red: {
    p: {
      a: 7,
      b: 22,
      c: 64,
      d: 10,
      e: 67,
      f: 86.2,
      g: 39.8,
      h: 78.6,
      i: 20.6,
      j: 34.2,
      k: 31.4,
      l: 7,
      m: 87.8,
    },
    r: {
      a: 4,
      b: 6,
      c: 6,
      d: 5,
      e: 6,
      f: 3,
      g: 5,
      h: 1.2,
      i: 4,
      j: 5,
      k: 4,
      l: 1.5,
      m: 5,
    },
    pts: (v) => [
      [0, v.a],
      [v.b, v.a],
      [v.b, 0],
      [v.c, 0],
      [v.c, v.d],
      [100, v.d],
      [100, v.e],
      [v.f, v.e],
      [v.f, v.g],
      [v.h, v.g],
      [v.h, v.i],
      [v.j, v.i],
      [v.j, v.k],
      [v.l, v.k],
      [v.l, v.m],
      [0, v.m],
    ],
  },
  violet: {
    p: { a: 24, b: 7, c: 33, d: 20, e: 90, f: 62 },
    r: { a: 8, b: 4, c: 5, d: 6, e: 3, f: 8 },
    pts: (v) => [
      [100, v.a],
      [100 - v.b, v.a],
      [100 - v.b, 0],
      [100 - v.c, 0],
      [100 - v.c, v.d],
      [100 - v.e, v.d],
      [100 - v.e, v.f],
      [0, v.f],
      [0, 100],
      [100, 100],
    ],
  },
}

export const STAIR_PRESETS = Object.keys(STAIRS) as StairPreset[]

/** The export's `polyOf`: points as a CSS `polygon()`, two decimals. */
export function toPolygon(pts: readonly Point[]): string {
  return (
    'polygon(' + pts.map((p) => `${p[0].toFixed(2)}% ${p[1].toFixed(2)}%`).join(',') + ')'
  )
}

/** The resting outline of a preset as a `clip-path`. */
export function restingPolygon(preset: StairPreset): string {
  const def = STAIRS[preset]
  return toPolygon(def.pts(def.p))
}

/**
 * One ambient beat: one parameter, picked at random, moves to a new spot within
 * `±range × 0.9` of its resting value. Returns new values; the input is untouched.
 * Draws two numbers from `rng`, in the export's order (which parameter, then where).
 */
export function stepStair(
  preset: StairPreset,
  values: StairValues,
  rng: Rng,
): StairValues {
  const def = STAIRS[preset]
  const keys = Object.keys(def.r)
  const k = keys[Math.floor(rng() * keys.length)]
  return { ...values, [k]: def.p[k] + (rng() * 2 - 1) * def.r[k] * 0.9 }
}
