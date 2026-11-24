import { describe, expect, it } from 'vitest'
import { deadlineLine } from './deadline'

const ed = {
  earlyBirdEndsBefore: '2027-01-05T00:00:00Z',
  intakeClosesBefore: '2027-02-02T00:00:00Z',
}
const at = (iso: string) => deadlineLine(iso, ed)

describe('deadlineLine', () => {
  it('counts whole days left, rounding up, with the last day being "1 day left"', () => {
    expect(at('2027-01-04T23:59:59.999Z')).toMatchObject({ kind: 'early-bird', days: 1 })
    expect(at('2027-01-04T00:00:00Z')).toMatchObject({ kind: 'early-bird', days: 1 })
    expect(at('2027-01-03T23:59:59.999Z')).toMatchObject({ kind: 'early-bird', days: 2 })
    expect(at('2027-01-03T00:00:00Z')).toMatchObject({ kind: 'early-bird', days: 2 })
    expect(at('2026-12-31T00:00:00Z')).toMatchObject({ kind: 'early-bird', days: 5 })
    expect(at('2026-12-01T00:00:00Z')).toMatchObject({ kind: 'early-bird', days: 35 })
  })

  it('names the last early-bird day (4 January) while it applies', () => {
    expect(at('2026-12-20T12:00:00Z')).toMatchObject({ lastDay: '2027-01-04T23:59:59.999Z' })
  })

  it('switches to "submissions close" exactly at the early-bird bound (exclusive)', () => {
    expect(at('2027-01-05T00:00:00Z')).toEqual({ kind: 'closes', lastDay: '2027-02-01T23:59:59.999Z' })
    expect(at('2027-01-05T00:00:00.001Z').kind).toBe('closes')
  })

  it('stays on "submissions close" until the last millisecond, then closed (exclusive)', () => {
    expect(at('2027-02-01T23:59:59.999Z').kind).toBe('closes')
    expect(at('2027-02-02T00:00:00Z')).toEqual({ kind: 'closed' })
    expect(at('2027-06-01T00:00:00Z')).toEqual({ kind: 'closed' })
  })

  it('accepts Date and epoch input', () => {
    expect(deadlineLine(new Date('2027-01-04T12:00:00Z'), ed)).toMatchObject({ days: 1 })
    expect(deadlineLine(Date.parse('2027-02-02T00:00:00Z'), ed)).toEqual({ kind: 'closed' })
  })
})
