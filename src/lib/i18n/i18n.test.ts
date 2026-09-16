import { describe, it, expect } from 'vitest'
import { getDictionary, isLocale, localePath, DEFAULT_LOCALE } from './index'

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

describe('localePath', () => {
  it('adds the /en prefix when switching to English', () => {
    expect(localePath('/', 'en')).toBe('/en')
    expect(localePath('/vidburdir', 'en')).toBe('/en/vidburdir')
    expect(localePath('/frettir/eitthvad', 'en')).toBe('/en/frettir/eitthvad')
  })

  it('strips the /en prefix when switching to Icelandic', () => {
    expect(localePath('/en', 'is')).toBe('/')
    expect(localePath('/en/vidburdir', 'is')).toBe('/vidburdir')
    expect(localePath('/en/frettir/eitthvad', 'is')).toBe('/frettir/eitthvad')
  })

  it('never emits the internal /is prefix', () => {
    expect(localePath('/is', 'is')).toBe('/')
    expect(localePath('/is/vidburdir', 'is')).toBe('/vidburdir')
    expect(localePath('/is/vidburdir', 'en')).toBe('/en/vidburdir')
  })

  it('is idempotent for the locale it is already in', () => {
    expect(localePath('/en/um-svef', 'en')).toBe('/en/um-svef')
    expect(localePath('/um-svef', 'is')).toBe('/um-svef')
  })

  it('only treats a whole segment as a locale prefix', () => {
    expect(localePath('/england', 'en')).toBe('/en/england')
    expect(localePath('/island', 'en')).toBe('/en/island')
    expect(localePath('/en/england', 'is')).toBe('/england')
  })

  it('preserves the query string and hash', () => {
    expect(localePath('/vidburdir?ar=2026', 'en')).toBe('/en/vidburdir?ar=2026')
    expect(localePath('/en/vidburdir#naesti', 'is')).toBe('/vidburdir#naesti')
    expect(localePath('/myndir?ar=2025#topp', 'en')).toBe('/en/myndir?ar=2025#topp')
    expect(localePath('/?x=1', 'is')).toBe('/?x=1')
  })

  it('tolerates a path without a leading slash', () => {
    expect(localePath('vidburdir', 'en')).toBe('/en/vidburdir')
  })

  it('never returns a protocol-relative URL', () => {
    // `//evil.com` in an href navigates off-site. Unreachable today (Next
    // normalises `//` before render), guarded so it stays that way.
    expect(localePath('//evil.com', 'is')).toBe('/evil.com')
    expect(localePath('//evil.com', 'en')).toBe('/en/evil.com')
    expect(localePath('/en//evil.com', 'is')).toBe('/evil.com')
    expect(localePath('/is//evil.com', 'en')).toBe('/en/evil.com')
    expect(localePath('///evil.com', 'is')).toBe('/evil.com')
    expect(localePath('//evil.com?a=1#b', 'is')).toBe('/evil.com?a=1#b')
  })
})
