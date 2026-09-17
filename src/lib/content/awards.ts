import { cache } from 'react'
import { getPayload, publicReadArgs } from '@/lib/payload'
import type { Locale } from '@/lib/i18n'
import {
  pickCeremonyEdition,
  toArchive,
  toCategory,
  toCeremony,
  toWinner,
  type AwardCategoryAllLocales,
  type AwardCategoryView,
  type AwardEditionAllLocales,
  type AwardWinnerAllLocales,
  type AwardWinnerView,
  type AwardYearView,
  type AwardsPageAllLocales,
  type CeremonyView,
} from './awards-mapping'
import { pickLocalized } from '@/lib/localized'
import type { AwardsPage } from '@/payload-types'

/**
 * Reading the awards content for `/vefverdlaunin`.
 *
 * Same split as `./galleries.ts`: this module owns the Payload calls, the pure
 * shaping lives in `./awards-mapping.ts`, and the page imports from here.
 *
 * Three sources, because the design's awards page is three things: an editable
 * lead (`awards-page` global), the category list (`award-categories`), and the
 * ceremony plus the winners archive (`award-editions` + `award-winners`).
 */

export type {
  AwardCategoryView,
  AwardWinnerView,
  AwardYearView,
  CeremonyView,
  WinnerScreenshotView,
} from './awards-mapping'

/**
 * The page's lead paragraph.
 *
 * Cached per request so the page body and a future `generateMetadata` can each
 * ask for it without a second round trip.
 */
export const getAwardsIntro = cache(async function getAwardsIntro(
  locale: Locale,
): Promise<{ intro: AwardsPage['intro'] | null; introLocale: Locale }> {
  const payload = await getPayload()
  const doc = (await payload.findGlobal({
    slug: 'awards-page',
    ...publicReadArgs,
    depth: 0,
  })) as unknown as AwardsPageAllLocales
  const intro = pickLocalized(doc.intro, locale)
  return { intro: intro.value ?? null, introLocale: intro.locale }
})

/**
 * The award categories, in the order the board puts them in.
 *
 * `sort: 'order'` rather than relying on the collection's `defaultSort`, for the
 * same reason the board roster sorts explicitly: the grid numbers its cells 01–13
 * from their position, so an arbitrary order out of Postgres would renumber the
 * categories on a deploy.
 *
 * `pagination: false` because there are thirteen of them and Payload's `find`
 * defaults to ten. Without it the grid would end at "App ársins" — a page that
 * looks entirely healthy while being three categories short, which is exactly the
 * failure CLAUDE.md warns about.
 */
export const listAwardCategories = cache(async function listAwardCategories(
  locale: Locale,
): Promise<AwardCategoryView[]> {
  const payload = await getPayload()
  const { docs } = await payload.find({
    collection: 'award-categories',
    ...publicReadArgs,
    select: { name: true, order: true },
    sort: 'order',
    pagination: false,
    depth: 0,
  })
  return (docs as unknown as AwardCategoryAllLocales[]).map((doc) => toCategory(doc, locale))
})

/**
 * Every edition, newest first.
 *
 * Unpaginated again: there are seven today and one is added a year, so the
 * default limit of ten is a deadline rather than a limit — the archive would
 * silently lose its oldest years in 2029.
 */
const listEditions = cache(async function listEditions(): Promise<AwardEditionAllLocales[]> {
  const payload = await getPayload()
  const { docs } = await payload.find({
    collection: 'award-editions',
    ...publicReadArgs,
    sort: '-year',
    pagination: false,
    depth: 0,
  })
  return docs as unknown as AwardEditionAllLocales[]
})

/**
 * The upcoming ceremony, or null when no edition has a date yet.
 *
 * Null is a real state, not a failure: an association that has not fixed next
 * November's date yet should show a page without a ceremony block rather than a
 * block with blanks in it.
 */
export const getCeremony = cache(async function getCeremony(
  locale: Locale,
): Promise<CeremonyView | null> {
  const edition = pickCeremonyEdition(await listEditions())
  return edition ? toCeremony(edition, locale) : null
})

/**
 * The winners archive: every past edition with whatever has been recorded for it.
 *
 * `depth: 1` is what the card costs — the year comes from the related edition,
 * the label from the related category and the thumbnail from the related upload,
 * and all three are one hop away. `populate` then narrows the two relationship
 * sides to the fields the card actually reads, so resolving a winner does not
 * drag every edition's ceremony copy across to print a year.
 *
 * `pagination: false` for the third time, and here it matters most: six winners a
 * year against a default limit of ten means the archive would start losing rows
 * the moment the historical import (svef/www#31) lands, and would look fine doing
 * it.
 *
 * Sorted by site name, which is the only ordering the design implies inside a
 * year — the grid is a set of equals, not a ranking. The grouping into years is
 * a decision, not a lookup (which years appear at all, and what an empty one
 * means), so it lives in the mapping module and is tested without a database.
 */
export const getWinnersArchive = cache(async function getWinnersArchive(
  locale: Locale,
  featuredYear: number | null,
): Promise<AwardYearView[]> {
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
  return toArchive(await listEditions(), winners, featuredYear)
})
