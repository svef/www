import { describe, expect, it } from 'vitest'
import { formatDate, formatKr, formatNumber, formatTime } from './locale-format'

describe('locale-format', () => {
  it('groups Icelandic numbers with a dot and decimals with a comma, English the other way', () => {
    expect(formatNumber(18900, 'is')).toBe('18.900')
    expect(formatNumber(1234567, 'is')).toBe('1.234.567')
    expect(formatNumber(900, 'is')).toBe('900')
    expect(formatNumber(2.44, 'is', 1)).toBe('2,4')
    expect(formatNumber(18900, 'en')).toBe('18,900')
    expect(formatNumber(2.44, 'en', 1)).toBe('2.4')
  })

  it('writes prices in króna', () => {
    expect(formatKr(18900, 'is')).toBe('18.900 kr.')
    expect(formatKr(26900, 'en')).toBe('26,900 kr.')
  })

  it('writes Icelandic dates without relying on the browser', () => {
    const d = '2027-01-04T14:05:00Z'
    expect(formatDate(d, 'is')).toBe('4. janúar 2027')
    expect(formatDate(d, 'is', { year: false })).toBe('4. janúar')
    expect(formatDate(d, 'is', { time: true })).toBe('4. janúar 2027 kl. 14:05')
    expect(formatDate(d, 'en')).toBe('4 January 2027')
    expect(formatDate(d, 'en', { time: true })).toBe('4 January 2027 at 14:05')
    expect(formatDate('2027-08-31T23:59:00Z', 'is')).toBe('31. ágúst 2027')
    expect(formatDate('not a date', 'is')).toBe('')
  })

  it('reads the time in UTC, 24-hour', () => {
    expect(formatTime('2027-01-04T09:03:00Z')).toBe('09:03')
  })
})
