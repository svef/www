/** Shared plain types for the awards domain. Pure TypeScript: no framework or database imports. */

export type Locale = 'is' | 'en'
export type Localized = { is: string; en: string }

/** A moment: a Date, epoch milliseconds, or an ISO-8601 string with a zone (as stored on the edition). */
export type DateInput = Date | number | string

export function toMs(value: DateInput): number {
  const ms =
    value instanceof Date
      ? value.getTime()
      : typeof value === 'number'
        ? value
        : Date.parse(value)
  if (!Number.isFinite(ms)) throw new RangeError(`Invalid date: ${String(value)}`)
  return ms
}

export type Edition = {
  intakeOpensAt: string
  earlyBirdEndsBefore: string
  intakeClosesBefore: string
  earlyBirdDiscountPercent: number
  earlyBirdRounding: 'nearest-900'
}

export type EntryStatus =
  | 'draft'
  | 'submitted'
  | 'eligibility_pending'
  | 'eligible'
  | 'ineligible'
  | 'needs_clarification'
  | 'withdrawn'

export const ENTRY_STATUSES: readonly EntryStatus[] = [
  'draft',
  'submitted',
  'eligibility_pending',
  'eligible',
  'ineligible',
  'needs_clarification',
  'withdrawn',
]

/** Statuses of an entry that has been submitted and not withdrawn (its locked fields are locked). */
export const SUBMITTED_LIKE_STATUSES: readonly EntryStatus[] = [
  'submitted',
  'eligibility_pending',
  'eligible',
  'ineligible',
  'needs_clarification',
]

export function isSubmittedLike(status: EntryStatus): boolean {
  return SUBMITTED_LIKE_STATUSES.includes(status)
}
