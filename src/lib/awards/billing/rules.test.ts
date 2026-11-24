import { describe, expect, it } from 'vitest'
import { formatKennitala, validateBillingInput } from './rules'

const valid = {
  companyName: 'Acme ehf.',
  kennitala: '4710031239',
  invoiceEmail: 'invoices@acme.is',
  address: 'Laugavegur 1, 101 Reykjavík',
}

describe('validateBillingInput', () => {
  it('accepts a complete profile and trims it', () => {
    const r = validateBillingInput({
      ...valid,
      companyName: '  Acme ehf. ',
      reference: '  PO-7 ',
    })
    expect(r).toEqual({
      ok: true,
      data: { ...valid, reference: 'PO-7' },
    })
  })

  it('treats the reference as optional', () => {
    const r = validateBillingInput(valid)
    expect(r.ok && r.data.reference).toBeNull()
    const blank = validateBillingInput({ ...valid, reference: '   ' })
    expect(blank.ok && blank.data.reference).toBeNull()
  })

  it('accepts a kennitala written with the hyphen and stores ten digits', () => {
    const r = validateBillingInput({ ...valid, kennitala: '471003-1239' })
    expect(r.ok && r.data.kennitala).toBe('4710031239')
  })

  it('accepts a personal kennitala as well as a company one (agencies bill the client, people bill themselves)', () => {
    expect(validateBillingInput({ ...valid, kennitala: '1203921239' }).ok).toBe(true)
  })

  it('names every missing field', () => {
    const r = validateBillingInput({})
    expect(r.ok).toBe(false)
    expect(!r.ok && r.errors.map((e) => [e.field, e.code])).toEqual([
      ['companyName', 'required'],
      ['kennitala', 'required'],
      ['invoiceEmail', 'required'],
      ['address', 'required'],
    ])
  })

  it('rejects a kennitala that is not ten digits, and one whose checksum is wrong', () => {
    const short = validateBillingInput({ ...valid, kennitala: '12345' })
    expect(!short.ok && short.errors[0]).toMatchObject({
      field: 'kennitala',
      code: 'kennitalaFormat',
    })
    const bad = validateBillingInput({ ...valid, kennitala: '4110021299' })
    expect(!bad.ok && bad.errors[0]).toMatchObject({
      field: 'kennitala',
      code: 'kennitalaInvalid',
    })
  })

  it('rejects a malformed invoice email', () => {
    const r = validateBillingInput({ ...valid, invoiceEmail: 'not-an-email' })
    expect(!r.ok && r.errors[0]).toMatchObject({
      field: 'invoiceEmail',
      code: 'invalidEmail',
    })
  })

  it('enforces the length limits and says the limit in both languages', () => {
    const r = validateBillingInput({ ...valid, companyName: 'x'.repeat(121) })
    expect(!r.ok && r.errors[0].message).toEqual({
      is: 'Má vera að hámarki 120 stafir.',
      en: 'Must be at most 120 characters.',
    })
  })
})

describe('formatKennitala', () => {
  it('writes ten digits with the hyphen', () => {
    expect(formatKennitala('4710031239')).toBe('471003-1239')
  })
  it('leaves anything else alone', () => {
    expect(formatKennitala('123')).toBe('123')
  })
})
