/**
 * Seeded randomness for the shape engine.
 *
 * The export walks one global Park–Miller generator (seed 11) in DOM order, so a
 * shape's corners depend on how many shapes came before it on the page. In React
 * each shape owns its own stream instead, seeded from a stable per-instance value
 * (an explicit `seed` prop, or a hash of `useId()`), so the server and the client
 * draw the same numbers and a shape keeps its form across re-renders.
 *
 * The generator is the export's own: `seed = seed * 16807 mod (2^31 - 1)`.
 */

const MODULUS = 2147483647
const MULTIPLIER = 16807

/** Number of draws a shape keeps: three corner pairs plus the two drift values. */
export const DRAW_COUNT = 8

/** A stateful stream of numbers in [0, 1]. */
export type Rng = () => number

/**
 * Maps any string or number to a valid Park–Miller seed in [1, 2^31 - 2].
 *
 * Strings go through FNV-1a and a final avalanche (murmur3's `fmix32`), so ids
 * that differ by one character — `useId()` values do — still land far apart.
 * That matters: Park–Miller's first draw from two nearby seeds is nearly equal.
 */
export function toSeed(value: string | number): number {
  let h: number
  if (typeof value === 'number' && Number.isFinite(value)) {
    h = Math.floor(Math.abs(value)) >>> 0
  } else {
    h = 0x811c9dc5
    const s = String(value)
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i)
      h = Math.imul(h, 0x01000193)
    }
  }
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  h ^= h >>> 16
  return ((h >>> 0) % (MODULUS - 1)) + 1
}

/** The export's generator, as its own stream. */
export function createRng(seed: number): Rng {
  let state = toSeed(seed)
  return () => {
    state = (state * MULTIPLIER) % MODULUS
    return (state - 1) / (MODULUS - 1)
  }
}

/** The eight per-shape draws the export keeps on `el._r`. */
export function initialDraws(rng: Rng): number[] {
  return Array.from({ length: DRAW_COUNT }, rng)
}
