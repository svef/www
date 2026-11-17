import { describe, expect, it } from 'vitest'
import { DRIFT, ease, interpolateNotches, MORPH, tweenLength, walkDraws } from './motion'
import { createRng, DRAW_COUNT, initialDraws, toSeed } from './random'
import { PAGE_HEAD_AUTO, pageHeadPreset } from './presets'
import type { Notches } from './geometry'

describe('ease', () => {
  it('is an in-out quart', () => {
    expect(ease(0)).toBe(0)
    expect(ease(0.5)).toBe(0.5)
    expect(ease(1)).toBe(1)
    expect(ease(0.25)).toBeCloseTo(0.03125)
    expect(ease(0.75)).toBeCloseTo(0.96875)
  })
})

describe('interpolateNotches', () => {
  const a: Notches = { tl: [0, 0], tr: [0, 0], br: [0, 0], bl: [0, 0] }
  const b: Notches = { tl: [100, 100], tr: [100, 100], br: [100, 100], bl: [100, 100] }

  it('moves the corners one after another: tl, tr, br, bl', () => {
    const mid = interpolateNotches(a, b, DRIFT.stagger * 2, DRIFT)
    expect(mid.tl[0]).toBeGreaterThan(mid.tr[0])
    expect(mid.tr[0]).toBeGreaterThan(0)
    expect(mid.br).toEqual([0, 0])
    expect(mid.bl).toEqual([0, 0])
  })

  it('lands exactly on the target when the tween is over', () => {
    expect(interpolateNotches(a, b, tweenLength(MORPH), MORPH)).toEqual(b)
    expect(tweenLength(DRIFT)).toBe(1900 + 3 * 220)
  })
})

describe('random', () => {
  it('reproduces the export’s Park–Miller stream for its seed', () => {
    // the export: seed = 11; seed = seed * 16807 % 2147483647; (seed - 1) / 2147483646
    let s = toSeed(11)
    const expected = Array.from({ length: 3 }, () => {
      s = (s * 16807) % 2147483647
      return (s - 1) / 2147483646
    })
    const rng = createRng(11)
    expect([rng(), rng(), rng()]).toEqual(expected)
  })

  it('is deterministic per seed and differs between nearby ids', () => {
    expect(initialDraws(createRng(toSeed('«r1»')))).toEqual(
      initialDraws(createRng(toSeed('«r1»'))),
    )
    expect(toSeed('«r1»')).not.toBe(toSeed('«r2»'))
    const a = createRng(toSeed('«r1»'))()
    const b = createRng(toSeed('«r2»'))()
    expect(Math.abs(a - b)).toBeGreaterThan(0.01)
  })

  it('keeps seeds in the generator’s valid range', () => {
    for (const v of [0, -5, 2147483647, 'x', '', 1.5]) {
      const s = toSeed(v)
      expect(s).toBeGreaterThanOrEqual(1)
      expect(s).toBeLessThanOrEqual(2147483646)
    }
  })

  it('draws eight values in [0, 1]', () => {
    const d = initialDraws(createRng(42))
    expect(d).toHaveLength(DRAW_COUNT)
    d.forEach((v) => expect(v).toBeGreaterThanOrEqual(0))
    d.forEach((v) => expect(v).toBeLessThanOrEqual(1))
  })
})

describe('walkDraws', () => {
  it('moves each draw by at most ±0.2, or ±0.3 when lively, and stays in [0, 1]', () => {
    const rng = createRng(7)
    const from = [0, 1, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]
    for (let i = 0; i < 50; i++) {
      const calm = walkDraws(from, rng, false)
      const lively = walkDraws(from, rng, true)
      calm.forEach((v, j) =>
        expect(Math.abs(v - from[j])).toBeLessThanOrEqual(0.2 + 1e-9),
      )
      lively.forEach((v, j) =>
        expect(Math.abs(v - from[j])).toBeLessThanOrEqual(0.3 + 1e-9),
      )
      ;[...calm, ...lively].forEach((v) => expect(v >= 0 && v <= 1).toBe(true))
    }
  })
})

describe('pageHeadPreset', () => {
  it('rolls one of the export’s corner sets, a lively drift, no cap and a 0–260px title reach', () => {
    for (let s = 1; s < 40; s++) {
      const p = pageHeadPreset(createRng(s))
      expect(PAGE_HEAD_AUTO).toContain(p.auto.join(','))
      expect(p.ambient).toBe('lively')
      expect(p.nocap).toBe(true)
      expect(p.titleDrift).toBeGreaterThanOrEqual(0)
      expect(p.titleDrift).toBeLessThanOrEqual(260)
      expect([undefined, 'lg']).toContain(p.autoSize)
    }
  })

  it('handles a draw of exactly 1', () => {
    expect(pageHeadPreset(() => 1).auto).toEqual(['tr', 'bl', 'br'])
  })
})
