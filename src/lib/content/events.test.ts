import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { contactEmail, findEvent, listEvents, listEventSlugs, nextEventSlug } from './events'

/**
 * The reading layer, with Payload's Local API stubbed — same arrangement as
 * `news.test.ts`, and for the same reason: what is worth asserting here is the
 * *query* this module sends. The upcoming/past split, the `pagination: false`
 * guard and the "read as an anonymous visitor" contract are all decisions made
 * in the arguments, and a database would only hide them.
 */
const find = vi.fn()
const findGlobal = vi.fn()
vi.mock('@/lib/payload', async () => {
  const actual = await vi.importActual<typeof import('@/lib/payload')>('@/lib/payload')
  return { ...actual, getPayload: async () => ({ find, findGlobal }) }
})

// React's `cache()` is per-request; in a test every call is the same "request",
// so each test resets the modules it shares. Vitest gives each *file* a fresh
// module registry, and within this file the readers are called once each.
const NOW = new Date('2026-09-17T12:00:00.000Z')

function event(overrides: Record<string, unknown>) {
  return {
    id: 1,
    slug: 'kludurkvold',
    startDate: '2026-10-09T20:00:00.000Z',
    endDate: null,
    title: { is: 'Klúðurkvöld' },
    location: { is: 'Grandi 101' },
    description: null,
    ticketUrl: null,
    ...overrides,
  }
}

const PAST = event({ id: 1, slug: 'lidinn', startDate: '2026-03-13T12:00:00.000Z' })
const SOON = event({ id: 2, slug: 'naesti', startDate: '2026-09-21T12:00:00.000Z' })
const LATER = event({ id: 3, slug: 'seinna', startDate: '2026-11-14T19:30:00.000Z' })

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  find.mockReset()
  findGlobal.mockReset()
  // Default: the events query, then the galleries query behind `hasGallery`.
  find.mockResolvedValue({ docs: [] })
  findGlobal.mockResolvedValue({ contactEmail: 'svef@svef.is' })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('listEvents', () => {
  beforeEach(() => {
    find.mockImplementation(async (args: { collection: string }) =>
      args.collection === 'galleries'
        ? { docs: [{ id: 42, event: 1 }] }
        : { docs: [PAST, SOON, LATER] },
    )
  })

  it('reads as an anonymous visitor, in every locale at once', async () => {
    await listEvents('is')
    const args = find.mock.calls[0][0]
    expect(args.collection).toBe('events')
    expect(args.locale).toBe('all')
    expect(args.overrideAccess).toBe(false)
  })

  it('sorts ascending, so the soonest event is first', async () => {
    // The literal this page replaced was ordered newest-first, which put the
    // event furthest away at the top of a list of what is coming up.
    await listEvents('is')
    expect(find.mock.calls[0][0].sort).toBe('startDate')
  })

  it('does not stop at Payload’s default limit of ten', async () => {
    await listEvents('is')
    expect(find.mock.calls[0][0].pagination).toBe(false)
  })

  it('splits on the event’s own dates, soonest first and archive backwards', async () => {
    const { upcoming, past } = await listEvents('is')
    expect(upcoming.map((e) => e.slug)).toEqual(['naesti', 'seinna'])
    expect(past.map((e) => e.slug)).toEqual(['lidinn'])
  })

  it('carries the album id, so the card can link at the right anchor', async () => {
    const { past } = await listEvents('is')
    expect(past[0].galleryId).toBe(42)
  })

  it('is null where there is no album, so no link is offered', async () => {
    find.mockImplementation(async (args: { collection: string }) =>
      args.collection === 'galleries' ? { docs: [] } : { docs: [PAST, SOON, LATER] },
    )
    const { past } = await listEvents('en')
    expect(past[0].galleryId).toBeNull()
  })

  it('keeps the first album when an event has more than one', async () => {
    // Sending someone to one of two albums beats sending them to neither, and
    // `sort: 'id'` is what stops the link moving between builds.
    find.mockImplementation(async (args: { collection: string }) =>
      args.collection === 'galleries'
        ? { docs: [{ id: 7, event: 1 }, { id: 9, event: 1 }] }
        : { docs: [PAST, SOON, LATER] },
    )
    const { past } = await listEvents('is')
    expect(past[0].galleryId).toBe(7)
    expect(find.mock.calls.find((c) => c[0].collection === 'galleries')?.[0].sort).toBe('id')
  })

  it('skips the gallery query entirely when nothing is past', async () => {
    find.mockReset()
    find.mockResolvedValue({ docs: [SOON, LATER] })
    await listEvents('en')
    expect(find.mock.calls.map((c) => c[0].collection)).toEqual(['events'])
  })
})

describe('findEvent', () => {
  it('resolves uploads, so the cover and photo strip are not bare ids', async () => {
    find.mockResolvedValue({ docs: [SOON] })
    await findEvent('naesti', 'is')
    expect(find.mock.calls[0][0].depth).toBe(1)
  })

  it('is null for a slug that does not exist, which the page turns into a 404', async () => {
    find.mockResolvedValue({ docs: [] })
    expect(await findEvent('engin-svona', 'is')).toBeNull()
  })

  it('applies no date filter — a past event keeps its page', async () => {
    find.mockResolvedValue({ docs: [PAST] })
    await findEvent('lidinn', 'is')
    expect(find.mock.calls[0][0].where).toEqual({ slug: { equals: 'lidinn' } })
  })
})

describe('nextEventSlug', () => {
  it('is the soonest event that has not finished', async () => {
    find.mockResolvedValue({ docs: [PAST, SOON, LATER] })
    expect(await nextEventSlug()).toBe('naesti')
  })
})

describe('listEventSlugs', () => {
  it('returns every event, unpaginated and unfiltered', async () => {
    find.mockResolvedValue({ docs: [PAST, SOON, LATER] })
    const slugs = await listEventSlugs()
    expect(slugs).toEqual(['lidinn', 'naesti', 'seinna'])
    const args = find.mock.calls[0][0]
    expect(args.pagination).toBe(false)
    expect(args.where).toBeUndefined()
  })
})

describe('contactEmail', () => {
  it('comes from SiteSettings rather than from the event', async () => {
    findGlobal.mockResolvedValue({ contactEmail: 'hallo@svef.is' })
    expect(await contactEmail()).toBe('hallo@svef.is')
  })
})
