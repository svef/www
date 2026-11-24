import { isSubmittedLike } from '../types'
import type { DashboardProject } from './types'

export type InvoiceNote = {
  billing: { id: string; companyName: string; kennitala: string }
  /** Whole ISK: the locked prices of the submitted, non-withdrawn entries on this profile. */
  total: number
  entries: number
}

/**
 * "An invoice for X kr. will be sent to [company], kt. …, after submissions close."
 *
 * One note per billing profile, summing the locked price of every submitted, non-withdrawn
 * entry across the viewer's projects. Drafts and withdrawn entries have no locked price and
 * are never invoiced. A profile the viewer does not own is left out: its company details
 * belong to its owner, and an editor's partial sum would mislead anyway. Profiles with
 * nothing invoiced yet produce no note.
 */
export function invoiceNotes(projects: readonly DashboardProject[]): InvoiceNote[] {
  const byProfile = new Map<string, InvoiceNote>()
  for (const p of projects) {
    const b = p.billing
    if (!b || !b.ownedByViewer) continue
    for (const e of p.entries) {
      if (!isSubmittedLike(e.status) || e.priceKind !== 'locked') continue
      const note = byProfile.get(b.id) ?? {
        billing: { id: b.id, companyName: b.companyName, kennitala: b.kennitala },
        total: 0,
        entries: 0,
      }
      note.total += e.price
      note.entries += 1
      byProfile.set(b.id, note)
    }
  }
  return [...byProfile.values()].sort((a, b) =>
    a.billing.companyName.localeCompare(b.billing.companyName, 'is'),
  )
}

/** Submitted entries on projects with no billing profile: they cannot be invoiced until one is chosen. */
export function entriesWithoutBilling(projects: readonly DashboardProject[]): number {
  let n = 0
  for (const p of projects) {
    if (p.billing) continue
    n += p.entries.filter((e) => isSubmittedLike(e.status) && e.priceKind === 'locked').length
  }
  return n
}
