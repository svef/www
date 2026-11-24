import { describe, expect, it } from 'vitest'
import { DRAFT_REMINDER_LEAD_DAYS, dueWave } from './rules'

const edition = {
  earlyBirdEndsBefore: new Date('2027-01-05T00:00:00Z'),
  intakeClosesBefore: new Date('2027-02-02T00:00:00Z'),
}
const wave = (iso: string) => dueWave(new Date(iso), edition)

describe('dueWave', () => {
  it('defaults to three days', () => expect(DRAFT_REMINDER_LEAD_DAYS).toBe(3))

  it('wave 1 opens exactly three days (2 January) before the early-bird bound, and ends at it', () => {
    expect(wave('2027-01-02T00:00:00Z')).toBe('early_bird')
    expect(wave('2027-01-01T23:59:59.999Z')).toBeNull()
    expect(wave('2027-01-04T23:59:59.999Z')).toBe('early_bird')
    expect(wave('2027-01-05T00:00:00Z')).toBeNull()
  })

  it('wave 2 opens exactly three days before intake closes, and ends at the close', () => {
    expect(wave('2027-01-30T00:00:00Z')).toBe('closing')
    expect(wave('2027-01-29T23:59:59.999Z')).toBeNull()
    expect(wave('2027-02-01T23:59:59.999Z')).toBe('closing')
    expect(wave('2027-02-02T00:00:00Z')).toBeNull()
  })

  it('is null between the waves, before intake and after the close', () => {
    expect(wave('2026-12-10T12:00:00Z')).toBeNull()
    expect(wave('2027-01-15T12:00:00Z')).toBeNull()
    expect(wave('2027-03-01T00:00:00Z')).toBeNull()
  })

  it('takes the lead time as an argument, and prefers wave 1 where the windows overlap', () => {
    expect(dueWave(new Date('2027-01-04T12:00:00Z'), edition, 1)).toBe('early_bird')
    expect(dueWave(new Date('2027-01-03T12:00:00Z'), edition, 1)).toBeNull()
    const tight = { earlyBirdEndsBefore: new Date('2027-01-05T00:00:00Z'), intakeClosesBefore: new Date('2027-01-06T00:00:00Z') }
    expect(dueWave(new Date('2027-01-04T12:00:00Z'), tight)).toBe('early_bird')
    expect(dueWave(new Date('2027-01-05T12:00:00Z'), tight)).toBe('closing')
  })
})
