/**
 * The edit-lock rules, kept pure so the boundaries are
 * unit-testable without a database.
 */

/** A lock lapses 20 minutes after its last activity. */
export const LOCK_TTL_MS = 20 * 60 * 1000

/** Clients ping at most this often while there is activity. */
export const HEARTBEAT_INTERVAL_MS = 30 * 1000

/**
 * Live while `now < lastActivityAt + ttl`; the boundary instant itself is expired,
 * so "20 minutes without activity" means exactly that. Matches the SQL the service
 * uses (`last_activity_at > now - ttl` is live).
 */
export function isLockLive(
  lastActivityAt: Date,
  now: Date,
  ttlMs: number = LOCK_TTL_MS,
): boolean {
  return now.getTime() < lastActivityAt.getTime() + ttlMs
}

export function lockExpiry(lastActivityAt: Date, ttlMs: number = LOCK_TTL_MS): Date {
  return new Date(lastActivityAt.getTime() + ttlMs)
}

export type AcquireOutcome = 'acquired' | 'renewed' | 'expired_taken' | 'denied'

/**
 * What acquiring does given the existing row (none, mine, someone else's), live
 * or expired. There is no path where a live lock held by another is taken:
 * no forcing, staff included.
 */
export function acquireOutcome(
  existing: { holderUserId: string; lastActivityAt: Date } | null,
  userId: string,
  now: Date,
  ttlMs: number = LOCK_TTL_MS,
): AcquireOutcome {
  if (!existing) return 'acquired'
  const live = isLockLive(existing.lastActivityAt, now, ttlMs)
  if (existing.holderUserId === userId) return live ? 'renewed' : 'acquired'
  return live ? 'denied' : 'expired_taken'
}
