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
