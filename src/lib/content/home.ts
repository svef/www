import { cache } from 'react'
import { getPayload, publicReadArgs } from '@/lib/payload'
import type { Locale } from '@/lib/i18n'
import { toWinner, type AwardWinnerAllLocales, type AwardWinnerView } from './awards-mapping'
import { listGalleries } from './galleries'
import {
  pickRecentWinners,
  recentPhotos,
  toHomeSettings,
  type HomePageAllLocales,
  type HomeSettings,
} from './home-mapping'
import type { GalleryPhoto } from './galleries-mapping'

/**
 * Reading the home page's content.
 *
 * Same split as `./awards.ts`: this module owns the Payload calls, the pure
 * shaping and the choosing live in `./home-mapping.ts`, and the page imports
 * from here.
 *
 * The home page is a shop window onto four sources — the `home-page` global for
 * what it shows and the copy above the fold, `events` for the next ones,
 * `award-winners` for the "Verðlaunavefir" strip and `galleries` for the photos
 * — so each is a function of its own rather than one read that returns
 * everything. A section the global turns off then costs no query at all.
 */

export type { HomeSettings, SpotlightMode } from './home-mapping'

/** How many winner cards the design's "Verðlaunavefir" strip draws. */
export const RECENT_WINNER_COUNT = 3

/** How many tiles the design's photo strip draws. */
export const HOME_PHOTO_COUNT = 4

/**
 * What the home page shows, and the copy above the fold.
 *
 * Cached per request so the page body and a future `generateMetadata` can each
 * ask for it without a second round trip.
 *
 * `depth: 0` deliberately: the only relationship on the global is the spotlight
 * winner, and resolving it here would pull a winner's edition and category
 * across on every render of every home page, including the ones whose spotlight
 * is an event. `findSpotlightWinner` fetches it by id when it is actually
 * wanted.
 */
export const getHomeSettings = cache(async function getHomeSettings(
  locale: Locale,
): Promise<HomeSettings> {
  const payload = await getPayload()
  const doc = (await payload.findGlobal({
    slug: 'home-page',
    ...publicReadArgs,
    depth: 0,
  })) as unknown as HomePageAllLocales
  return toHomeSettings(doc, locale)
})

/**
 * The winner the spotlight is about, or null when it cannot be resolved.
 *
 * Null covers two cases that look the same to the page and should: no winner has
 * been picked, and one has been picked but the document is gone. Either way
 * there is nothing to put in the panel, and a panel with a blank in it is worse
 * than no panel.
 *
 * `depth: 1` for the same reason the archive read uses it — the year comes from
 * the related edition and the category label from the related category.
 */
export const findSpotlightWinner = cache(async function findSpotlightWinner(
  id: number | null,
  locale: Locale,
): Promise<AwardWinnerView | null> {
  if (id === null) return null
  const payload = await getPayload()
  const { docs } = await payload.find({
    collection: 'award-winners',
    ...publicReadArgs,
    where: { id: { equals: id } },
    populate: {
      'award-editions': { year: true },
      'award-categories': { name: true },
    },
    limit: 1,
    depth: 1,
  })
  const doc = docs[0] as unknown as AwardWinnerAllLocales | undefined
  return doc ? toWinner(doc, locale) : null
})

/**
 * The most recent award winners, for the "Verðlaunavefir" strip.
 *
 * Reads every winner and picks in memory. That is not laziness: the year the
 * ordering is by lives on the related edition, so the database cannot sort by it
 * without a join Payload's query language does not express — see
 * `pickRecentWinners`. Six winners a year against a collection that starts in
 * 2000 stays small enough that reading it whole is cheaper than the alternative,
 * and `pagination: false` is what keeps "every winner" true: Payload's `find`
 * defaults to ten, so without it the strip would quietly start choosing its three
 * from whichever ten rows came back first.
 */
export const listRecentWinners = cache(async function listRecentWinners(
  locale: Locale,
  limit: number = RECENT_WINNER_COUNT,
): Promise<AwardWinnerView[]> {
  const payload = await getPayload()
  const { docs } = await payload.find({
    collection: 'award-winners',
    ...publicReadArgs,
    populate: {
      'award-editions': { year: true },
      'award-categories': { name: true },
    },
    sort: 'siteName',
    pagination: false,
    depth: 1,
  })
  const winners = (docs as unknown as AwardWinnerAllLocales[])
    .map((doc) => toWinner(doc, locale))
    .filter((winner): winner is AwardWinnerView => winner !== null)
  return pickRecentWinners(winners, limit)
})

/**
 * What the home page's photo strip has to work with.
 *
 * `hasAlbums` is carried alongside the photos because the two empty cases are
 * not the same thing, and the page draws them differently. No albums at all
 * means the association has not published photos from an event yet, and the
 * section says so. Albums that exist but whose images have not been uploaded
 * yet is the ordinary lag between an event and its photos — `/myndir` draws
 * placeholder tiles for exactly that state, and the strip teasing it with an
 * empty state would contradict the page it links to.
 */
export type HomePhotos = {
  photos: GalleryPhoto[]
  hasAlbums: boolean
}

/**
 * The newest photos on the site, for the home page's strip.
 *
 * Built on `listGalleries` rather than a read of its own, and that is the point:
 * it is `cache`d, so the home page pays for the albums once whether or not
 * anything else on it asks, and the strip is guaranteed to show the same photos,
 * in the same order, that `/myndir` shows at the top of its first album.
 */
export const listHomePhotos = cache(async function listHomePhotos(
  locale: Locale,
  limit: number = HOME_PHOTO_COUNT,
): Promise<HomePhotos> {
  const albums = await listGalleries(locale)
  return { photos: recentPhotos(albums, limit), hasAlbums: albums.length > 0 }
})
