import type { EntryStatus } from '../types'
import type { DashboardEntry, DashboardProject } from './types'

/** Builders for the dashboard's pure tests. */
export function entry(over: Partial<DashboardEntry> = {}): DashboardEntry {
  return {
    id: over.id ?? 'e1',
    categorySlug: 'marketing-website',
    categoryName: { is: 'Markaðsvefur', en: 'Marketing website' },
    status: 'draft' as EntryStatus,
    price: 18900,
    priceKind: 'if-submitted-now',
    priceRegular: 26900,
    earlyBird: true,
    earlyBirdSecured: false,
    missing: [],
    requests: [],
    ...over,
  }
}

export function lockedEntry(price: number, over: Partial<DashboardEntry> = {}): DashboardEntry {
  return entry({
    status: 'submitted',
    price,
    priceKind: 'locked',
    earlyBird: true,
    earlyBirdSecured: true,
    ...over,
  })
}

export function proj(over: Partial<DashboardProject> = {}): DashboardProject {
  return {
    id: 'p1',
    title: 'Project',
    role: 'creator',
    updatedAt: '2026-12-10T10:00:00Z',
    billing: null,
    entries: [],
    lock: null,
    ...over,
  }
}

export const billing = (id: string, company: string, owned = true) => ({
  id,
  companyName: company,
  kennitala: '4501012340',
  ownedByViewer: owned,
})
