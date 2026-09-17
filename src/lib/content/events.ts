import { cache } from 'react'
import { getPayload, publicReadArgs } from '@/lib/payload'
import type { Locale } from '@/lib/i18n'
import {
  isPastEvent,
  toEventDetail,
  toEventSummary,
  type EventAllLocales,
  type EventDetail,
  type EventSummary,
} from './events-mapping'

/**
 * Reading the `events` collection for the public site.
 *
 * Same split as `./news.ts`: pages stay layout and copy, this module owns the
 * Payload reads, and `./events-mapping.ts` — which has no I/O in it — owns the
 * shaping. See the note at the top of `./news.ts` for why that boundary exists.
 *
 * One difference worth naming: **events have no visibility filter.** News has
 * `publishedAt`, so every read there repeats `publishedAt <= now`. An event
 * document is public the moment it is saved, and `startDate` is a fact about the
 * event rather than a switch controlling whether the page exists — an event in
 * the past still has a page, it is simply listed under "Liðnir viðburðir". So
 * there is no filter to keep in step between the page and
 * `generateStaticParams`, and nothing here relies on the render-time clock for
 * whether a page exists at all.
 */

export type { EventDetail, EventImage, EventSummary } from './events-mapping'

/**
 * A past event, plus the album of photos from it, when there is one.
 *
 * `galleryId` is the `galleries` document id, which `/myndir` renders as the
 * DOM id `album-<id>` on each album's heading. The card links at that anchor so
 * "Myndir frá viðburði →" lands on the right album rather than the top of a
 * page of them. That is a contract between two pages and nothing in the link
 * checker can see it — a cross-page `#fragment` is not resolved — so
 * `e2e/event.spec.ts` follows the link and asserts the target exists.
 */
export type PastEvent = EventSummary & { galleryId: number | null }

export type EventLists = {
  /**
   * Not yet over, **soonest first**. The order is the point of the list: an
   * upcoming list sorted newest-first puts the thing furthest away at the top
   * and the thing happening this week at the bottom.
   */
  upcoming: EventSummary[]
  /** Already over, most recent first — an archive reads backwards. */
  past: PastEvent[]
}

/**
 * Fields a list read needs.
 *
 * `description` is in here, unlike the news index's `select`, because the meta
 * line under each row ends in the body's first sentence (see `leadSentence`).
 * The prices, address and accessibility note are not: nothing on the index
 * prints them.
 */
const SUMMARY_FIELDS = {
  slug: true,
  startDate: true,
  endDate: true,
  title: true,
  location: true,
  description: true,
  ticketUrl: true,
} as const

/**
 * Every event, split into upcoming and past.
 *
 * One unpaginated query, split in memory rather than two queries with
 * complementary `where` clauses. Two reasons: the association runs a handful of
 * events a year, so the whole collection is smaller than either query's
 * overhead; and the split is on `endDate ?? startDate`, which is a coalesce
 * Payload's query language cannot express — writing it as SQL-ish `where` would
 * mean the two lists disagree about an event that is happening right now, and
 * it would either appear twice or vanish.
 *
 * Cached per request, so the page and anything else on it read the collection
 * once.
 */
export const listEvents = cache(async function listEvents(
  locale: Locale,
): Promise<EventLists> {
  const payload = await getPayload()
  const { docs } = await payload.find({
    collection: 'events',
    ...publicReadArgs,
    select: SUMMARY_FIELDS,
    sort: 'startDate',
    pagination: false,
    depth: 0,
  })

  const now = Date.now()
  const all = docs as unknown as EventAllLocales[]
  const past = all.filter((doc) => isPastEvent(doc, now)).reverse()
  const upcoming = all.filter((doc) => !isPastEvent(doc, now))

  const galleries = await galleriesByEvent(past.map((doc) => doc.id))

  return {
    upcoming: upcoming.map((doc) => toEventSummary(doc, locale)),
    past: past.map((doc) => ({
      ...toEventSummary(doc, locale, { past: true }),
      galleryId: galleries.get(doc.id) ?? null,
    })),
  }
})

/**
 * Event id → the id of the album of photos from it.
 *
 * The past-event card offers "Myndir frá viðburði →", and offering it for an
 * event with no photos is a link to an empty promise. One query for the whole
 * list rather than one per card.
 *
 * An event with more than one album keeps the first: the link is "photos from
 * this event", and sending someone to one of two albums beats sending them to
 * neither. `sort` pins which one that is, so the link does not move between
 * builds on whatever order Postgres felt like.
 *
 * Skipped entirely when there are no past events, because `{ in: [] }` is a
 * query with a knowable answer.
 */
