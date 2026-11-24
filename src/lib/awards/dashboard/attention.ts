import { toMs } from '../types'
import { earliestRequestMs, nextDeadlineMs, type RankContext } from './rank'
import type { DashboardProject } from './types'

/**
 * What the portal's overview lists under "needs your attention": for each project that needs
 * the person now, the reasons in plain terms. A project is listed when it has an open request,
 * or a draft entry while a deadline is still ahead (it can still be sent). Projects come in the
 * order given, which is the dashboard's ranking (most urgent first). Pure.
 */
export type AttentionReason =
  | { kind: 'request'; count: number; deadlineAt: string; overdue: boolean }
  | { kind: 'drafts'; count: number; missing: number; deadlineAt: string }

export type AttentionItem = { projectId: string; title: string; reasons: AttentionReason[] }

export function attentionItems(
  projects: readonly DashboardProject[],
  ctx: RankContext,
  limit = 5,
): AttentionItem[] {
  const now = toMs(ctx.now)
  const next = nextDeadlineMs(ctx)
  const out: AttentionItem[] = []
  for (const p of projects) {
    const reasons: AttentionReason[] = []
    const requests = p.entries.flatMap((e) => e.requests)
    const earliest = earliestRequestMs(p.entries)
    if (earliest !== null) {
      reasons.push({
        kind: 'request',
        count: requests.length,
        deadlineAt: new Date(earliest).toISOString(),
        overdue: earliest <= now,
      })
    }
    const drafts = p.entries.filter((e) => e.status === 'draft')
    if (drafts.length > 0 && next !== null) {
      reasons.push({
        kind: 'drafts',
        count: drafts.length,
        missing: drafts.reduce((n, e) => Math.max(n, e.missing.length), 0),
        deadlineAt: new Date(next).toISOString(),
      })
    }
    if (reasons.length > 0) out.push({ projectId: p.id, title: p.title, reasons })
    if (out.length >= limit) break
  }
  return out
}

/** The overview's counts: projects, and entries sent in and still in drafts. */
export function projectTotals(projects: readonly DashboardProject[]) {
  let submitted = 0
  let drafts = 0
  for (const p of projects)
    for (const e of p.entries) {
      if (e.status === 'draft') drafts += 1
      else if (e.status !== 'withdrawn') submitted += 1
    }
  return { projects: projects.length, submitted, drafts }
}
