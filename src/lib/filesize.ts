import type { Locale } from '@/lib/i18n'

/**
 * Bytes as something a reader can act on, e.g. `1,2 MB` in Icelandic.
 *
 * Decimal units (1 kB = 1000 B), because this number exists to answer "is this
 * worth tapping on mobile data" and that is the unit every operating system's
 * file browser and every download manager shows. Binary units would make the
 * same file look smaller than the figure the reader sees once it lands.
 *
 * `Intl.NumberFormat` rather than `toFixed` so the decimal separator follows the
 * locale — Icelandic writes `1,2`, English `1.2`.
 */

const UNITS = ['B', 'kB', 'MB', 'GB'] as const
const STEP = 1000

export function formatFileSize(bytes: number | null, locale: Locale): string | null {
  // `null` is a media document with no recorded size and 0 is a broken upload;
  // neither is a size worth printing, and "0 B" beside a download would be a
  // lie about a file that is really there.
  if (bytes === null || !Number.isFinite(bytes) || bytes <= 0) return null

  let value = bytes
  let unit = 0
  while (value >= STEP && unit < UNITS.length - 1) {
    value /= STEP
    unit += 1
  }

  // Whole bytes are already exact, and past 100 of any unit a decimal is noise.
  // `maximumFractionDigits` alone, with no minimum, so an exact 2 kB prints as
  // "2 kB" rather than the falsely precise "2.0 kB".
  const digits = unit === 0 || value >= 100 ? 0 : 1
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value)

  // A non-breaking space: a size that wrapped between the number and its unit
  // would read as two separate things at the end of a line.
  return `${number} ${UNITS[unit]}`
}
