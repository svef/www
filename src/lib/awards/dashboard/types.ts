import type { EntryStatus, Localized } from '../types'

/** Plain data the dashboard page renders. No framework or database types, so it can cross to a client component. */

export type DashboardRequest = {
  id: string
  entryId: string
  message: string
  /** ISO. */
  deadlineAt: string
}

export type MissingItem = { fieldKey: string; label: Localized }

export type DashboardEntry = {
  id: string
  categorySlug: string
  categoryName: Localized
  status: EntryStatus
  /** The locked price (submitted entries) or what submitting now would cost (drafts, withdrawn). */
  price: number
  priceKind: 'locked' | 'if-submitted-now'
  /** The category's regular price today. */
  priceRegular: number
  /** Whether the price is an early-bird price: locked early, or would be early if submitted now. */
  earlyBird: boolean
  /** True once an early-bird price is locked in (a submitted, non-withdrawn entry that got the discount). */
  earlyBirdSecured: boolean
  /** What stops a draft from being submitted; empty for any other status. */
  missing: MissingItem[]
  /** Open (unresolved) staff requests on this entry. */
  requests: DashboardRequest[]
}

export type DashboardBilling = {
  id: string
  companyName: string
  kennitala: string
  /** Only the profile's owner sees the invoice note for it. */
  ownedByViewer: boolean
}

export type DashboardLock = {
  holderUserId: string
  holderName: string
  /** ISO. */
  since: string
  heldByViewer: boolean
}

export type DashboardProject = {
  id: string
  title: string
  role: 'creator' | 'editor'
  /** ISO. */
  updatedAt: string
  billing: DashboardBilling | null
  entries: DashboardEntry[]
  lock: DashboardLock | null
}

export type DashboardEdition = {
  year: number
  /** ISO. */
  intakeOpensAt: string
  earlyBirdEndsBefore: string
  intakeClosesBefore: string
}

export type DashboardData = {
  edition: DashboardEdition
  projects: DashboardProject[]
  /** Server clock when this was built (ISO). */
  now: string
}
