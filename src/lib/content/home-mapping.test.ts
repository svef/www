import { describe, it, expect } from 'vitest'
import {
  planEventSection,
  pickRecentWinners,
  recentPhotos,
  toHomeSettings,
  type HomePageAllLocales,
} from './home-mapping'
import type { AwardWinnerView } from './awards-mapping'
import type { GalleryAlbum, GalleryPhoto } from './galleries-mapping'

function global(overrides: Partial<HomePageAllLocales> = {}): HomePageAllLocales {
  return {
    id: 1,
    heroSentence: { is: 'Félag fólksins sem býr til vefinn á Íslandi.' },
    heroHook: { is: 'Um 300 hönnuðir, forritarar, markaðsfólk og UX-fólk.' },
    happeningNow: { mode: 'nextEvent' },
    showUpcomingEvents: true,
    showRecentWinners: true,
    showPhotos: true,
    updatedAt: '',
    createdAt: '',
    ...overrides,
  } as HomePageAllLocales
}

function winner(overrides: Partial<AwardWinnerView> = {}): AwardWinnerView {
  return {
    id: 1,
    siteName: 'nafn.is',
    year: 2025,
    category: 'Vefur ársins',
    categoryLocale: 'is',
    blurb: null,
    url: null,
    screenshot: null,
    ...overrides,
  }
}

function photo(url: string): GalleryPhoto {
  return { url, alt: '', caption: null, width: null, height: null }
}

function album(id: number, photos: GalleryPhoto[]): GalleryAlbum {
  return {
    id,
    title: `Album ${id}`,
    date: null,
    venue: null,
    photos,
    contentLocale: 'is',
    venueLocale: 'is',
  }
}

describe('toHomeSettings', () => {
  it('resolves the hero copy and reports the locale it is written in', () => {
    const settings = toHomeSettings(
      global({
        heroSentence: { is: 'Íslenska', en: 'English' },
        heroHook: { is: 'Krókur' },
      }),
      'en',
    )
    expect(settings.heroSentence).toBe('English')
    expect(settings.heroSentenceLocale).toBe('en')
    // No English hook, so the Icelandic one shows and says so.
    expect(settings.heroHook).toBe('Krókur')
    expect(settings.heroHookLocale).toBe('is')
  })

  it('reports missing hero copy as null rather than an empty string', () => {
    // Payload writes '' for a localized text field opened and left blank.
    const settings = toHomeSettings(global({ heroSentence: { is: '' }, heroHook: null }), 'is')
    expect(settings.heroSentence).toBeNull()
    expect(settings.heroHook).toBeNull()
  })

  it('shows every section and spotlights the next event on a global nobody has saved', () => {
    // A global that has never been opened in the admin comes back almost empty:
    // `defaultValue` is applied on create, not on read.
    const settings = toHomeSettings({ id: 1 } as unknown as HomePageAllLocales, 'is')
    expect(settings.spotlightMode).toBe('nextEvent')
    expect(settings.showUpcomingEvents).toBe(true)
    expect(settings.showRecentWinners).toBe(true)
    expect(settings.showPhotos).toBe(true)
  })

  it('honours a section that has been switched off', () => {
    const settings = toHomeSettings(global({ showPhotos: false }), 'is')
    expect(settings.showPhotos).toBe(false)
    expect(settings.showRecentWinners).toBe(true)
  })

  it('reads the spotlight winner id whether the relationship is resolved or not', () => {
    const asId = toHomeSettings(
      global({ happeningNow: { mode: 'winner', winner: 7 } }),
      'is',
    )
    expect(asId.spotlightWinnerId).toBe(7)

    const asDoc = toHomeSettings(
      global({
        happeningNow: { mode: 'winner', winner: { id: 9 } as never },
      }),
      'is',
    )
    expect(asDoc.spotlightWinnerId).toBe(9)
  })

  it('ignores a winner left behind by an earlier mode', () => {
    // Switching the spotlight back to the next event does not clear the
    // relationship, and a stale winner must not resurface as a second panel.
    const settings = toHomeSettings(
      global({ happeningNow: { mode: 'nextEvent', winner: 7 } }),
      'is',
    )
    expect(settings.spotlightWinnerId).toBeNull()
  })

  it('has no winner to spotlight when the mode is set but nobody is chosen', () => {
    const settings = toHomeSettings(global({ happeningNow: { mode: 'winner' } }), 'is')
    expect(settings.spotlightMode).toBe('winner')
    expect(settings.spotlightWinnerId).toBeNull()
  })
})

