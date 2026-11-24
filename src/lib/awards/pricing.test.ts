import { describe, expect, it } from 'vitest'
import { CATEGORIES, EDITION_2026 } from './categories'
import { earlyBirdPrice, priceFor } from './pricing'

describe('earlyBirdPrice', () => {
  it.each([
    [2900, 1900],
    [9900, 6900],
    [14900, 10900],
    [26900, 18900],
    [38900, 26900],
  ])("matches the spec's table: %i -> %i", (regular, early) => {
    expect(earlyBirdPrice(regular, 30, 'nearest-900')).toBe(early)
  })

  it('gives a sensible early price for every category price in the JSON', () => {
    for (const c of CATEGORIES) {
      const early = earlyBirdPrice(
        c.price,
        EDITION_2026.earlyBirdDiscountPercent,
        EDITION_2026.earlyBirdRounding,
      )
      expect(early % 1000, c.slug).toBe(900)
      expect(early, c.slug).toBeLessThan(c.price)
      // within half a thousand of the exact 70%
      expect(Math.abs(early - (c.price * 70) / 100), c.slug).toBeLessThanOrEqual(500)
    }
  })

  it('uses integer arithmetic only', () => {
    for (const c of CATEGORIES)
      expect(Number.isInteger(earlyBirdPrice(c.price, 30))).toBe(true)
  })

  it('rounds to the nearest 900 and breaks ties downwards', () => {
    expect(earlyBirdPrice(10000, 30)).toBe(6900) // 7000: 6900 vs 7900
    expect(earlyBirdPrice(1000, 50)).toBe(900) // 500 -> 900 (the lowest candidate)
    // exact tie: 7400 is midway between 6900 and 7900
    expect(earlyBirdPrice(10000, 26)).toBe(6900)
    expect(earlyBirdPrice(10000, 25)).toBe(7900) // 7500 > 7400: closer to 7900
  })

  it('never exceeds the regular price, and 0 % changes nothing', () => {
    expect(earlyBirdPrice(900, 30)).toBe(900)
    expect(earlyBirdPrice(500, 10)).toBe(500)
    expect(earlyBirdPrice(14900, 0)).toBe(14900)
    expect(earlyBirdPrice(0, 30)).toBe(0)
  })

  it('rejects bad input', () => {
    expect(() => earlyBirdPrice(1.5, 30)).toThrow(RangeError)
    expect(() => earlyBirdPrice(-1, 30)).toThrow(RangeError)
    expect(() => earlyBirdPrice(1000, 101)).toThrow(RangeError)
    expect(() => earlyBirdPrice(1000, 0.5)).toThrow(RangeError)
    expect(() => earlyBirdPrice(1000, 30, 'x' as 'nearest-900')).toThrow(RangeError)
  })
})

describe('priceFor', () => {
  const ed = EDITION_2026 // early bird ends before 2027-01-05T00:00:00Z

  it('is early up to the last millisecond before the bound', () => {
    expect(priceFor('2027-01-04T23:59:59.999Z', ed, 26900)).toEqual({
      tier: 'early',
      priceRegular: 26900,
      discountPercent: 30,
      priceAmount: 18900,
    })
  })

  it('is regular exactly at the bound (exclusive) and after', () => {
    const expected = {
      tier: 'regular',
      priceRegular: 26900,
      discountPercent: 0,
      priceAmount: 26900,
    }
    expect(priceFor('2027-01-05T00:00:00.000Z', ed, 26900)).toEqual(expected)
    expect(priceFor(new Date('2027-01-05T00:00:00.001Z'), ed, 26900)).toEqual(expected)
    expect(priceFor(Date.parse('2027-02-01T12:00:00Z'), ed, 26900)).toEqual(expected)
  })

  it('is early well before; honours a changed percentage', () => {
    expect(priceFor('2026-12-01T00:00:00Z', ed, 9900).priceAmount).toBe(6900)
    expect(
      priceFor('2026-12-02T00:00:00Z', { ...ed, earlyBirdDiscountPercent: 50 }, 9900),
    ).toMatchObject({
      discountPercent: 50,
      priceAmount: 4900,
    })
  })

  it('rejects invalid dates', () => {
    expect(() => priceFor('nope', ed, 1000)).toThrow(RangeError)
  })
})
