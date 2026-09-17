import { pickLocalized, type AllLocales } from '@/lib/localized'
import { localePath, type Locale } from '@/lib/i18n'
import { formatLongDate } from '@/lib/dates'
import type { Event, Media } from '@/payload-types'
import {
  formatDayBadge,
  formatShortDate,
  formatTime,
  formatTimeRange,
  formatPrice,
  memberDiscountPercent,
} from './event-format'

/**
 * Shaping `events` documents into what a page renders.
 *
 * Pure, for the reasons set out at the top of `./news-mapping.ts`: `./events.ts`
 * owns the Payload read and calls in here, pages import from `./events.ts` only,
 * and the `locale: 'all'` shape is re-typed once here rather than once per page.
 *
 * The one thing that is specific to events: a document carries several
 * independently localized fields (title, venue, body, accessibility note), and
 * a translator lands them one at a time. Each resolved value therefore reports
 * the locale it actually ended up in, so the page can mark the Icelandic bits
 * of an English page as Icelandic instead of announcing them in an English
 * voice.
 */

type MediaAllLocales = Omit<Media, 'alt' | 'caption'> & {
  alt: AllLocales<string>
  caption: AllLocales<string>
}

/** An `events` document as a `locale: 'all'` read actually returns it. */
export type EventAllLocales = Omit<
  Event,
  'title' | 'location' | 'description' | 'accessibility' | 'coverImage' | 'gallery'
> & {
  title: AllLocales<string>
  location: AllLocales<string>
  description: AllLocales<Event['description']>
  accessibility: AllLocales<string>
  coverImage?: number | MediaAllLocales | null
  gallery?: (number | MediaAllLocales)[] | null
}

export type EventImage = {
  url: string
  alt: string
  width: number | null
  height: number | null
}

export type EventSummary = {
  slug: string
  href: string
  /** ISO instant. */
  startDate: string
  endDate: string | null
  title: string
  /** Full readable date, announced in place of the day/month badge. */
  dateLabel: string
  /** Compact date for a past-event card — `22. maí 2026`. */
  shortDate: string
  /** The two halves of the date badge, e.g. `{ day: '09', month: 'okt' }`. */
  badge: { day: string; month: string }
  /** Venue name on its own, already resolved for the locale. */
  location: string | null
  /**
   * The start time alone — `19:30`. The index never shows a range; the export's
   * own rows and spotlight show one clock time, and the range belongs to the
   * detail page's three-span meta row.
   */
  startTime: string
  /** Venue · time — summary, as the design's row and card meta line. */
  meta: string | null
  /** The body's opening sentence on its own, for `<meta name="description">`. */
  summary: string | null
  /** The language `title` is written in; `is` when English has not landed. */
  contentLocale: Locale
  /** The language `meta` is written in — venue and summary are both localized. */
  metaLocale: Locale
  /**
   * Where to buy a ticket, or `null`. Carried on the summary as well as the
   * detail because the index's spotlight draws the same "Kaupa miða" button.
   */
  ticketUrl: string | null
}

export type EventDetail = EventSummary & {
  /** Already over. Decides tense in the page's own copy, nothing else. */
  isPast: boolean
  /** Street line under the venue name. Not localized: it is an address. */
  venueAddress: string | null
  /** `19:30` or `19:30—01:00`. */
  timeRange: string
  body: Event['description'] | null
  bodyLocale: Locale
  cover: EventImage | null
  /** The design's photo strip. Empty when the event has no gallery images. */
  photos: EventImage[]
  ticketUrl: string | null
  /** Already formatted for the locale — `18.900 kr.` */
  ticketPrice: string | null
  memberPrice: string | null
  /** Whole percent off for members, derived from the two prices. */
  memberDiscount: number | null
  accessibility: string | null
  accessibilityLocale: Locale
}

function toImage(
  value: number | MediaAllLocales | null | undefined,
  locale: Locale,
): EventImage | null {
  // depth 0 (or an unresolved relationship) leaves an id behind — nothing to render.
  if (!value || typeof value === 'number') return null
  if (!value.url) return null
  return {
    url: value.url,
    alt: pickLocalized(value.alt, locale).value ?? '',
    width: value.width ?? null,
    height: value.height ?? null,
  }
}

/**
 * The first paragraph of the rich-text body, as plain text.
 *
 * The design's row and card meta lines end in a sentence of description, and
 * the body is the only place that sentence exists — there is no separate
 * excerpt field on an event, and adding one would ask editors to write the same
 * opening twice and keep them in step.
 *
 * Deliberately shallow: the first top-level paragraph, its direct text
 * children. A body that opens with a heading or a quote has no lead sentence to
 * borrow, and the meta line is then just the venue and the time, which is the
 * honest result rather than a heading masquerading as a summary.
 */
