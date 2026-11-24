import type { Locale } from '@/lib/i18n'

/**
 * Numbers and dates for code that runs in the browser.
 *
 * `Intl` cannot be trusted with Icelandic there: Chrome ships without Icelandic locale data, so
 * `new Intl.NumberFormat('is-IS').format(18900)` gives `18,900` and a date gives
 * `January 4, 2027` on an Icelandic page (measured in Chrome and Chromium, November 2026).
 * Node has the full data, so server-rendered text was right and client-rendered text was not.
 * Icelandic is therefore written out here; English goes through `Intl` with `en-GB`, which
 * every browser has.
 *
 * Iceland keeps UTC all year, so dates are read in UTC.
 */

const MONTHS_IS = [
  'janúar',
  'febrúar',
  'mars',
  'apríl',
  'maí',
  'júní',
  'júlí',
  'ágúst',
  'september',
  'október',
  'nóvember',
  'desember',
] as const

const toDate = (value: Date | string | number) => (value instanceof Date ? value : new Date(value))

/** `18.900` / `18,900`; with `maxFractionDigits`, `2,4` / `2.4`. */
export function formatNumber(n: number, locale: Locale, maxFractionDigits = 0): string {
  if (locale === 'en') {
    return new Intl.NumberFormat('en-GB', { maximumFractionDigits: maxFractionDigits }).format(n)
  }
  const factor = 10 ** maxFractionDigits
  const rounded = Math.round(Math.abs(n) * factor) / factor
  const [whole, fraction] = String(rounded).split('.')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${n < 0 ? '−' : ''}${grouped}${fraction ? `,${fraction}` : ''}`
}

/** `18.900 kr.` / `18,900 kr.` */
export function formatKr(n: number, locale: Locale, currency = 'kr.'): string {
  return `${formatNumber(n, locale)} ${currency}`
}

/** `14:05`, 24-hour, UTC. The same in both languages. */
export function formatTime(value: Date | string | number): string {
  const d = toDate(value)
  const pad = (x: number) => String(x).padStart(2, '0')
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
}

/**
 * `4. janúar 2027` / `4 January 2027`. Without the year: `4. janúar` / `4 January`. With the
 * time: `4. janúar 2027 kl. 14:05` / `4 January 2027 at 14:05`.
 */
export function formatDate(
  value: Date | string | number,
  locale: Locale,
  options: { year?: boolean; time?: boolean } = {},
): string {
  const { year = true, time = false } = options
  const d = toDate(value)
  if (Number.isNaN(d.getTime())) return ''
  const day =
    locale === 'is'
      ? `${d.getUTCDate()}. ${MONTHS_IS[d.getUTCMonth()]}${year ? ` ${d.getUTCFullYear()}` : ''}`
      : new Intl.DateTimeFormat('en-GB', {
          day: 'numeric',
          month: 'long',
          ...(year ? { year: 'numeric' as const } : {}),
          timeZone: 'UTC',
        }).format(d)
  if (!time) return day
  return `${day} ${locale === 'is' ? 'kl.' : 'at'} ${formatTime(d)}`
}
