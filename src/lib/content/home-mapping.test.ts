import { describe, it, expect } from 'vitest'
import { toHomeSettings, type HomeFallbacks, type HomePageAllLocales } from './home-mapping'

const fallbacks: HomeFallbacks = {
  title: 'Samtök vefiðnaðarins',
  primaryLabel: 'Gerast félagi',
  secondaryLabel: 'Sjá viðburði',
  eventsHeading: 'Næstu viðburðir',
  eventsLinkLabel: 'Allir viðburðir',
  newsHeading: 'Fréttir',
  newsLinkLabel: 'Allar fréttir',
  aboutHeading: 'Um SVEF',
  aboutLinkLabel: 'Meira um SVEF',
}

function global(overrides: Partial<HomePageAllLocales> = {}): HomePageAllLocales {
  return {
    id: 1,
    updatedAt: '',
    createdAt: '',
    ...overrides,
  } as HomePageAllLocales
}

const rows = (...lines: string[]) => lines.map((text) => ({ text }))

describe('toHomeSettings: the hero', () => {
  it('uses the locale’s own lines', () => {
    const s = toHomeSettings(
      global({
        heroLines: { is: rows('Félag fólksins', 'sem býr til'), en: rows('The people who', 'build the web') },
      }),
      'en',
      fallbacks,
    )
    expect(s.heroLines).toEqual(['The people who', 'build the web'])
    expect(s.heroLocale).toBe('en')
  })

  it('falls back to the Icelandic lines, and says so', () => {
    const s = toHomeSettings(global({ heroLines: { is: rows('Félag fólksins') } }), 'en', fallbacks)
    expect(s.heroLines).toEqual(['Félag fólksins'])
    expect(s.heroLocale).toBe('is')
  })

  it('drops blank lines', () => {
    const s = toHomeSettings(global({ heroLines: { is: rows('Eitt', '  ', 'Tvö') } }), 'is', fallbacks)
    expect(s.heroLines).toEqual(['Eitt', 'Tvö'])
  })

  it('uses the one-sentence field when there are no lines', () => {
    const s = toHomeSettings(global({ heroSentence: { is: 'Heil setning.' } }), 'is', fallbacks)
    expect(s.heroLines).toEqual(['Heil setning.'])
  })

  it('ends at the association’s name, so the page always has an h1', () => {
    const s = toHomeSettings(global(), 'is', fallbacks)
    expect(s.heroLines).toEqual(['Samtök vefiðnaðarins'])
    expect(s.heroLocale).toBe('is')
  })
})

describe('toHomeSettings: copy', () => {
  it('falls back to the interface strings for labels nobody has written, in the page’s language', () => {
    const s = toHomeSettings(global(), 'en', { ...fallbacks, eventsHeading: 'Upcoming events' })
    expect(s.eventsHeading).toEqual({ text: 'Upcoming events', locale: 'en', lang: undefined })
    expect(s.primaryLabel.lang).toBeUndefined()
  })

  it('has no intro band, events lead or about text until they are written', () => {
    const s = toHomeSettings(global(), 'is', fallbacks)
    expect(s.introText).toBeNull()
    expect(s.eventsLead).toBeNull()
    expect(s.aboutText).toBeNull()
  })

  it('treats a blank field as unwritten', () => {
    const s = toHomeSettings(
      global({ introBand: { text: { is: '   ' } }, eventsSection: { heading: { is: '' } } }),
      'is',
      fallbacks,
    )
    expect(s.introText).toBeNull()
    expect(s.eventsHeading.text).toBe('Næstu viðburðir')
  })

  it('marks copy that fell back to Icelandic with its language', () => {
    const s = toHomeSettings(
      global({ introBand: { text: { is: 'Við erum fólkið.' } } }),
      'en',
      fallbacks,
    )
    expect(s.introText).toEqual({ text: 'Við erum fólkið.', locale: 'is', lang: 'is' })
    expect(s.locales).toContain('is')
  })

  it('reports only the page’s language when everything is in it', () => {
    const s = toHomeSettings(
      global({
        heroLines: { en: rows('The people who') },
        introBand: { text: { en: 'We are the people.' } },
        aboutSection: { text: { en: 'SVEF is…' } },
      }),
      'en',
      fallbacks,
    )
    expect(new Set(s.locales)).toEqual(new Set(['en']))
  })
})

describe('toHomeSettings: which sections show', () => {
  it('shows events and news by default: a fresh global has no flags saved', () => {
    const s = toHomeSettings(global(), 'is', fallbacks)
    expect(s.showUpcomingEvents).toBe(true)
    expect(s.showLatestNews).toBe(true)
  })

  it('honours a switch that has been turned off', () => {
    const s = toHomeSettings(
      global({ showUpcomingEvents: false, showLatestNews: false }),
      'is',
      fallbacks,
    )
    expect(s.showUpcomingEvents).toBe(false)
    expect(s.showLatestNews).toBe(false)
  })
})
