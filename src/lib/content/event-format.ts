import type { Locale } from '@/lib/i18n'

/**
 * Formatting the numbers and dates an event renders.
 *
 * Event-specific and pure, so it lives here beside the mapping rather than in
 * `@/lib/dates` — that module owns the one long date format every page shares,
 * and none of these four shapes is shared with anything outside `/vidburdir`.
 *
 * Iceland keeps UTC all year and Payload stores instants, so every formatter
 * pins the zone the same way `@/lib/dates` does: a 20:00 event is 20:00 on the
 * page whatever the reader's or the build machine's clock says. Getting this
 * wrong on a prerendered page is invisible locally and wrong in production.
 */

const INTL_LOCALE: Record<Locale, string> = { is: 'is-IS', en: 'en-GB' }
const TIME_ZONE = 'UTC'

function parse(iso: string): Date | null {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * The two halves of the date badge on an event row: `{ day: '09', month: 'okt' }`.
 *
 * The badge is a picture of a date — the row also carries the full date as
 * visually hidden text, because "09 okt" read aloud is not a date. Icelandic
 * abbreviates with a trailing full stop ("okt."), which the design does not
 * draw and which reads as a sentence ending mid-badge, so it is trimmed. The
 * month is left in its natural case: the design's uppercase is `text-transform`
 * in CSS, so a screen reader still says "október" rather than spelling it.
 */
export function formatDayBadge(
  iso: string,
  locale: Locale,
): { day: string; month: string } {
  const date = parse(iso)
  if (!date) return { day: '', month: '' }
  const format = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(INTL_LOCALE[locale], { ...options, timeZone: TIME_ZONE }).format(date)
  return {
    day: format({ day: '2-digit' }),
    month: format({ month: 'short' }).replace(/\.$/, ''),
  }
}

/**
 * A compact date for a past-event card — `22. maí 2026`, `22 May 2026`.
 *
 * Uppercased by CSS in the design, not here, for the reason spelled out on
 * `formatLongDate`: shouting at a screen reader changes how month names are
 * pronounced without changing what anyone sees.
 *
 * Built from parts rather than from `format()` so the full stop Icelandic puts
 * on an abbreviated month can be dropped: `5. sep. 2026` set in uppercase reads
 * as two sentences, and the design's own past cards are `13. MAR 2026`. Only
 * the month part is touched — the stop after the day number is Icelandic
 * ordinal punctuation and stays.
 */
export function formatShortDate(iso: string, locale: Locale): string {
  const date = parse(iso)
  if (!date) return ''
  const parts = new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: TIME_ZONE,
  }).formatToParts(date)
  return parts
    .map((part) => (part.type === 'month' ? part.value.replace(/\.$/, '') : part.value))
    .join('')
}

/**
 * A clock time — `19:30`.
 *
 * 24-hour in both locales: Iceland writes times that way, and an English reader
 * of an Icelandic event listing is reading it to turn up at the right hour, not
 * to have it localised into am/pm.
 */
export function formatTime(iso: string): string {
  const date = parse(iso)
  if (!date) return ''
  return new Intl.DateTimeFormat('is-IS', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: TIME_ZONE,
  }).format(date)
}

/**
 * The start time, or a range when the event has an end — `19:30`,
 * `19:30 — 01:00`.
 *
 * Spaced em dash, as the export's detail meta row draws it. The spacing is not
 * decoration: the row meta on the index uses an unspaced-looking ` — ` to join
 * the venue to the summary, so a *tight* range there would read as a second
 * separator. This is why the range is used on the detail page only, where the
 * date, the time and the venue are three separate spans — the index shows the
 * start time alone, which is also all the export's own rows ever show.
 *
 * An end before the start is not an error to hide — an awards night starting at
 * 19:30 and ending at 01:00 crosses midnight and is exactly that shape — so the
 * range is printed as given.
 */
export function formatTimeRange(
  startIso: string,
  endIso: string | null | undefined,
): string {
  const start = formatTime(startIso)
  if (!start) return ''
  const end = endIso ? formatTime(endIso) : ''
  return end ? `${start} — ${end}` : start
}

/**
 * A price in krónur — `18.900 kr.` in Icelandic, `ISK 18,900` in English.
 *
 * Formatted from a number rather than stored as text, so the same price cannot
 * be typed two different ways in two locales. No minor units: ISK has none in
 * practice and `Intl` would otherwise print `18.900,00 kr.`
 *
 * Returns `null` for a missing price, which is a real state — most SVEF events
 * are free — rather than `0 kr.`, which claims something different.
 */
export function formatPrice(
  amount: number | null | undefined,
  locale: Locale,
): string | null {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return null
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: 'currency',
    currency: 'ISK',
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * The member discount as a whole percentage, derived from the two prices.
 *
 * The design says "Félagar fá 20% afslátt", and 20 is not a field: it is what
 * 15.120 is off 18.900. Deriving it means the sentence cannot contradict the
 * numbers printed next to it — which is the failure mode of storing both.
 *
 * `null` when there is no discount to announce: no prices, a member price that
 * is not lower, or a rounding difference that comes out at 0%.
 */
export function memberDiscountPercent(
  full: number | null | undefined,
  member: number | null | undefined,
): number | null {
  if (!full || member === null || member === undefined) return null
  if (member >= full || member < 0) return null
  const percent = Math.round(((full - member) / full) * 100)
  return percent > 0 ? percent : null
}