export function leadSentence(body: Event['description'] | null | undefined): string | null {
  const children = body?.root?.children
  if (!Array.isArray(children)) return null
  const first = children.find((node) => node?.type === 'paragraph')
  const nodes = (first as { children?: { type?: string; text?: string }[] } | undefined)?.children
  if (!Array.isArray(nodes)) return null
  const text = nodes
    .filter((node) => node?.type === 'text' && typeof node.text === 'string')
    .map((node) => node.text)
    .join('')
    .trim()
  return text || null
}

/**
 * The meta line under an event's title.
 *
 * Upcoming: `Grandi 101 · 20:00 — Afslappað kvöld um að læra af mistökum.`
 * Past: `Harpa — Uppselt hús og 13 verðlaunahafar.`
 *
 * The clock time is dropped once an event is over: what time a thing that
 * already happened started is not information anyone reading the archive needs,
 * and the design's past cards do not carry it.
 *
 * Every part is optional, so this degrades to the venue alone, the summary
 * alone, or nothing — a bare `·` or a dangling dash would read as a bug.
 */
export function buildMeta(
  parts: { location: string | null; time: string | null; summary: string | null },
): string | null {
  const head = [parts.location, parts.time].filter(Boolean).join(' · ')
  return [head || null, parts.summary].filter(Boolean).join(' — ') || null
}

/**
 * Is this event over?
 *
 * Measured against the end, not the start, so an event does not move itself
 * into "Liðnir viðburðir" while the audience is still in the room — an awards
 * night that starts at 19:30 and ends at 01:00 is upcoming for those five and a
 * half hours. With no end date the start is all there is to go on.
 *
 * `now` is passed in rather than read here so the split is a pure function of
 * its inputs and a test does not have to move the clock. Note what "now" means
 * on a prerendered page: the moment the page was *rendered*, not requested, so
 * an event crosses from upcoming to past one revalidation window late — the
 * same lag `CLAUDE.md` describes for `publishedAt`, and the reason the awards
 * night lingering at the top of the list for five minutes is a shrug rather
 * than a bug.
 */
export function isPastEvent(
  doc: Pick<EventAllLocales, 'startDate' | 'endDate'>,
  now: number,
): boolean {
  const ends = new Date(doc.endDate ?? doc.startDate).getTime()
  return Number.isNaN(ends) ? false : ends < now
}

export function toEventSummary(
  doc: EventAllLocales,
  locale: Locale,
  options: { past?: boolean } = {},
): EventSummary {
  const title = pickLocalized(doc.title, locale)
  const location = pickLocalized(doc.location, locale)
  const description = pickLocalized(doc.description, locale)
  const summary = leadSentence(description.value)
  // The start time alone, never the range: see `formatTimeRange`.
  const startTime = formatTime(doc.startDate)
  const meta = buildMeta({
    location: location.value ?? null,
    time: options.past ? null : startTime,
    summary,
  })

  return {
    slug: doc.slug,
    href: localePath(`/vidburdir/${doc.slug}`, locale),
    startDate: doc.startDate,
    endDate: doc.endDate ?? null,
    title: title.value ?? '',
    dateLabel: formatLongDate(doc.startDate, locale),
    shortDate: formatShortDate(doc.startDate, locale),
    badge: formatDayBadge(doc.startDate, locale),
    location: location.value ?? null,
    startTime,
    meta,
    summary,
    ticketUrl: doc.ticketUrl || null,
    contentLocale: title.locale,
    // The venue is written first and the body second, so the line as a whole is
    // in the page's language only if both halves are. Where the line has
    // neither there is nothing to mark, and it follows the title.
    metaLocale: pickMetaLocale(location, description, summary, title.locale),
  }
}

function pickMetaLocale(
  location: { value: string | null; locale: Locale },
  description: { value: unknown; locale: Locale },
  summary: string | null,
  fallback: Locale,
): Locale {
  const locales = [
    location.value ? location.locale : null,
    summary ? description.locale : null,
  ].filter((l): l is Locale => l !== null)
  if (locales.length === 0) return fallback
  return locales.every((l) => l === locales[0]) ? locales[0] : 'is'
}

export function toEventDetail(doc: EventAllLocales, locale: Locale): EventDetail {
  const past = isPastEvent(doc, Date.now())
  const summary = toEventSummary(doc, locale, { past })
  const description = pickLocalized(doc.description, locale)
  const accessibility = pickLocalized(doc.accessibility, locale)

  return {
    ...summary,
    isPast: past,
    venueAddress: doc.venueAddress ?? null,
    timeRange: formatTimeRange(doc.startDate, doc.endDate),
    body: description.value ?? null,
    bodyLocale: description.value ? description.locale : summary.contentLocale,
    cover: toImage(doc.coverImage, locale),
    photos: (doc.gallery ?? [])
      .map((image) => toImage(image, locale))
      .filter((image): image is EventImage => image !== null),
    ticketPrice: formatPrice(doc.ticketPrice, locale),
    memberPrice: formatPrice(doc.memberPrice, locale),
    memberDiscount: memberDiscountPercent(doc.ticketPrice, doc.memberPrice),
    accessibility: accessibility.value ?? null,
    accessibilityLocale: accessibility.value ? accessibility.locale : summary.contentLocale,
  }
}
