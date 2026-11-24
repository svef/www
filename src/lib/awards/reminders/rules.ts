import type { ReminderWave } from '../db/tables'

/**
 * Draft reminders (spec §7, email 6). Pure timing rules, no database.
 *
 * Two waves, each opening `DRAFT_REMINDER_LEAD_DAYS` before an exclusive bound (spec §2) and
 * ending at it: the early-bird bound (2 January for 5 January 00:00) and the close (30 January
 * for 2 February 00:00). The window is half-open, `[bound - lead, bound)`, so the moment the
 * bound is reached the wave is over. The cron runs daily and the log makes each wave send once
 * per person, so a missed run is simply caught up by the next one inside the window.
 */
export const DRAFT_REMINDER_LEAD_DAYS = 3

const DAY_MS = 24 * 60 * 60 * 1000

export function dueWave(
  now: Date,
  edition: { earlyBirdEndsBefore: Date; intakeClosesBefore: Date },
  leadDays: number = DRAFT_REMINDER_LEAD_DAYS,
): ReminderWave | null {
  const t = now.getTime()
  const inWindow = (bound: Date) => t >= bound.getTime() - leadDays * DAY_MS && t < bound.getTime()
  if (inWindow(edition.earlyBirdEndsBefore)) return 'early_bird'
  if (inWindow(edition.intakeClosesBefore)) return 'closing'
  return null
}
