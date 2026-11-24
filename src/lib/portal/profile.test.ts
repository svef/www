import { describe, expect, it } from 'vitest'
import { parseProfile } from './profile'

describe('parseProfile', () => {
  it('tidies the name, keeps an empty phone as none, and defaults the language', () => {
    expect(parseProfile({ name: '  Anna   Jónsdóttir ', phone: '', preferredLocale: '' })).toEqual({
      ok: true,
      value: { name: 'Anna Jónsdóttir', phone: null, preferredLocale: 'is' },
    })
    expect(parseProfile({ name: 'A', phone: ' +354 555-1234 ', preferredLocale: 'en' })).toEqual({
      ok: true,
      value: { name: 'A', phone: '+354 555-1234', preferredLocale: 'en' },
    })
  })

  it('requires a name of a sensible length', () => {
    expect(parseProfile({ name: '   ', phone: '', preferredLocale: 'is' })).toEqual({ ok: false, errors: { name: 'required' } })
    expect(parseProfile({ name: 'x'.repeat(201), phone: '', preferredLocale: 'is' })).toEqual({
      ok: false,
      errors: { name: 'nameLong' },
    })
  })

  it('accepts phone numbers as people write them, and nothing else', () => {
    for (const phone of ['5551234', '555 1234', '(354) 555 1234', '+44 20 7946 0958'])
      expect(parseProfile({ name: 'A', phone, preferredLocale: 'is' }).ok, phone).toBe(true)
    for (const phone of ['abc', '12', '555 1234 ext. 5', '++354 555'])
      expect(parseProfile({ name: 'A', phone, preferredLocale: 'is' }), phone).toEqual({ ok: false, errors: { phone: 'phone' } })
  })
})
