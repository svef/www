import { describe, expect, it } from 'vitest'
import { formatMoney, lastDayBefore } from './format'

describe('format', () => {
  it('writes whole krónur the way each locale does', () => {
    expect(formatMoney(26900, 'en', 'kr.')).toBe('26,900 kr.')
    expect(formatMoney(26900, 'is', 'kr.').replace(/\s/g, ' ')).toBe('26.900 kr.')
  })

  it('names the last day an exclusive deadline allows', () => {
    expect(lastDayBefore('2027-01-05T00:00:00.000Z', 'en')).toBe('4 January 2027')
    expect(lastDayBefore('2027-01-05T00:00:00.000Z', 'is')).toBe('4. janúar 2027')
  })
})
