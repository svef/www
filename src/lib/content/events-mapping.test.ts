import { describe, it, expect } from 'vitest'
import {
  buildMeta,
  isPastEvent,
  leadSentence,
  toEventDetail,
  toEventSummary,
  type EventAllLocales,
} from './events-mapping'

/**
 * A Lexical editor state with one paragraph per string.
 *
 * Cast rather than typed: Payload's generated editor-state type is a deep
 * structural shape whose every node carries `version`, `format`, `indent` and
 * the rest, and spelling all of that out per fixture would be a test about
 * Lexical rather than about the mapping. `leadSentence` reads two properties.
 */
function body(...paragraphs: string[]) {
  return {
    root: {
      type: 'root',
      children: paragraphs.map((text) => ({
        type: 'paragraph',
        children: [{ type: 'text', text }],
      })),
    },
  } as never
}

/** A `locale: 'all'` event document, with only what a test cares about set. */
function doc(overrides: Partial<EventAllLocales> = {}): EventAllLocales {
  return {
    id: 1,
    slug: 'kludurkvold',
    startDate: '2026-10-09T20:00:00.000Z',
    endDate: null,
    title: { is: 'Klúðurkvöld' },
    location: { is: 'Grandi 101' },
    description: null,
    accessibility: null,
    venueAddress: null,
    ticketUrl: null,
    ticketPrice: null,
    memberPrice: null,
    coverImage: null,
    gallery: null,
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as unknown as EventAllLocales
}

/** The no-break space `Intl.NumberFormat` puts between amount and unit. */
const NBSP = /\u00a0/g

describe('isPastEvent', () => {
  const start = '2026-10-09T20:00:00.000Z'

  it('measures against the end, so an event in progress is still upcoming', () => {
    const during = new Date('2026-10-09T21:00:00.000Z').getTime()
    expect(
      isPastEvent({ startDate: start, endDate: '2026-10-09T23:00:00.000Z' }, during),
    ).toBe(false)
  })

  it('falls back to the start when there is no end', () => {
    const after = new Date('2026-10-09T21:00:00.000Z').getTime()
    expect(isPastEvent({ startDate: start, endDate: null }, after)).toBe(true)
  })

  it('is past once the end has gone by', () => {
    const later = new Date('2026-10-10T09:00:00.000Z').getTime()
    expect(
      isPastEvent({ startDate: start, endDate: '2026-10-09T23:00:00.000Z' }, later),
    ).toBe(true)
  })

  it('treats an unparseable date as not past, so a broken row still lists', () => {
    expect(isPastEvent({ startDate: 'nonsense', endDate: null }, Date.now())).toBe(false)
  })
})

describe('leadSentence', () => {
  it('takes the first paragraph', () => {
    expect(leadSentence(body('First.', 'Second.'))).toBe('First.')
  })

  it('skips a body that opens with something other than a paragraph', () => {
    const headingFirst = {
      root: {
        type: 'root',
        children: [
          { type: 'heading', tag: 'h2', children: [{ type: 'text', text: 'Dagskrá' }] },
          { type: 'paragraph', children: [{ type: 'text', text: 'Fyrsta.' }] },
        ],
      },
    } as never
    // The first *paragraph*, not the first node: a heading is not a summary.
    expect(leadSentence(headingFirst)).toBe('Fyrsta.')
  })

  it('joins the runs of a paragraph that has mixed formatting', () => {
    const mixed = {
      root: {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            children: [
              { type: 'text', text: 'Tuttugu ' },
              { type: 'text', text: 'sæti.' },
            ],
          },
        ],
      },
    } as never
    expect(leadSentence(mixed)).toBe('Tuttugu sæti.')
  })

  it('is null for an empty or missing body', () => {
    expect(leadSentence(null)).toBeNull()
    expect(leadSentence(body(''))).toBeNull()
  })
})

describe('buildMeta', () => {
  it('reads as the design writes it', () => {
    expect(
      buildMeta({ location: 'Grandi 101', time: '20:00', summary: 'Afslappað kvöld.' }),
    ).toBe('Grandi 101 · 20:00 — Afslappað kvöld.')
  })

  it('leaves no dangling separator when a part is missing', () => {
    expect(buildMeta({ location: 'Harpa', time: null, summary: 'Uppselt.' })).toBe(
      'Harpa — Uppselt.',
    )
    expect(buildMeta({ location: null, time: '20:00', summary: null })).toBe('20:00')
    expect(buildMeta({ location: 'Harpa', time: null, summary: null })).toBe('Harpa')
  })

  it('is null when there is nothing to say', () => {
    expect(buildMeta({ location: null, time: null, summary: null })).toBeNull()
  })
})

