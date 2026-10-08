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
  it('prefixes the target locale', () => {
    expect(localePath('/', 'en')).toBe('/en')
    expect(localePath('/', 'is')).toBe('/is')
    expect(localePath('/vidburdir', 'is')).toBe('/is/vidburdir')
  })

  it('translates the page name along with the prefix', () => {
    expect(localePath('/vidburdir', 'en')).toBe('/en/events')
    expect(localePath('/frettir', 'en')).toBe('/en/news')
    expect(localePath('/um-svef', 'en')).toBe('/en/about')
    expect(localePath('/vefverdlaunin', 'en')).toBe('/en/web-awards')
    expect(localePath('/myndir', 'en')).toBe('/en/photos')
    expect(localePath('/skraning', 'en')).toBe('/en/membership')
    expect(localePath('/hafa-samband', 'en')).toBe('/en/contact')
  })

  it('reads a path written in either language', () => {
    // The input is as often the path a reader is on as one written in code.
    expect(localePath('/en/events', 'is')).toBe('/is/vidburdir')
    expect(localePath('/is/vidburdir', 'en')).toBe('/en/events')
    expect(localePath('/en/events', 'en')).toBe('/en/events')
  })

  it('carries anything after the page name across untouched', () => {
    // Document slugs are not localized yet — svef/www#98.
    expect(localePath('/frettir/eitthvad', 'en')).toBe('/en/news/eitthvad')
    expect(localePath('/en/events/kludurkvold', 'is')).toBe('/is/vidburdir/kludurkvold')
  })

  it('replaces an existing prefix rather than stacking one on top', () => {
    expect(localePath('/en', 'is')).toBe('/is')
    expect(localePath('/is', 'en')).toBe('/en')
  })

  it('is idempotent for the locale it is already in', () => {
    expect(localePath('/en/about', 'en')).toBe('/en/about')
    expect(localePath('/is/um-svef', 'is')).toBe('/is/um-svef')
    expect(localePath(localePath('/um-svef', 'en'), 'en')).toBe('/en/about')
  })

  it('leaves a segment that names no page alone', () => {
    expect(localePath('/eitthvad-annad', 'en')).toBe('/en/eitthvad-annad')
  })

  it('only treats a whole segment as a locale prefix', () => {
    expect(localePath('/england', 'en')).toBe('/en/england')
    expect(localePath('/island', 'en')).toBe('/en/island')
    expect(localePath('/en/england', 'is')).toBe('/is/england')
  })

  it('preserves the query string and hash', () => {
    expect(localePath('/en/events#naesti', 'is')).toBe('/is/vidburdir#naesti')
    expect(localePath('/myndir?ar=2025#topp', 'en')).toBe('/en/photos?ar=2025#topp')
    expect(localePath('/?x=1', 'is')).toBe('/is?x=1')
  })

  it('tolerates a path without a leading slash', () => {
    expect(localePath('vidburdir', 'en')).toBe('/en/events')
  })

  it('never returns a protocol-relative URL', () => {
    // `//evil.com` in an href navigates off-site. Unreachable today (Next
    // normalises `//` before render), guarded so it stays that way.
    expect(localePath('//evil.com', 'is')).toBe('/is/evil.com')
    expect(localePath('//evil.com', 'en')).toBe('/en/evil.com')
    expect(localePath('/en//evil.com', 'is')).toBe('/is/evil.com')
    expect(localePath('/is//evil.com', 'en')).toBe('/en/evil.com')
    expect(localePath('///evil.com', 'is')).toBe('/is/evil.com')
    expect(localePath('//evil.com?a=1#b', 'is')).toBe('/is/evil.com?a=1#b')
  })
})
