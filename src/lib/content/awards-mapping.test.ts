import { describe, expect, it } from 'vitest'

import {
  pickCeremonyEdition,
  toArchive,
  toCategory,
  toCeremony,
  toWinner,
  type AwardCategoryAllLocales,
  type AwardEditionAllLocales,
  type AwardWinnerAllLocales,
  type AwardWinnerView,
} from './awards-mapping'

function edition(partial: Partial<AwardEditionAllLocales> & { year: number }) {
  return {
    id: partial.year,
    updatedAt: '',
    createdAt: '',
    headline: null,
    ...partial,
  } as AwardEditionAllLocales
}

function category(name: Partial<Record<'is' | 'en', string>>, id = 1) {
  return {
    id,
    slug: `c-${id}`,
    order: id,
    updatedAt: '',
    createdAt: '',
    name,
  } as AwardCategoryAllLocales
}

function winner(partial: Partial<AwardWinnerAllLocales> & { siteName: string }) {
  return {
    id: 1,
    isSpecial: false,
    updatedAt: '',
    createdAt: '',
    edition: edition({ year: 2025 }),
    category: category({ is: 'Vefur ársins' }),
    ...partial,
  } as AwardWinnerAllLocales
}

function view(partial: Partial<AwardWinnerView> & { siteName: string; year: number }) {
  return {
    id: 1,
    category: 'Vefur ársins',
    categoryLocale: 'is',
    blurb: null,
    url: null,
    screenshot: null,
    ...partial,
  } as AwardWinnerView
}

describe('toCategory', () => {
  it('reports the locale a name fell back to, so the cell can be marked', () => {
    expect(toCategory(category({ is: 'Aðgengi' }), 'en')).toEqual({
      id: 1,
      name: 'Aðgengi',
      nameLocale: 'is',
    })
    expect(toCategory(category({ is: 'Aðgengi', en: 'Accessibility' }), 'en')).toEqual({
      id: 1,
      name: 'Accessibility',
      nameLocale: 'en',
    })
  })
})

describe('toWinner', () => {
  it('takes the year from the related edition', () => {
    expect(toWinner(winner({ siteName: 'nafn.is' }), 'is')?.year).toBe(2025)
  })

  it('drops a row whose relationships were not resolved', () => {
    // A card with no year and no category says almost nothing; a half-built card
    // is worse than one fewer card, and this is a read-depth bug, not missing data.
    expect(toWinner(winner({ siteName: 'nafn.is', edition: 7 }), 'is')).toBeNull()
    expect(toWinner(winner({ siteName: 'nafn.is', category: 7 }), 'is')).toBeNull()
  })

  it('keeps a missing blurb as null rather than an empty string', () => {
    // 2020–2024 have no jury notes until the historical import lands, and the
    // card renders nothing at all rather than an empty paragraph.
    expect(toWinner(winner({ siteName: 'appid.is' }), 'is')?.blurb).toBeNull()
  })

  it('ignores an unresolved screenshot relationship', () => {
    expect(toWinner(winner({ siteName: 'nafn.is', screenshot: 12 }), 'is')?.screenshot).toBeNull()
  })
})

describe('pickCeremonyEdition', () => {
  it('picks the latest edition that has a date, not the latest edition', () => {
    const editions = [
      edition({ year: 2027 }),
      edition({ year: 2026, ceremonyDate: '2026-11-14T19:30:00.000Z' }),
      edition({ year: 2025, ceremonyDate: '2025-11-15T12:00:00.000Z' }),
    ]
    expect(pickCeremonyEdition(editions)?.year).toBe(2026)
  })

  it('is null when no edition has a date yet', () => {
    expect(pickCeremonyEdition([edition({ year: 2026 })])).toBeNull()
  })

  it('does not depend on the current time', () => {
    // The page is prerendered and revalidated, so "the next ceremony in the
    // future" would be answered when the page was last rendered rather than when
    // it is read. A date long past still yields a block; the board retires it by
    // creating the next edition.
    const editions = [edition({ year: 2019, ceremonyDate: '2019-11-14T19:30:00.000Z' })]
    expect(pickCeremonyEdition(editions)?.year).toBe(2019)
  })
})

