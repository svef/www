import { describe, expect, it } from 'vitest'
import { acquireOutcome, isLockLive, LOCK_TTL_MS, lockExpiry } from './lock-rules'

const T0 = new Date('2026-12-01T14:00:00Z')
const at = (ms: number) => new Date(T0.getTime() + ms)

describe('lock expiry', () => {
  it('is 20 minutes', () => {
    expect(LOCK_TTL_MS).toBe(20 * 60 * 1000)
    expect(lockExpiry(T0).toISOString()).toBe('2026-12-01T14:20:00.000Z')
  })

  it('is live one millisecond before the boundary and expired at it', () => {
    expect(isLockLive(T0, at(LOCK_TTL_MS - 1))).toBe(true)
    expect(isLockLive(T0, at(LOCK_TTL_MS))).toBe(false)
    expect(isLockLive(T0, at(LOCK_TTL_MS + 1))).toBe(false)
  })

  it('is live right after activity', () => {
    expect(isLockLive(T0, T0)).toBe(true)
  })
})

describe('acquire outcome', () => {
  const mine = { holderUserId: 'me', lastActivityAt: T0 }
  const theirs = { holderUserId: 'them', lastActivityAt: T0 }

  it('takes a free project', () => {
    expect(acquireOutcome(null, 'me', T0)).toBe('acquired')
  })

  it('renews my own live lock and re-takes my own expired one', () => {
    expect(acquireOutcome(mine, 'me', at(1000))).toBe('renewed')
    expect(acquireOutcome(mine, 'me', at(LOCK_TTL_MS))).toBe('acquired')
  })

  it('refuses a live lock held by someone else, however late short of expiry', () => {
    expect(acquireOutcome(theirs, 'me', T0)).toBe('denied')
    expect(acquireOutcome(theirs, 'me', at(LOCK_TTL_MS - 1))).toBe('denied')
  })

  it('takes an expired lock held by someone else', () => {
    expect(acquireOutcome(theirs, 'me', at(LOCK_TTL_MS))).toBe('expired_taken')
  })
})
