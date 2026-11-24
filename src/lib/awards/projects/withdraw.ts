import { eq } from 'drizzle-orm'
import { appendEntryEvent } from '../db/entry-event'
import { entry } from '../db/schema'
import { transition, can } from '../status'
import type { EntryStatus } from '../types'
import type { AwardsDb } from './db-types'
import { AwardsError } from './errors'
import { requireLock } from './lock'
import { loadContext, requireRole, type Clock } from './service'

/**
 * Withdrawing an entry (spec §5): by the project's creator only, from `submitted` only, and
 * only before intake closes. It needs the edit lock like every other write, and it clears
 * the price lock: submitting the entry again prices it by the date it happens, which is
 * deliberate (the early bird rewards submitting early, not parking placeholders).
 *
 * The status rules (`transition()`) decide whether it is allowed and that the price is
 * cleared; this function applies the outcome and logs `entry_withdrawn` with the price that
 * was given up.
 */
export type WithdrawResult = {
  entryId: string
  category: string
  /** The locked price that was cleared (whole ISK), for the confirmation message. */
  clearedPrice: { regular: number; discountPercent: number; amount: number } | null
}

export async function withdrawEntry(
  db: AwardsDb,
  args: { userId: string; projectId: string; entryId: string } & Clock,
): Promise<WithdrawResult> {
  const { userId, projectId, entryId } = args
  const now = args.now ?? new Date()
  const role = await requireRole(db, userId, projectId)
  if (!can('withdraw', [role]))
    throw new AwardsError('forbidden', 'Only the person who created the project can withdraw an entry.')

  return db.transaction(async (tx) => {
    await requireLock(tx, { projectId, userId, now, ttlMs: args.ttlMs })
    const ctx = await loadContext(tx, projectId)
    const e = ctx.entries.find((x) => x.id === entryId)
    if (!e) throw new AwardsError('not_found', 'Entry not found.')
    const moved = transition({ status: e.status, previousStatus: null }, 'withdrawn', 'creator', {
      now,
      intakeOpensAt: ctx.edition.intakeOpensAt,
      intakeClosesBefore: ctx.intakeClosesBefore,
    })
    if (!moved.ok) {
      if (moved.reason === 'closed')
        throw new AwardsError('intake_closed', 'Submissions have closed.')
      throw new AwardsError('not_withdrawable', `This entry cannot be withdrawn (${moved.reason}).`)
    }
    // The rules say `clear` for this transition: the snapshot goes (the log keeps what it was).
    const clear =
      moved.priceAction === 'clear'
        ? { priceRegular: null, discountPercent: null, priceAmount: null, priceLockedAt: null }
        : {}
    await tx
      .update(entry)
      .set({
        status: moved.state.status,
        statusBeforeClarification: null,
        ...clear,
        updatedAt: now,
      })
      .where(eq(entry.id, entryId))
    await appendEntryEvent(tx, {
      projectId,
      entryId,
      actorUserId: userId,
      type: 'entry_withdrawn',
      before: { status: e.status as EntryStatus },
      after: { status: 'withdrawn' },
      data: e.price
        ? {
            clearedPriceRegular: e.price.regular,
            clearedDiscountPercent: e.price.discountPercent,
            clearedPriceAmount: e.price.amount,
          }
        : null,
    })
    return { entryId, category: e.category, clearedPrice: e.price }
  })
}
