import { describe, it, expect } from 'vitest'
import {
  formatDayBadge,
  formatPrice,
  formatShortDate,
  formatTime,
  formatTimeRange,
  memberDiscountPercent,
} from './event-format'

// 2026-10-09T20:00Z — Klúðurkvöld in the dev fixtures.
const OCT_9 = '2026-10-09T20:00:00.000Z'
// The awards night, which runs past midnight.
const AWARDS_START = '2026-11-14T19:30:00.000Z'
const AWARDS_END = '2026-11-15T01:00:00.000Z'

describe('formatDayBadge', () => {
  it('splits a date into the badge halves', () => {
    expect(formatDayBadge(OCT_9, 'is')).toEqual({ day: '09', month: 'okt' })
  })

  it('drops the full stop Icelandic puts on an abbreviated month', () => {
    // The design draws "09 OKT"; "okt." uppercased reads as a sentence ending.
    expect(formatDayBadge('2026-09-05T13:00:00.000Z', 'is').month).toBe('sep')
  })

  it('pads the day to two digits, for the fixed-width badge', () => {
    expect(formatDayBadge('2026-09-05T13:00:00.000Z', 'is').day).toBe('05')
  })

  it('localises the month name', () => {
    expect(formatDayBadge(OCT_9, 'en')).toEqual({ day: '09', month: 'Oct' })
  })

  it('returns empty strings rather than "Invalid Date" for a bad value', () => {
    expect(formatDayBadge('not a date', 'is')).toEqual({ day: '', month: '' })
  })
})

describe('formatShortDate', () => {
  it('reads as the past-event cards in the design do', () => {
    expect(formatShortDate('2026-03-13T12:00:00.000Z', 'is')).toBe('13. mar 2026')
  })

  it('keeps the ordinal stop after the day number', () => {
    // Only the month's abbreviation stop goes; "13." is Icelandic ordinal
    // punctuation and removing it would be wrong.
    expect(formatShortDate('2026-05-22T12:00:00.000Z', 'is')).toBe('22. maí 2026')
  })

  it('localises', () => {
    expect(formatShortDate('2026-03-13T12:00:00.000Z', 'en')).toBe('13 Mar 2026')
  })
})

describe('formatTime', () => {
  it('is the clock time, 24-hour', () => {
    expect(formatTime(OCT_9)).toBe('20:00')
  })

  it('is empty rather than "Invalid Date" for a bad value', () => {
    expect(formatTime('not a date')).toBe('')
  })
})

describe('formatTimeRange', () => {
  it('gives the start time alone when there is no end', () => {
    expect(formatTimeRange(OCT_9, null)).toBe('20:00')
  })

  it('gives a spaced em dash range, as the export draws it', () => {
    expect(formatTimeRange(AWARDS_START, AWARDS_END)).toBe('19:30 — 01:00')
  })

  it('is 24-hour in both locales', () => {
    // The English site is read by people turning up at an Icelandic venue.
    expect(formatTimeRange(OCT_9, null)).not.toMatch(/[ap]m/i)
  })

  it('is fixed to UTC, so a build machine elsewhere renders the same time', () => {
    expect(formatTimeRange('2026-10-09T20:00:00.000Z', null)).toBe('20:00')
  })
})

describe('formatPrice', () => {
  it('formats krónur the way the design prints them', () => {
    // `Intl` separates the amount from the unit with a no-break space (U+00A0),
    // which is correct typography and invisible in a diff — normalised here so
    // the assertion is about the number and the unit, not the byte between.
    expect(formatPrice(18900, 'is')?.replace(/\u00a0/g, ' ')).toBe('18.900 kr.')
  })

  it('has no minor units', () => {
    expect(formatPrice(15120, 'is')).not.toContain(',00')
  })

  it('returns null for a missing price rather than claiming it is free', () => {
    expect(formatPrice(null, 'is')).toBeNull()
    expect(formatPrice(undefined, 'is')).toBeNull()
  })

  it('formats zero, which is a price and not a missing one', () => {
    expect(formatPrice(0, 'is')).toContain('0')
  })
})

describe('memberDiscountPercent', () => {
  it('derives the 20% in the design from the two prices', () => {
    expect(memberDiscountPercent(18900, 15120)).toBe(20)
  })

  it('rounds to a whole percent', () => {
    expect(memberDiscountPercent(10000, 8333)).toBe(17)
  })

  it('is null when there is no discount to announce', () => {
    expect(memberDiscountPercent(18900, 18900)).toBeNull()
    expect(memberDiscountPercent(18900, null)).toBeNull()
    expect(memberDiscountPercent(null, 15120)).toBeNull()
    // A member price *above* the full price is a data error, not a -20% offer.
    expect(memberDiscountPercent(18900, 20000)).toBeNull()
  })

  it('is null when the difference rounds away to nothing', () => {
    expect(memberDiscountPercent(10000, 9999)).toBeNull()
  })
})
