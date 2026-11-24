import { describe, expect, it } from 'vitest'
import { intakeOpensAtOverride } from './seed'

describe('intakeOpensAtOverride', () => {
  it('moves the opening on previews and locally', () => {
    expect(intakeOpensAtOverride({ AWARDS_INTAKE_OPENS_AT: '2026-11-23T00:00:00Z', VERCEL_ENV: 'preview' })?.toISOString()).toBe(
      '2026-11-23T00:00:00.000Z',
    )
    expect(intakeOpensAtOverride({ AWARDS_INTAKE_OPENS_AT: '2026-11-23T00:00:00Z' })).not.toBeNull()
  })

  it('is ignored in production, when unset, and when it is not a date', () => {
    expect(intakeOpensAtOverride({ AWARDS_INTAKE_OPENS_AT: '2026-11-23T00:00:00Z', VERCEL_ENV: 'production' })).toBeNull()
    expect(intakeOpensAtOverride({})).toBeNull()
    expect(intakeOpensAtOverride({ AWARDS_INTAKE_OPENS_AT: 'soon' })).toBeNull()
  })
})
