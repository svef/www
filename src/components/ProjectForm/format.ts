import type { Locale } from '@/lib/i18n'

/** Whole ISK as the locale writes it: `26,900 kr.` / `26.900 kr.` */
export function formatMoney(amount: number, locale: Locale, currency: string): string {
  return `${new Intl.NumberFormat(locale === 'is' ? 'is-IS' : 'en-GB').format(amount)} ${currency}`
}

/**
 * The last day an exclusive deadline still allows: `2027-01-05T00:00Z` is "4 January 2027".
 * Iceland is UTC all year, so the date is read in UTC.
 */
export function lastDayBefore(isoExclusive: string, locale: Locale): string {
  const d = new Date(Date.parse(isoExclusive) - 1)
  return new Intl.DateTimeFormat(locale === 'is' ? 'is-IS' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d)
}
