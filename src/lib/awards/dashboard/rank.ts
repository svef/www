import { toMs, type DateInput } from '../types'
import type { DashboardEntry, DashboardProject } from './types'

/**
 * Anything needing action comes first:
 *  1. projects with an open request, soonest request deadline first (overdue ones lead);
 *  2. projects with a draft entry while a deadline is close, the nearest deadline being the
 *     early-bird bound before it passes and the close afterwards (nothing is urgent once
 *     intake has closed: a draft can no longer be submitted);
 *  3. the rest, most recently changed first.
 * Ties break by recent change, then by id, so the order is stable.
 */

/** A draft counts as "close to a deadline" this many days before it. */
export const DRAFT_URGENCY_DAYS = 14
const DAY_MS = 24 * 60 * 60 * 1000

export type RankContext = {
  now: DateInput
  earlyBirdEndsBefore: DateInput
  intakeClosesBefore: DateInput
}

export type Urgency =
  | { tier: 'request'; at: number }
  | { tier: 'draft'; at: number }
  | { tier: 'rest' }

const TIER = { request: 0, draft: 1, rest: 2 } as const

export function earliestRequestMs(entries: readonly DashboardEntry[]): number | null {
  let best: number | null = null
  for (const e of entries)
    for (const r of e.requests) {
      const t = toMs(r.deadlineAt)
      if (best === null || t < best) best = t
    }
  return best
}

/** The next deadline a draft is racing, or null when none is left. */
export function nextDeadlineMs(ctx: RankContext): number | null {
  const now = toMs(ctx.now)
  const early = toMs(ctx.earlyBirdEndsBefore)
  const close = toMs(ctx.intakeClosesBefore)
  if (now < early) return early
  if (now < close) return close
  return null
}

export function urgencyOf(entries: readonly DashboardEntry[], ctx: RankContext): Urgency {
  const request = earliestRequestMs(entries)
  if (request !== null) return { tier: 'request', at: request }
  const next = nextDeadlineMs(ctx)
  if (next !== null && entries.some((e) => e.status === 'draft')) {
    if (next - toMs(ctx.now) <= DRAFT_URGENCY_DAYS * DAY_MS) return { tier: 'draft', at: next }
  }
  return { tier: 'rest' }
}

/** Entries inside a project: requests first (soonest deadline), then drafts, then the rest in their given order. */
export function rankEntries(entries: readonly DashboardEntry[]): DashboardEntry[] {
  const key = (e: DashboardEntry) => {
    const r = earliestRequestMs([e])
    if (r !== null) return [0, r] as const
    if (e.status === 'draft') return [1, 0] as const
    return [2, 0] as const
  }
  return entries
    .map((e, i) => ({ e, i, k: key(e) }))
    .sort((a, b) => a.k[0] - b.k[0] || a.k[1] - b.k[1] || a.i - b.i)
    .map((x) => x.e)
}

export function rankProjects(
  projects: readonly DashboardProject[],
  ctx: RankContext,
): DashboardProject[] {
  return projects
    .map((p) => ({ p, u: urgencyOf(p.entries, ctx) }))
    .sort((a, b) => {
      const ta = TIER[a.u.tier]
      const tb = TIER[b.u.tier]
      if (ta !== tb) return ta - tb
      if (a.u.tier !== 'rest' && b.u.tier !== 'rest' && a.u.at !== b.u.at) return a.u.at - b.u.at
      const recent = toMs(b.p.updatedAt) - toMs(a.p.updatedAt)
      return recent || a.p.id.localeCompare(b.p.id)
    })
    .map((x) => ({ ...x.p, entries: rankEntries(x.p.entries) }))
}

/** True when the project needs the entrant's attention now (an open request, or an urgent draft). */
export function needsAction(project: DashboardProject, ctx: RankContext): boolean {
  return urgencyOf(project.entries, ctx).tier !== 'rest'
}
