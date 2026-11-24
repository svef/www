import type { Locale } from '@/lib/i18n'
import { formatDate, formatKr } from '@/lib/locale-format'

/** Whole ISK as the locale writes it: `26,900 kr.` / `26.900 kr.` */
export function formatMoney(amount: number, locale: Locale, currency: string): string {
  return formatKr(amount, locale, currency)
}

/**
 * The last day an exclusive deadline still allows: `2027-01-05T00:00Z` is "4 January 2027".
 * Iceland is UTC all year, so the date is read in UTC.
 */
export function lastDayBefore(isoExclusive: string, locale: Locale): string {
  const d = new Date(Date.parse(isoExclusive) - 1)
  return formatDate(d, locale)
}