async function galleriesByEvent(eventIds: number[]): Promise<Map<number, number>> {
  if (eventIds.length === 0) return new Map()
  const payload = await getPayload()
  const { docs } = await payload.find({
    collection: 'galleries',
    ...publicReadArgs,
    where: { event: { in: eventIds } },
    select: { event: true },
    sort: 'id',
    pagination: false,
    depth: 0,
  })
  const byEvent = new Map<number, number>()
  for (const doc of docs) {
    const eventId = typeof doc.event === 'number' ? doc.event : (doc.event?.id ?? null)
    if (eventId === null || byEvent.has(eventId)) continue
    byEvent.set(eventId, doc.id)
  }
  return byEvent
}

/**
 * One event by slug, or `null` when there is no such event.
 *
 * `depth: 1` so the cover image and the gallery uploads come back resolved
 * rather than as ids.
 *
 * Cached per request, and load-bearing: `generateMetadata` and the page body
 * each resolve the event independently, so without it every event view would
 * query Postgres twice for the same document.
 */
export const findEvent = cache(async function findEvent(
  slug: string,
  locale: Locale,
): Promise<EventDetail | null> {
  const payload = await getPayload()
  const { docs } = await payload.find({
    collection: 'events',
    ...publicReadArgs,
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 1,
  })
  const doc = docs[0] as unknown as EventAllLocales | undefined
  return doc ? toEventDetail(doc, locale) : null
})

/**
 * The slug of the next event that has not happened yet, or `null`.
 *
 * Both the index and the detail page mark it "NÆSTI VIÐBURÐUR", and that is a
 * position in a sorted list rather than a flag on the document — a `featured`
 * checkbox someone forgets to move is how a site ends up pinning last month's
 * event. Reading it means the badge is right without anyone maintaining it.
 */
export const nextEventSlug = cache(async function nextEventSlug(): Promise<string | null> {
  const payload = await getPayload()
  const { docs } = await payload.find({
    collection: 'events',
    ...publicReadArgs,
    select: { slug: true, startDate: true, endDate: true },
    sort: 'startDate',
    pagination: false,
    depth: 0,
  })
  const now = Date.now()
  const next = (docs as unknown as EventAllLocales[]).find((doc) => !isPastEvent(doc, now))
  return next?.slug ?? null
})

/**
 * Every event slug, for `generateStaticParams` on `/vidburdir/[slug]`.
 *
 * All of them, past included: a past event keeps its page, so there is no
 * visibility filter to mirror here — unlike `/frettir/[slug]`, where leaving
 * future-dated articles out of this list is what keeps them 404ing.
 *
 * `slug` is not localized, so this is one list and Next crosses it with the
 * `[locale]` params the layout above generates.
 *
 * `pagination: false` is load-bearing, not tidy: Payload's `find` defaults to
 * `limit: 10`, and without it the eleventh event onwards would fall through to
 * `dynamicParams` with no symptom at all — green build, `●` in the route table.
 * Seven fixtures would never show it.
 */
export const listEventSlugs = cache(async function listEventSlugs(): Promise<string[]> {
  const payload = await getPayload()
  const { docs } = await payload.find({
    collection: 'events',
    ...publicReadArgs,
    select: { slug: true },
    sort: 'startDate',
    pagination: false,
    depth: 0,
  })
  return docs.map((doc) => doc.slug).filter((slug): slug is string => Boolean(slug))
})

/** Fallback for the contact address, matching `SiteSettings`' own default. */
const DEFAULT_CONTACT_EMAIL = 'svef@svef.is'

/**
 * The association's contact address, for the event page's "SPURNINGAR" entry.
 *
 * Read from `SiteSettings` rather than added to the `events` collection: it is
 * the same address for every event, and a per-event copy is a per-event chance
 * to be out of date. Not localized — an email address has no translation.
 */
export const contactEmail = cache(async function contactEmail(): Promise<string> {
  const payload = await getPayload()
  const settings = await payload.findGlobal({ slug: 'site-settings', ...publicReadArgs })
  return settings?.contactEmail || DEFAULT_CONTACT_EMAIL
})
