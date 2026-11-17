import { describe, expect, it } from 'vitest'
import { createRng } from '@/lib/shape/random'
import { restingPolygon, STAIR_PRESETS, STAIRS, stepStair, toPolygon } from './stairs'

describe('stair outlines', () => {
  it('writes points as a polygon(), two decimals', () => {
    expect(
      toPolygon([
        [0, 0],
        [100, 12.3456],
        [5, 100],
      ]),
    ).toBe('polygon(0.00% 0.00%,100.00% 12.35%,5.00% 100.00%)')
  })

  it("matches the export's pink polygon at rest", () => {
    expect(restingPolygon('pink')).toBe(
      'polygon(35.50% 0.00%,100.00% 0.00%,100.00% 15.00%,57.70% 15.00%,57.70% 44.00%,46.30% 44.00%,46.30% 100.00%,0.00% 100.00%,0.00% 70.00%,5.00% 70.00%,5.00% 60.00%,20.60% 60.00%,20.60% 22.50%,35.50% 22.50%)',
    )
  })

  it("matches the export's hero (violet) polygon at rest, built from 100 - x", () => {
    expect(restingPolygon('violet')).toBe(
      'polygon(100.00% 24.00%,93.00% 24.00%,93.00% 0.00%,67.00% 0.00%,67.00% 20.00%,10.00% 20.00%,10.00% 62.00%,0.00% 62.00%,0.00% 100.00%,100.00% 100.00%)',
    )
  })

  it.each(STAIR_PRESETS)(
    '%s has a range for every parameter, and stays inside its box',
    (preset) => {
      const { p, r, pts } = STAIRS[preset]
      expect(Object.keys(r).sort()).toEqual(Object.keys(p).sort())
      const inBox = (v: typeof p) =>
        pts(v).every(([x, y]) => x >= 0 && x <= 100 && y >= 0 && y <= 100)
      expect(inBox(p)).toBe(true)
      // push every parameter to either end of its range at once
      for (const sign of [-1, 1]) {
        const extreme = Object.fromEntries(
          Object.keys(p).map((k) => [k, p[k] + sign * r[k] * 0.9]),
        )
        expect(inBox(extreme)).toBe(true)
      }
    },
  )

  it('keeps the point count whatever the values, so the clip-path can transition', () => {
    for (const preset of STAIR_PRESETS) {
      const { p, r, pts } = STAIRS[preset]
      const moved = { ...p, [Object.keys(r)[0]]: p[Object.keys(r)[0]] + 1 }
      expect(pts(moved)).toHaveLength(pts(p).length)
    }
  })
})

describe('stepStair', () => {
  it.each(STAIR_PRESETS)(
    '%s: moves exactly one parameter, within 0.9 x its range',
    (preset) => {
      const { p, r } = STAIRS[preset]
      const rng = createRng(7)
      let v = p
      for (let i = 0; i < 200; i++) {
        const next = stepStair(preset, v, rng)
        const changed = Object.keys(p).filter((k) => next[k] !== v[k])
        expect(changed.length).toBeLessThanOrEqual(1)
        v = next
        for (const k of Object.keys(p)) {
          // never drifts further from rest than the designed range, however long it runs
          expect(Math.abs(v[k] - p[k])).toBeLessThanOrEqual(r[k] * 0.9 + 1e-9)
        }
      }
    },
  )

  it('does not mutate its input, and is deterministic for a seed', () => {
    const before = { ...STAIRS.pink.p }
    const a = stepStair('pink', STAIRS.pink.p, createRng(3))
    const b = stepStair('pink', STAIRS.pink.p, createRng(3))
    expect(STAIRS.pink.p).toEqual(before)
    expect(a).toEqual(b)
    expect(a).not.toEqual(before)
  })

  it("draws the export's two numbers: which parameter, then where", () => {
    // rng 0.5 → key index floor(0.5 × 10) = 5 ('F' for pink); then 0.25 → (0.5 - 1) × 6 × 0.9
    const seq = [0.5, 0.25]
    const out = stepStair('pink', STAIRS.pink.p, () => seq.shift()!)
    expect(out.F).toBeCloseTo(70 + (0.25 * 2 - 1) * 6 * 0.9)
  })
})
