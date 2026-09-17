import { cache } from 'react'
import { getPayload, publicReadArgs } from '@/lib/payload'
import type { Locale } from '@/lib/i18n'
import {
  byNewestFirst,
  toGalleryAlbum,
  type GalleryAllLocales,
  type GalleryAlbum,
} from './galleries-mapping'

/**
 * Reading the `galleries` collection for the public site.
 *
 * Same split as `./news.ts`: this module owns the Payload read, the pure
 * shaping lives in `./galleries-mapping.ts`, and `/myndir` imports from here.
 */

export type { GalleryAlbum, GalleryPhoto } from './galleries-mapping'

/**
 * Fields an album read needs.
 *
 * `event` is selected for one value — the venue behind the design's
 * `HARPA · 15. NÓV 2025 · 24 MYNDIR` meta line. Venue lives on `events.location`
 * rather than on the album, so there is nothing to read without it.
 */
const ALBUM_FIELDS = {
  title: true,
  date: true,
  event: true,
  images: true,
} as const

/**
 * Every album, newest first.
 *
 * Unpaginated, and `pagination: false` rather than a raised `limit`: Payload's
 * `find` defaults to ten, and a page that silently stopped listing the
 * eleventh album would look entirely healthy. Albums are a handful a year, so
 * there is nothing to page through yet; paging is worth adding the day the
 * archive outgrows one page.
 *
 * `depth: 2` is what the venue costs. The album's `event` is one hop and the
 * `images[].image` uploads are another, and the meta line and the thumbnails
 * need both resolved rather than left as ids. `populate` then narrows the event
 * side of that to the one field the meta line reads: without it, resolving
 * `event` drags each event's whole localized record across, rich-text
 * `description` included, to print a venue name. Same reasoning as the `select`
 * on the news read.
 *
 * The final ordering is applied in JS rather than left to `sort` alone.
 * `date` is optional, and Postgres orders `DESC` NULLS FIRST, so an album an
 * editor saved before filling in its date would sort above every dated album on
 * the page — the one place it is most conspicuous. The SQL sort still does the
 * work; `byNewestFirst` only moves the undated ones to the end, and it is a
 * pure comparator so it can be tested without a database.
 *
 * Cached per request, so a second reader — a future album-count on the home
 * page, say — costs no extra query.
 */
export const listGalleries = cache(async function listGalleries(
  locale: Locale,
): Promise<GalleryAlbum[]> {
  const payload = await getPayload()
  const { docs } = await payload.find({
    collection: 'galleries',
    ...publicReadArgs,
    select: ALBUM_FIELDS,
    populate: { events: { location: true } },
    sort: '-date',
    pagination: false,
    depth: 2,
  })
  return (docs as unknown as GalleryAllLocales[])
    .map((doc) => toGalleryAlbum(doc, locale))
    .sort(byNewestFirst)
})