describe('toEventSummary', () => {
  it('links at the locale-correct path', () => {
    expect(toEventSummary(doc(), 'is').href).toBe('/vidburdir/kludurkvold')
    expect(toEventSummary(doc(), 'en').href).toBe('/en/vidburdir/kludurkvold')
  })

  it('drops the clock time for a past event', () => {
    // What time something that already happened started is not information the
    // archive needs, and the design's past cards do not carry it.
    expect(toEventSummary(doc(), 'is', { past: true }).meta).toBe('Grandi 101')
    expect(toEventSummary(doc(), 'is').meta).toBe('Grandi 101 · 20:00')
  })

  it('reports the locale each field actually ended up in', () => {
    const translated = doc({
      title: { is: 'Klúðurkvöld', en: 'Mistakes Night' },
      location: { is: 'Grandi 101' },
    })
    const summary = toEventSummary(translated, 'en')
    expect(summary.title).toBe('Mistakes Night')
    expect(summary.contentLocale).toBe('en')
    // The venue has no English, so the meta line is Icelandic even though the
    // headline above it is not.
    expect(summary.metaLocale).toBe('is')
  })

  it('falls back to Icelandic and says so', () => {
    const summary = toEventSummary(doc(), 'en')
    expect(summary.title).toBe('Klúðurkvöld')
    expect(summary.contentLocale).toBe('is')
  })

  it('reports the title locale when there is no meta line to mark', () => {
    const bare = doc({ location: null, description: null })
    expect(toEventSummary(bare, 'is').metaLocale).toBe('is')
  })
})

describe('toEventDetail', () => {
  const full = doc({
    slug: 'islensku-vefverdlaunin-2026',
    startDate: '2026-11-14T19:30:00.000Z',
    endDate: '2026-11-15T01:00:00.000Z',
    title: { is: 'Íslensku vefverðlaunin 2026' },
    location: { is: 'Harpa, Silfurberg' },
    venueAddress: 'Austurbakki 2, 101 Reykjavík',
    ticketUrl: 'https://example.is/midar',
    ticketPrice: 18900,
    memberPrice: 15120,
    accessibility: { is: 'Hjólastólaaðgengi.' },
    description: { is: body('Haldin í 26. sinn.') },
  })

  it('formats the prices and derives the discount', () => {
    const detail = toEventDetail(full, 'is')
    // `Intl` uses a no-break space before the unit; normalised so the assertion
    // is about the number and not about an invisible byte.
    expect(detail.ticketPrice?.replace(NBSP, ' ')).toBe('18.900 kr.')
    expect(detail.memberPrice?.replace(NBSP, ' ')).toBe('15.120 kr.')
    expect(detail.memberDiscount).toBe(20)
  })

  it('keeps the venue name and the street line apart', () => {
    // The sidebar prints them on two lines and the index rows print the venue
    // alone, so they cannot be one field.
    const detail = toEventDetail(full, 'is')
    expect(detail.location).toBe('Harpa, Silfurberg')
    expect(detail.venueAddress).toBe('Austurbakki 2, 101 Reykjavík')
  })

  it('gives the time as a range that may cross midnight', () => {
    expect(toEventDetail(full, 'is').timeRange).toBe('19:30 — 01:00')
  })

  it('keeps the range off the index meta line, which shows the start alone', () => {
    // A spaced em dash inside the range would collide with the ` — ` that joins
    // the venue to the summary, so the row would read as having two separators.
    const detail = toEventDetail(full, 'is')
    expect(detail.startTime).toBe('19:30')
    expect(detail.meta).not.toContain('01:00')
  })

  it('leaves the ticket fields null when there is nothing to sell', () => {
    const detail = toEventDetail(doc(), 'is')
    expect(detail.ticketUrl).toBeNull()
    expect(detail.ticketPrice).toBeNull()
    expect(detail.memberDiscount).toBeNull()
  })

  it('reports the body locale separately from the title', () => {
    const halfTranslated = doc({
      title: { is: 'Klúðurkvöld', en: 'Mistakes Night' },
      description: { is: body('Sjö sögur.') },
    })
    const detail = toEventDetail(halfTranslated, 'en')
    expect(detail.contentLocale).toBe('en')
    expect(detail.bodyLocale).toBe('is')
  })

  it('drops gallery entries that came back as bare ids', () => {
    // At depth 0 an upload relationship is a number; there is nothing to render.
    const detail = toEventDetail(doc({ gallery: [7, 8] }), 'is')
    expect(detail.photos).toEqual([])
  })
})
