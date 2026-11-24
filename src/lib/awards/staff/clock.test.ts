import { describe, expect, it } from 'vitest'
import { serverNow } from './clock'

describe('serverNow', () => {
  it('is the real time by default', () => {
    const before = Date.now()
    const now = serverNow({}).getTime()
    expect(now).toBeGreaterThanOrEqual(before)
    expect(now).toBeLessThan(before + 1000)
  })

  it('honours the override outside Vercel production', () => {
    expect(serverNow({ AWARDS_CLOCK_NOW: '2027-03-01T00:00:00Z' }).toISOString()).toBe(
      '2027-03-01T00:00:00.000Z',
    )
    expect(
      serverNow({ AWARDS_CLOCK_NOW: '2027-03-01T00:00:00Z', VERCEL_ENV: 'preview' }).getFullYear(),
    ).toBe(2027)
  })

  it('ignores the override on Vercel production, and a malformed one', () => {
    expect(
      serverNow({ AWARDS_CLOCK_NOW: '2027-03-01T00:00:00Z', VERCEL_ENV: 'production' }).getFullYear(),
    ).toBeGreaterThanOrEqual(new Date().getFullYear())
    expect(serverNow({ AWARDS_CLOCK_NOW: 'soon' }).getTime()).toBeLessThan(Date.now() + 1000)
  })
})
