import { pickLocalized, type AllLocales } from '@/lib/localized'
import type { Locale } from '@/lib/i18n'
import type { Event, Gallery, Media } from '@/payload-types'

/**
 * Shaping `galleries` documents into what `/myndir` renders.
 *
 * Pure, for the same reasons as `./news-mapping.ts`: `./galleries.ts` owns the
 * Payload read and calls in here, so the re-typing a `locale: 'all'` read
 * forces — Payload's generated types describe the resolved single-locale shape
 * — happens once per collection rather than once per page, and the fallback
 * resolution can be unit tested without a database.
 */

type MediaAllLocales = Omit<Media, 'alt' | 'caption'> & {
  alt: AllLocales<string>
  caption: AllLocales<string>
}

type EventAllLocales = Omit<Event, 'title' | 'location' | 'description'> & {
  title: AllLocales<string>
  location: AllLocales<string>
}

/** A `galleries` document as a `locale: 'all'` read actually returns it. */
export type GalleryAllLocales = Omit<Gallery, 'title' | 'event' | 'images'> & {
  title: AllLocales<string>
  event?: number | EventAllLocales | null
  images?:
    | {
        image: number | MediaAllLocales
        caption?: AllLocales<string>
        id?: string | null
      }[]
    | null
}

export type GalleryPhoto = {
  url: string
  /**
   * Alt text for the photo.
   *
   * The album row's own `caption` first, because that is what an editor writes
   * about this photo in this album; the media item's `alt` is the fallback for
   * a file reused across albums. Empty when neither exists — an unlabelled
   * photo is better announced as decorative than as a filename.
   */
  alt: string
  /** The row caption, when there is one. Shown under the photo in the lightbox. */
  caption: string | null
  width: number | null
  height: number | null
}

export type GalleryAlbum = {
  id: number
  title: string
  /** The album's date as an ISO instant, or null. Formatted for display by the page. */
  date: string | null
  /** Venue, taken from the related event's `location`. Null when unrelated or unset. */
  venue: string | null
  photos: GalleryPhoto[]
  /**
   * The language `title` is actually written in.
   *
   * Album titles are mostly event names that read the same in both languages,
   * so most of them are Icelandic-only by choice rather than by omission. The
   * page still marks them, for the same reason `/frettir` does: presenting
   * Icelandic as English is what a screen reader then pronounces as English.
   */
  contentLocale: Locale
  /** The language `venue` is in, when there is a venue. Follows the title otherwise. */
  venueLocale: Locale
}

function toPhoto(
  row: NonNullable<GalleryAllLocales['images']>[number],
  locale: Locale,
): GalleryPhoto | null {
  // depth 0 (or an unresolved relationship) leaves an id behind — nothing to render.
  if (!row.image || typeof row.image === 'number') return null
  if (!row.image.url) return null
  const caption = pickLocalized(row.caption, locale).value
  const alt = caption ?? pickLocalized(row.image.alt, locale).value
  return {
    url: row.image.url,
    alt: alt ?? '',
    caption: caption ?? null,
    width: row.image.width ?? null,
    height: row.image.height ?? null,
  }
}

export function toGalleryAlbum(doc: GalleryAllLocales, locale: Locale): GalleryAlbum {
  const title = pickLocalized(doc.title, locale)
  const event = doc.event && typeof doc.event !== 'number' ? doc.event : null
  const venue = pickLocalized(event?.location, locale)

  return {
    id: doc.id,
    title: title.value ?? '',
    date: doc.date ?? null,
    venue: venue.value,
    photos: (doc.images ?? [])
      .map((row) => toPhoto(row, locale))
      .filter((photo): photo is GalleryPhoto => photo !== null),
    contentLocale: title.locale,
    venueLocale: venue.value ? venue.locale : title.locale,
  }
}

/**
 * Newest album first, undated albums last.
 *
 * `date` is optional on the collection, and Postgres sorts `DESC` NULLS FIRST,
 * so the database alone puts an album whose date has not been filled in yet at
 * the very top of the page. Ordering is a decision rather than a lookup, so it
 * lives here with the rest of them and is tested directly.
 */
export function byNewestFirst(a: GalleryAlbum, b: GalleryAlbum): number {
  if (!a.date && !b.date) return 0
  if (!a.date) return 1
  if (!b.date) return -1
  return b.date.localeCompare(a.date)
}
