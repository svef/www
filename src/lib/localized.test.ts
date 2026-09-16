import { describe, it, expect } from 'vitest'
import { pickLocalized } from './localized'

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
