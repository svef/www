import { describe, expect, it } from 'vitest'
import {
  defaultDeadline,
  REMINDER_LEAD_MS,
  reminderDue,
  requestStatus,
  validateOpenRequest,
} from './rules'

const NOW = new Date('2027-02-10T12:00:00Z')
const H = 60 * 60 * 1000

describe('requestStatus', () => {
  const deadlineAt = new Date(NOW.getTime() + 2 * H)
  it('is open until the exclusive deadline, then overdue', () => {
    expect(requestStatus({ deadlineAt }, NOW)).toBe('open')
    expect(requestStatus({ deadlineAt }, new Date(deadlineAt.getTime() - 1))).toBe('open')
    expect(requestStatus({ deadlineAt }, deadlineAt)).toBe('overdue')
    expect(requestStatus({ deadlineAt }, new Date(deadlineAt.getTime() + 1))).toBe('overdue')
  })
  it('resolved wins over the clock', () => {
    expect(requestStatus({ deadlineAt, resolvedAt: NOW }, new Date(deadlineAt.getTime() + H))).toBe(
      'resolved',
    )
  })
})

describe('defaultDeadline', () => {
  it('is a week out', () => {
    expect(defaultDeadline(NOW).toISOString()).toBe('2027-02-17T12:00:00.000Z')
  })
})

describe('reminderDue', () => {
  const created = new Date(NOW.getTime() - 5 * 24 * H)
  const r = (deadlineMs: number, extra = {}) => ({
    createdAt: created,
    deadlineAt: new Date(NOW.getTime() + deadlineMs),
    ...extra,
  })
  it('is due inside the lead time, not before and not after the deadline', () => {
    expect(reminderDue(r(REMINDER_LEAD_MS + 1), NOW)).toBe(false)
    expect(reminderDue(r(REMINDER_LEAD_MS), NOW)).toBe(true)
    expect(reminderDue(r(H), NOW)).toBe(true)
    expect(reminderDue(r(0), NOW)).toBe(false)
    expect(reminderDue(r(-H), NOW)).toBe(false)
  })
  it('is not due once resolved or already sent', () => {
    expect(reminderDue(r(H, { resolvedAt: NOW }), NOW)).toBe(false)
    expect(reminderDue(r(H, { reminderSentAt: NOW }), NOW)).toBe(false)
  })
  it('skips a request opened with less than the lead time to run', () => {
    expect(reminderDue({ createdAt: NOW, deadlineAt: new Date(NOW.getTime() + 6 * H) }, NOW)).toBe(
      false,
    )
  })
})

describe('validateOpenRequest', () => {
  const allowed = ['title', 'links']
  const ok = { message: 'Please fix', fieldKeys: ['title'], deadlineAt: new Date(NOW.getTime() + H) }
  it('accepts a valid request, including one with no fields (a plain question)', () => {
    expect(validateOpenRequest(ok, NOW, allowed)).toEqual([])
    expect(validateOpenRequest({ ...ok, fieldKeys: [] }, NOW, allowed)).toEqual([])
  })
  it('flags an empty message, unknown fields and a deadline that is not in the future', () => {
    expect(validateOpenRequest({ ...ok, message: '   ' }, NOW, allowed)).toEqual(['message'])
    expect(validateOpenRequest({ ...ok, fieldKeys: ['nope'] }, NOW, allowed)).toEqual(['fields'])
    expect(validateOpenRequest({ ...ok, deadlineAt: NOW }, NOW, allowed)).toEqual(['deadline'])
    expect(validateOpenRequest({ ...ok, deadlineAt: null }, NOW, allowed)).toEqual(['deadline'])
    expect(validateOpenRequest({ ...ok, deadlineAt: 'garbage' }, NOW, allowed)).toEqual(['deadline'])
  })
})
