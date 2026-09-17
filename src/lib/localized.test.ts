import { describe, it, expect } from 'vitest'
import { pickLocalized, resolveContentLocale } from './localized'

describe('pickLocalized', () => {
  it('returns the requested locale when it is filled in', () => {
    expect(pickLocalized({ is: 'Fréttir', en: 'News' }, 'en')).toEqual({
      value: 'News',
      locale: 'en',
    })
  })

  it('falls back to Icelandic and reports it', () => {
    expect(pickLocalized({ is: 'Fréttir', en: null }, 'en')).toEqual({
      value: 'Fréttir',
      locale: 'is',
    })
  })

  it('treats an empty string as not translated', () => {
    // Payload stores '' for a localized text field opened and left blank.
    expect(pickLocalized({ is: 'Fréttir', en: '' }, 'en')).toEqual({
      value: 'Fréttir',
      locale: 'is',
    })
  })

  it('treats a blank Icelandic fallback as not translated either', () => {
    // The bug svef/www#88 records: the `''` guard covered the requested locale
    // only, so a field blanked in both came back as `''` and every caller had to
    // undo it — one of them silently, by short-circuiting `??`.
    expect(pickLocalized({ is: '', en: '' }, 'en')).toEqual({ value: null, locale: 'is' })
    expect(pickLocalized({ is: '' }, 'is')).toEqual({ value: null, locale: 'is' })
  })

  it('treats a whitespace-only field as blank', () => {
    // Same editorial accident as an empty one, and the reason
    // `content/site-settings.ts` used to re-test every value with `.trim()`.
    expect(pickLocalized({ is: 'Fréttir', en: '   ' }, 'en')).toEqual({
      value: 'Fréttir',
      locale: 'is',
    })
    expect(pickLocalized({ is: ' \n ', en: '' }, 'en')).toEqual({ value: null, locale: 'is' })
  })

  it('never trims the value it returns', () => {
    // Only the blank *test* is trimmed. Trimming the value would quietly edit
    // content, and a localized field is not always a string.
    expect(pickLocalized({ is: '  Fréttir  ' }, 'is').value).toBe('  Fréttir  ')
  })

  it('leaves non-string fields alone', () => {
    // Rich text arrives as an object; the only thing that can be blank about it
    // is being absent.
    const body = { root: { children: [] } }
    expect(pickLocalized({ is: body }, 'is')).toEqual({ value: body, locale: 'is' })
  })

  it('reports a field blank in English as untranslated, not as translated-to-empty', () => {
    // What `resolveContentLocale` is then handed: `is`, so the page shows the
    // "English copy is not available" note rather than claiming the blank is
    // the English.
    const picked = pickLocalized({ is: 'Fréttir', en: '' }, 'en')
    expect(picked.locale).toBe('is')
    expect(resolveContentLocale([picked.locale], 'en')).toBe('is')
  })

  it('has nothing to show when neither locale is filled in', () => {
    expect(pickLocalized({ is: null, en: null }, 'en')).toEqual({
      value: null,
      locale: 'is',
    })
    expect(pickLocalized(null, 'is')).toEqual({ value: null, locale: 'is' })
    expect(pickLocalized(undefined, 'is')).toEqual({ value: null, locale: 'is' })
  })
})

describe('resolveContentLocale', () => {
  it('is the requested locale only when every field is in it', () => {
    expect(resolveContentLocale(['en', 'en'], 'en')).toBe('en')
    expect(resolveContentLocale(['is', 'is'], 'is')).toBe('is')
  })

  it('reports Icelandic when any one field fell back', () => {
    // One untranslated field is enough to say so: a page of half-Icelandic copy
    // needs the explanation as much as an entirely Icelandic one.
    expect(resolveContentLocale(['en', 'is', 'en'], 'en')).toBe('is')
  })

  it('has nothing to disagree with when there are no fields', () => {
    // An empty news index is in whatever language the reader asked for.
    expect(resolveContentLocale([], 'en')).toBe('en')
  })
})
