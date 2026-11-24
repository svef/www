import { and, eq, gt, isNull, lte } from 'drizzle-orm'
import type { AwardsDb } from '../projects/db-types'
import { appendEntryEvent } from '../db/entry-event'
import { entry, entryRequest } from '../db/schema'
import { notifyRequestReminder, type NotifyDeps, type NotifyResult } from './notify'
import { REMINDER_LEAD_MS, reminderDue } from './rules'

export type ReminderSweep = {
  /** Requests the sweep sent (or tried to send) a reminder for. */
  reminded: { requestId: string; result: NotifyResult }[]
}

/**
 * Sends the ~24 h deadline reminders that are due at `now` (spec §7, email 5). Idempotent: each
 * request is *claimed* first by setting `reminder_sent_at` in a guarded UPDATE, so two
 * overlapping runs, or a retried cron, never mail the same request twice. If nobody could be
 * reached (the mail server failed for every recipient) the claim is released so the next run
 * tries again; a partial success counts as sent, because re-sending would double-mail the
 * people who already have it.
 *
 * Meant to run hourly from the cron route; running it more often is harmless.
 */
export async function sendDueRequestReminders(
  db: AwardsDb,
  input: { now: Date },
  deps: NotifyDeps = {},
): Promise<ReminderSweep> {
  const { now } = input
  const candidates = await db
    .select({
      id: entryRequest.id,
      entryId: entryRequest.entryId,
      deadlineAt: entryRequest.deadlineAt,
      createdAt: entryRequest.createdAt,
      resolvedAt: entryRequest.resolvedAt,
      reminderSentAt: entryRequest.reminderSentAt,
    })
    .from(entryRequest)
    .where(
      and(
        isNull(entryRequest.resolvedAt),
        isNull(entryRequest.deletedAt),
        isNull(entryRequest.reminderSentAt),
        gt(entryRequest.deadlineAt, now),
        lte(entryRequest.deadlineAt, new Date(now.getTime() + REMINDER_LEAD_MS)),
      ),
    )

  const reminded: ReminderSweep['reminded'] = []
  for (const c of candidates) {
    if (!reminderDue(c, now)) continue
    const claimed = await db
      .update(entryRequest)
      .set({ reminderSentAt: now })
      .where(
        and(
          eq(entryRequest.id, c.id),
          isNull(entryRequest.reminderSentAt),
          isNull(entryRequest.resolvedAt),
        ),
      )
      .returning({ id: entryRequest.id })
    if (claimed.length === 0) continue // another run got it

    const result = await notifyRequestReminder(db, c.id, deps)
    if (result === 'failed') {
      await db
        .update(entryRequest)
        .set({ reminderSentAt: null })
        .where(eq(entryRequest.id, c.id))
    } else {
      const [e] = await db
        .select({ projectId: entry.projectId })
        .from(entry)
        .where(eq(entry.id, c.entryId))
      if (e)
        await appendEntryEvent(db, {
          projectId: e.projectId,
          entryId: c.entryId,
          type: 'request_reminder_sent',
          data: { requestId: c.id, result },
        })
    }
    reminded.push({ requestId: c.id, result })
  }
  return { reminded }
}
