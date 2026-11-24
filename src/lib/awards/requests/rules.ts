import { toMs, type DateInput } from '../types'

/**
 * Requests (spec §5 "Requests"). Pure rules, no database: the service applies them, the UI
 * and the tests read them.
 *
 * A request is `open` until it is resolved or its deadline passes, then `overdue` until staff
 * resolve it (the deadline is exclusive, like every other bound: `now < deadline` is open).
 * Overdue is *derived* from the clock, never a stored state, and nothing happens
 * automatically when it is reached: the fields lock again (editability.ts) and staff decide.
 */

export type RequestStatus = 'open' | 'overdue' | 'resolved'

export type RequestTiming = {
  deadlineAt: DateInput
  resolvedAt?: DateInput | null
}

export function requestStatus(r: RequestTiming, now: DateInput): RequestStatus {
  if (r.resolvedAt) return 'resolved'
  return toMs(now) < toMs(r.deadlineAt) ? 'open' : 'overdue'
}

/** How long before the deadline the reminder goes out. */
export const REMINDER_LEAD_MS = 24 * 60 * 60 * 1000

/** The default deadline staff are offered: a week from now. */
export const DEFAULT_DEADLINE_DAYS = 7

export function defaultDeadline(now: DateInput): Date {
  return new Date(toMs(now) + DEFAULT_DEADLINE_DAYS * 24 * 60 * 60 * 1000)
}

export const MAX_MESSAGE_LENGTH = 2000
export const MAX_REPLY_LENGTH = 2000

/**
 * Whether the ~24 h reminder is due now: the request is still open, no reminder was sent, and
 * the deadline is within the lead time. A request opened with less than the lead time left
 * gets no reminder: the "request opened" email already carried that deadline.
 */
export function reminderDue(
  r: RequestTiming & { createdAt: DateInput; reminderSentAt?: DateInput | null },
  now: DateInput,
): boolean {
  if (r.reminderSentAt || r.resolvedAt) return false
  const t = toMs(now)
  const deadline = toMs(r.deadlineAt)
  if (t >= deadline) return false
  if (deadline - t > REMINDER_LEAD_MS) return false
  return deadline - toMs(r.createdAt) > REMINDER_LEAD_MS
}

export type OpenRequestInvalid = 'message' | 'fields' | 'deadline'

/** Checks what staff typed when opening a request; `allowedKeys` are the entry's requestable fields. */
export function validateOpenRequest(
  input: { message: string; fieldKeys: readonly string[]; deadlineAt: DateInput | null },
  now: DateInput,
  allowedKeys: readonly string[],
): OpenRequestInvalid[] {
  const bad: OpenRequestInvalid[] = []
  const message = input.message.trim()
  if (message === '' || message.length > MAX_MESSAGE_LENGTH) bad.push('message')
  const keys = new Set(input.fieldKeys)
  // No fields is allowed: a plain question unlocks nothing.
  if ([...keys].some((k) => !allowedKeys.includes(k))) bad.push('fields')
  if (input.deadlineAt === null || !Number.isFinite(toMsSafe(input.deadlineAt))) bad.push('deadline')
  else if (toMs(input.deadlineAt) <= toMs(now)) bad.push('deadline')
  return bad
}

function toMsSafe(value: DateInput): number {
  try {
    return toMs(value)
  } catch {
    return Number.NaN
  }
}
