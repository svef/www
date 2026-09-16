import type { Locale } from '@/lib/i18n'

const INTL_LOCALE: Record<Locale, string> = { is: 'is-IS', en: 'en-GB' }

// Iceland keeps UTC all year, and Payload stores dates as UTC instants. Pinning
// the zone keeps a date the same whatever the server or the reader's clock says.
const TIME_ZONE = 'UTC'

/**
 * A publication date in long form — `22. maí 2026` in Icelandic, `22 May 2026`
 * in English.
 *
 * The design sets these labels in uppercase (`22. MAÍ 2026`). That is done in
 * CSS with `text-transform`, not here: uppercasing the text itself would leave a
 * screen reader announcing shouted, sometimes mispronounced month names, while
 * `text-transform` gives the same picture and keeps the spoken form natural.
 * Render the result inside `<time dateTime={iso}>` so the machine-readable date
 * travels with it.
 */
export function formatLongDate(iso: string, locale: Locale): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: TIME_ZONE,
  }).format(date)
}