describe('toCeremony', () => {
  const full = edition({
    year: 2026,
    ceremonyDate: '2026-11-14T19:30:00.000Z',
    venue: 'Harpa, Silfurberg',
    headline: { is: '14. nóvember í Hörpu' },
    submissionDeadline: '2026-10-10T23:59:00.000Z',
    submissionUrl: 'https://svef.is/innsending',
    ticketsOnSaleFrom: '2026-09-01T09:00:00.000Z',
    ticketUrl: 'https://svef.is/midar',
  })

  it('carries the whole block through', () => {
    expect(toCeremony(full, 'is')).toEqual({
      year: 2026,
      headline: '14. nóvember í Hörpu',
      headlineLocale: 'is',
      ceremonyDate: '2026-11-14T19:30:00.000Z',
      venue: 'Harpa, Silfurberg',
      submissionDeadline: '2026-10-10T23:59:00.000Z',
      submissionUrl: 'https://svef.is/innsending',
      ticketsOnSaleFrom: '2026-09-01T09:00:00.000Z',
      ticketUrl: 'https://svef.is/midar',
    })
  })

  it('reports an untranslated headline as Icelandic', () => {
    const ceremony = toCeremony(full, 'en')
    expect(ceremony?.headline).toBe('14. nóvember í Hörpu')
    expect(ceremony?.headlineLocale).toBe('is')
  })

  it('leaves the headline null when none has been written, for the page to compose', () => {
    const bare = edition({ year: 2026, ceremonyDate: '2026-11-14T19:30:00.000Z' })
    expect(toCeremony(bare, 'is')?.headline).toBeNull()
  })

  it('is null without a date — a block of blanks is worse than no block', () => {
    expect(toCeremony(edition({ year: 2026, venue: 'Harpa' }), 'is')).toBeNull()
  })
})

describe('toArchive', () => {
  const editions = [2026, 2025, 2024, 2023].map((year) => edition({ year }))
  const winners = [
    view({ siteName: 'nafn.is', year: 2025 }),
    view({ siteName: 'adgengi.is', year: 2025, id: 2 }),
    view({ siteName: 'vefur24.is', year: 2024, id: 3 }),
  ]

  it('leaves out the edition the ceremony block is about', () => {
    // 2026 has no winners because they have not been chosen yet. An empty tab for
    // it would read as missing data directly under a block announcing the date.
    expect(toArchive(editions, winners, 2026).map((y) => y.year)).toEqual([2025, 2024, 2023])
  })

  it('keeps years that have nothing recorded yet', () => {
    // 2020–2024 are real editions with no data until svef/www#31 imports it.
    // Dropping them would shorten the association's history to one year.
    const archive = toArchive(editions, winners, 2026)
    expect(archive.find((y) => y.year === 2023)?.winners).toEqual([])
  })

  it('groups winners under their own year, newest first', () => {
    const archive = toArchive(editions, winners, 2026)
    expect(archive[0]?.year).toBe(2025)
    expect(archive[0]?.winners.map((w) => w.siteName)).toEqual(['nafn.is', 'adgengi.is'])
    expect(archive[1]?.winners.map((w) => w.siteName)).toEqual(['vefur24.is'])
  })

  it('lists every edition when there is no ceremony to exclude', () => {
    expect(toArchive(editions, winners, null).map((y) => y.year)).toEqual([2026, 2025, 2024, 2023])
  })

  it('sorts by year rather than trusting the order the rows arrived in', () => {
    const shuffled = [2023, 2026, 2024, 2025].map((year) => edition({ year }))
    expect(toArchive(shuffled, [], null).map((y) => y.year)).toEqual([2026, 2025, 2024, 2023])
  })
})
