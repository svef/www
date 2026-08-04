import { describe, it, expect } from 'vitest'
import { getDictionary, isLocale, DEFAULT_LOCALE } from './index'

describe('i18n', () => {
  it('recognizes valid locales only', () => {
    expect(isLocale('is')).toBe(true)
    expect(isLocale('en')).toBe(true)
    expect(isLocale('de')).toBe(false)
  })

  it('returns the matching dictionary', () => {
    expect(getDictionary('en').nav.about).toBe('About SVEF')
    expect(getDictionary('is').nav.about).toBe('Um SVEF')
  })

  it('falls back to the default locale for unknown input', () => {
    // @ts-expect-error intentionally passing an invalid locale
    expect(getDictionary('xx')).toBe(getDictionary(DEFAULT_LOCALE))
  })
})
