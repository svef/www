import { describe, it, expect } from 'vitest'
import { toHomeSettings, type HomeFallbacks, type HomePageAllLocales } from './home-mapping'

const fallbacks: HomeFallbacks = {
  heroLines: ['Félag fólksins', 'sem býr til', 'vefinn á Íslandi.'],
  primaryLabel: 'Gerast félagi',
  secondaryLabel: 'Sjá viðburði',
  intro: 'Við erum fólkið á bak við vefinn á Íslandi.',
  eventsHeading: 'Næstu viðburðir',
  eventsLead: 'Fyrirlestrar, vinnustofur og hátíðir.',
  eventsLinkLabel: 'Allir viðburðir',
  aboutHeading: 'Um SVEF',
  aboutText: 'SVEF — Samtök vefiðnaðarins.',
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

  it('ignores the old one-sentence field: one long line is what ran off the screen', () => {
    const s = toHomeSettings(
      global({ heroSentence: { is: 'Félag fólksins sem býr til vefinn á Íslandi.' } } as unknown as Partial<HomePageAllLocales>),
      'is',
      fallbacks,
    )
    expect(s.heroLines).toEqual(['Félag fólksins', 'sem býr til', 'vefinn á Íslandi.'])
  })

  it('ends at the designed headline, line by line, in the page’s language', () => {
    const s = toHomeSettings(global(), 'en', { ...fallbacks, heroLines: ['The people who', 'build the web', 'in Iceland.'] })
    expect(s.heroLines).toEqual(['The people who', 'build the web', 'in Iceland.'])
    expect(s.heroLocale).toBe('en')
  })
})

describe('toHomeSettings: copy', () => {
  it('falls back to the interface strings for labels nobody has written, in the page’s language', () => {
    const s = toHomeSettings(global(), 'en', { ...fallbacks, eventsHeading: 'Upcoming events' })
    expect(s.eventsHeading).toEqual({ text: 'Upcoming events', locale: 'en', lang: undefined })
    expect(s.primaryLabel.lang).toBeUndefined()
  })

  it('shows the designed intro, events lead and about text until they are written', () => {
    const s = toHomeSettings(global(), 'is', fallbacks)
    expect(s.introText).toEqual({ text: fallbacks.intro, locale: 'is', lang: undefined })
    expect(s.eventsLead.text).toBe(fallbacks.eventsLead)
    expect(s.aboutText.text).toBe(fallbacks.aboutText)
    expect(new Set(s.locales)).toEqual(new Set(['is']))
  })

  it('treats a blank field as unwritten', () => {
    const s = toHomeSettings(
      global({ introBand: { text: { is: '   ' } }, eventsSection: { heading: { is: '' } } }),
      'is',
      fallbacks,
    )
    expect(s.introText.text).toBe(fallbacks.intro)
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
  it('shows the events by default: a fresh global has no flags saved', () => {
    const s = toHomeSettings(global(), 'is', fallbacks)
    expect(s.showUpcomingEvents).toBe(true)
  })

  it('honours the switch when it has been turned off', () => {
    const s = toHomeSettings(global({ showUpcomingEvents: false }), 'is', fallbacks)
    expect(s.showUpcomingEvents).toBe(false)
  })
})
