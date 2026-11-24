import { toMs, type DateInput } from '../types'

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * The deadline line on the dashboard:
 *  - until the early-bird bound: "X days left to secure the early-bird price";
 *  - from then until intake closes: "Submissions close <last day>";
 *  - after: closed.
 * Both bounds are exclusive upper bounds, so `now === earlyBirdEndsBefore` is already
 * past the early bird and `now === intakeClosesBefore` is already closed.
 */
export type DeadlineLine =
  | { kind: 'early-bird'; days: number; lastDay: string }
  | { kind: 'closes'; lastDay: string }
  | { kind: 'closed' }

/** The last calendar day an exclusive bound still allows an action, as an ISO instant. */
function lastDayOf(bound: DateInput): string {
  return new Date(toMs(bound) - 1).toISOString()
}

export function deadlineLine(
  now: DateInput,
  edition: { earlyBirdEndsBefore: DateInput; intakeClosesBefore: DateInput },
): DeadlineLine {
  const t = toMs(now)
  const early = toMs(edition.earlyBirdEndsBefore)
  const close = toMs(edition.intakeClosesBefore)
  if (t < early) {
    // Whole days remaining, rounded up: one millisecond before the bound is "1 day left", never 0.
    return {
      kind: 'early-bird',
      days: Math.max(1, Math.ceil((early - t) / DAY_MS)),
      lastDay: lastDayOf(early),
    }
  }
  if (t < close) return { kind: 'closes', lastDay: lastDayOf(close) }
  return { kind: 'closed' }
}
