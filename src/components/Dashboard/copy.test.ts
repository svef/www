import { describe, expect, it } from 'vitest'
import { dashboardCopy, formatKennitala, formatMoney } from './copy'

describe('dashboard copy', () => {
  const en = dashboardCopy.en
  const is = dashboardCopy.is

  it('words the deadline line', () => {
    expect(en.deadline({ kind: 'early-bird', days: 12, lastDay: '2027-01-04T23:59:59.999Z' }, 'en')).toBe(
      '12 days left to secure the early-bird price',
    )
    expect(en.deadline({ kind: 'early-bird', days: 1, lastDay: '2027-01-04T23:59:59.999Z' }, 'en')).toBe(
      '1 day left to secure the early-bird price',
    )
    expect(en.deadline({ kind: 'closes', lastDay: '2027-02-01T23:59:59.999Z' }, 'en')).toBe('Submissions close 1 February')
    expect(is.deadline({ kind: 'closes', lastDay: '2027-02-01T23:59:59.999Z' }, 'is')).toBe('Innsendingum lýkur 1. febrúar')
    expect(en.deadline({ kind: 'closed' }, 'en')).toBe('Submissions are closed')
  })

  it('words the invoice note with the amount, company and a formatted kennitala', () => {
    expect(en.invoiceNote(52700, 'Acme ehf.', '4501012340', 'en')).toBe(
      'An invoice for 52,700 kr. will be sent to Acme ehf., kt. 450101-2340, after submissions close.',
    )
    expect(is.invoiceNote(52700, 'Acme ehf.', '0501012340', 'is')).toContain('52.700 kr.')
    expect(is.invoiceNote(52700, 'Acme ehf.', '0501012340', 'is')).toContain('kt. 050101-2340')
  })

  it('formats money and kennitala', () => {
    expect(formatMoney(1900, 'en')).toBe('1,900 kr.')
    expect(formatKennitala('4501012340')).toBe('450101-2340')
    expect(formatKennitala('123')).toBe('123')
  })
})
