import type { EntryStatus } from '../types'
import type { DashboardEntry, DashboardProject } from './types'

export type ListFilter = {
  /** Matched against the project title, case- and accent-insensitively. */
  query: string
  status: EntryStatus | ''
  /** Category slug. */
  category: string
}

export const NO_FILTER: ListFilter = { query: '', status: '', category: '' }

/** Case- and accent-insensitive folding for search ("Sol" finds "Sól"); þ and ð are letters of their own and stay. */
export function fold(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim()
}

const entryMatches = (e: DashboardEntry, f: ListFilter) =>
  (!f.status || e.status === f.status) && (!f.category || e.categorySlug === f.category)

/**
 * The compact list's rows: projects whose title matches, narrowed to the entries matching the
 * status and category (a project with no matching entry drops out). Order is kept.
 */
export function filterProjects(
  projects: readonly DashboardProject[],
  f: ListFilter,
): DashboardProject[] {
  const q = fold(f.query)
  const out: DashboardProject[] = []
  for (const p of projects) {
    if (q && !fold(p.title).includes(q)) continue
    if (!f.status && !f.category) {
      out.push(p)
      continue
    }
    const entries = p.entries.filter((e) => entryMatches(e, f))
    if (entries.length) out.push({ ...p, entries })
  }
  return out
}