describe('pickRecentWinners', () => {
  it('takes the newest years first, and orders a year by site name', () => {
    const picked = pickRecentWinners(
      [
        winner({ id: 1, year: 2024, siteName: 'eldri.is' }),
        winner({ id: 2, year: 2025, siteName: 'seinni.is' }),
        winner({ id: 3, year: 2025, siteName: 'fyrri.is' }),
      ],
      3,
    )
    expect(picked.map((w) => w.id)).toEqual([3, 2, 1])
  })

  it('stops at the limit', () => {
    const picked = pickRecentWinners(
      [1, 2, 3, 4, 5].map((id) => winner({ id, siteName: `s${id}.is` })),
      3,
    )
    expect(picked).toHaveLength(3)
  })

  it('does not mutate what it was given', () => {
    const winners = [winner({ id: 1, year: 2020 }), winner({ id: 2, year: 2025 })]
    pickRecentWinners(winners, 2)
    expect(winners.map((w) => w.id)).toEqual([1, 2])
  })

  it('returns nothing when there are no winners', () => {
    expect(pickRecentWinners([], 3)).toEqual([])
  })
})

describe('recentPhotos', () => {
  it('fills the strip from the newest album first', () => {
    const photos = recentPhotos([album(1, [photo('a'), photo('b')]), album(2, [photo('c')])], 4)
    expect(photos.map((p) => p.url)).toEqual(['a', 'b', 'c'])
  })

  it('carries on into older albums when the newest one is short', () => {
    // The usual case: an album is created when the event happens and its photos
    // are uploaded days later, so the newest album is routinely the emptiest.
    const photos = recentPhotos(
      [album(1, []), album(2, [photo('a')]), album(3, [photo('b'), photo('c')])],
      4,
    )
    expect(photos.map((p) => p.url)).toEqual(['a', 'b', 'c'])
  })

  it('stops at the limit', () => {
    const photos = recentPhotos([album(1, ['a', 'b', 'c', 'd', 'e'].map(photo))], 4)
    expect(photos.map((p) => p.url)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('returns nothing when no album has a photo in it yet', () => {
    expect(recentPhotos([album(1, []), album(2, [])], 4)).toEqual([])
  })
})

describe('planEventSection', () => {
  const opts = { spotlightNextEvent: true, showSection: true }

  it('spotlights the soonest event and lists the rest', () => {
    const plan = planEventSection(['a', 'b', 'c'], opts)
    expect(plan.spotlight).toBe('a')
    expect(plan.rows).toEqual(['b', 'c'])
    expect(plan.section).toBe('list')
  })

  it('does not contradict itself when there is exactly one event', () => {
    // The bug this function was extracted for. The spotlight takes the only
    // event, so the list has nothing left — and an empty state fired off the
    // *list* would render "Engir viðburðir framundan" two blocks below a
    // spotlight announcing that very event.
    const plan = planEventSection(['a'], opts)
    expect(plan.spotlight).toBe('a')
    expect(plan.rows).toEqual([])
    expect(plan.section).toBe('hidden')
  })

  it('never returns a spotlight and an empty state at the same time', () => {
    // The invariant, stated directly: whatever the inputs, the page cannot
    // announce an event and say there are none.
    for (const count of [0, 1, 2, 5]) {
      for (const spotlightNextEvent of [true, false]) {
        const plan = planEventSection(Array.from({ length: count }, (_, i) => i), {
          spotlightNextEvent,
          showSection: true,
        })
        expect(
          plan.spotlight !== null && plan.section === 'empty',
          `spotlight + empty state with ${count} event(s), spotlight=${spotlightNextEvent}`,
        ).toBe(false)
      }
    }
  })

  it('says the calendar is empty when it is', () => {
    const plan = planEventSection([], opts)
    expect(plan.spotlight).toBeNull()
    expect(plan.section).toBe('empty')
  })

  it('lists every event when the spotlight is showing something else', () => {
    // `winner` or `hidden` mode: nothing has taken the first event, so the list
    // starts at it.
    const plan = planEventSection(['a', 'b'], { spotlightNextEvent: false, showSection: true })
    expect(plan.spotlight).toBeNull()
    expect(plan.rows).toEqual(['a', 'b'])
    expect(plan.section).toBe('list')
  })

  it('keeps the spotlight when the section is switched off', () => {
    // `showUpcomingEvents` hides the list, not the "happening now" block.
    const plan = planEventSection(['a', 'b'], { spotlightNextEvent: true, showSection: false })
    expect(plan.spotlight).toBe('a')
    expect(plan.rows).toEqual([])
    expect(plan.section).toBe('hidden')
  })

  it('does not mutate what it was given', () => {
    const upcoming = ['a', 'b']
    planEventSection(upcoming, { spotlightNextEvent: false, showSection: true })
    expect(upcoming).toEqual(['a', 'b'])
  })
})
