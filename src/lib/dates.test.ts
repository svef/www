import { describe, it, expect } from 'vitest'
import { formatLongDate, formatMonthYear } from './dates'

describe('formatLongDate', () => {
  it('uses the Icelandic long form the design shows', () => {
    // The design renders this as "22. MAÍ 2026"; the uppercasing is CSS.
    expect(formatLongDate('2026-05-22T12:00:00.000Z', 'is')).toBe('22. maí 2026')
  })

  it('uses the English form for the English site', () => {
    expect(formatLongDate('2026-05-22T12:00:00.000Z', 'en')).toBe('22 May 2026')
  })

  it('is not affected by the machine time zone', () => {
    // Iceland is UTC year-round; a late-evening UTC instant must not roll over.
    expect(formatLongDate('2026-01-15T23:30:00.000Z', 'is')).toBe('15. janúar 2026')
  })

  it('returns an empty string for an unusable date', () => {
    expect(formatLongDate('not a date', 'is')).toBe('')
  })
})

describe('formatMonthYear', () => {
  it('capitalises the Icelandic month, as the design sets it', () => {
    expect(formatMonthYear('2025-03-01T12:00:00.000Z', 'is')).toBe('Mars 2025')
  })

  it('uses the English month for the English site', () => {
    expect(formatMonthYear('2025-03-01T12:00:00.000Z', 'en')).toBe('March 2025')
  })

  it('returns an empty string for an empty or unusable date', () => {
    expect(formatMonthYear(null, 'is')).toBe('')
    expect(formatMonthYear('', 'is')).toBe('')
    expect(formatMonthYear('nope', 'en')).toBe('')
  })
})
