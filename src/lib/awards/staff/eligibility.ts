import { and, eq, isNull } from 'drizzle-orm'
import type { AwardsDb } from '../db/client'
import { appendEntryEvent } from '../db/entry-event'
import { edition, entry, project } from '../db/schema'
import { can, transition, type Role, type TransitionDenied } from '../status'
import type { DateInput, EntryStatus } from '../types'

/**
 * Setting an entry's eligibility, which staff do after close. The state machine and the
 * clock window are `transition()`'s; this adds the permission check, the database write
 * and the `entry_event`.
 */

/** The statuses staff can move an entry to from the eligibility list. */
export const ELIGIBILITY_TARGETS = ['eligibility_pending', 'eligible', 'ineligible'] as const
export type EligibilityTarget = (typeof ELIGIBILITY_TARGETS)[number]

export function isEligibilityTarget(value: unknown): value is EligibilityTarget {
  return (ELIGIBILITY_TARGETS as readonly unknown[]).includes(value)
}

export type EligibilityDenied =
  | TransitionDenied
  | 'not_staff'
  | 'invalid_target'
  | 'not_found'
  | 'unchanged'

export type EligibilityPlan =
  | { ok: true; from: EntryStatus; to: EligibilityTarget }
  | { ok: false; reason: EligibilityDenied }

type PlanInput = {
  status: EntryStatus
  previousStatus: EntryStatus | null
  to: string
  roles: readonly Role[]
  now: DateInput
  intakeOpensAt: DateInput
  intakeClosesBefore: DateInput
}

/** The pure decision: may these roles move an entry from `status` to `to` right now? */
export function planEligibility(input: PlanInput): EligibilityPlan {
  if (!can('set_eligibility', input.roles)) return { ok: false, reason: 'not_staff' }
  if (!isEligibilityTarget(input.to)) return { ok: false, reason: 'invalid_target' }
  if (input.status === input.to) return { ok: false, reason: 'unchanged' }
  const result = transition(
    { status: input.status, previousStatus: input.previousStatus },
    input.to,
    'staff',
    {
      now: input.now,
      intakeOpensAt: input.intakeOpensAt,
      intakeClosesBefore: input.intakeClosesBefore,
    },
  )
  if (!result.ok) return { ok: false, reason: result.reason }
  return { ok: true, from: input.status, to: input.to }
}

export type EligibilityActor = { userId: string; roles: readonly Role[] }

export type EligibilityResult =
  | { ok: true; entryId: string; from: EntryStatus; to: EligibilityTarget }
  | { ok: false; entryId: string; reason: EligibilityDenied }

/**
 * Moves one entry, in a transaction that locks its row, so two staff members
 * clicking at once cannot both act on the same old status. Writes the event in the
 * same transaction. `now` is passed in (the callers use the server clock) so a test
 * can stand either side of the closing moment without touching the clock.
 */
export async function setEligibility(
  db: AwardsDb,
  input: { entryId: string; to: string; actor: EligibilityActor; now: Date },
): Promise<EligibilityResult> {
  const { entryId } = input
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({
        status: entry.status,
        previous: entry.statusBeforeClarification,
        projectId: entry.projectId,
        opens: edition.intakeOpensAt,
        closes: edition.intakeClosesBefore,
      })
      .from(entry)
      .innerJoin(project, eq(project.id, entry.projectId))
      .innerJoin(edition, eq(edition.id, project.editionId))
      .where(and(eq(entry.id, entryId), isNull(entry.deletedAt), isNull(project.deletedAt)))
      .for('update', { of: entry })
    if (!row) return { ok: false, entryId, reason: 'not_found' } as const

    const plan = planEligibility({
      status: row.status as EntryStatus,
      previousStatus: row.previous as EntryStatus | null,
      to: input.to,
      roles: input.actor.roles,
      now: input.now,
      intakeOpensAt: row.opens,
      intakeClosesBefore: row.closes,
    })
    if (!plan.ok) return { ok: false, entryId, reason: plan.reason } as const

    await tx.update(entry).set({ status: plan.to }).where(eq(entry.id, entryId))
    await appendEntryEvent(tx, {
      projectId: row.projectId,
      entryId,
      actorUserId: input.actor.userId,
      type: 'eligibility_changed',
      fieldKey: 'status',
      before: { status: plan.from },
      after: { status: plan.to },
    })
    return { ok: true, entryId, from: plan.from, to: plan.to } as const
  })
}

export type BulkEligibilityResult = {
  changed: Extract<EligibilityResult, { ok: true }>[]
  skipped: Extract<EligibilityResult, { ok: false }>[]
}

/**
 * The same, for a selection. Entries that cannot move are skipped with their
 * reason and the rest still change: one stale row must not block forty good ones.
 * Each entry has its own transaction for the same reason.
 */
export async function setEligibilityBulk(
  db: AwardsDb,
  input: { entryIds: readonly string[]; to: string; actor: EligibilityActor; now: Date },
): Promise<BulkEligibilityResult> {
  const result: BulkEligibilityResult = { changed: [], skipped: [] }
  for (const entryId of [...new Set(input.entryIds)]) {
    const one = await setEligibility(db, { ...input, entryId })
    if (one.ok) result.changed.push(one)
    else result.skipped.push(one)
  }
  return result
}
