import { describe, expect, it } from 'vitest'
import { parseProfile, parseSignUpProfile } from './profile'

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

describe('parseSignUpProfile', () => {
  it('tidies what sign-up sends and narrows the language to is or en', () => {
    expect(parseSignUpProfile({ name: ' Anna  B ', email: 'a@b.is', phone: ' 555 1234 ', preferredLocale: 'en' })).toEqual({
      ok: true,
      value: { name: 'Anna B', phone: '555 1234', preferredLocale: 'en' },
    })
    for (const preferredLocale of ['__proto__', 'constructor', 'de', 42, null, undefined])
      expect(parseSignUpProfile({ name: 'A', preferredLocale })).toEqual({
        ok: true,
        value: { name: 'A', phone: null, preferredLocale: 'is' },
      })
  })

  it('treats non-string fields as empty, and an unreadable body as no name', () => {
    expect(parseSignUpProfile({ name: 'A', phone: { evil: true } })).toEqual({
      ok: true,
      value: { name: 'A', phone: null, preferredLocale: 'is' },
    })
    expect(parseSignUpProfile(undefined)).toEqual({ ok: false, code: 'NAME_REQUIRED' })
    expect(parseSignUpProfile({ name: ['A'] })).toEqual({ ok: false, code: 'NAME_REQUIRED' })
  })

  it('refuses a long name or a bad phone with a code the form understands', () => {
    expect(parseSignUpProfile({ name: 'x'.repeat(201) })).toEqual({ ok: false, code: 'NAME_TOO_LONG' })
    expect(parseSignUpProfile({ name: 'A', phone: 'call me' })).toEqual({ ok: false, code: 'INVALID_PHONE' })
  })
})
