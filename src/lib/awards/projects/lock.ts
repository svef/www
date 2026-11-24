import { randomUUID } from 'node:crypto'
import { and, eq, gt, sql } from 'drizzle-orm'
import { appendEntryEvent } from '../db/entry-event'
import { projectEditLock, user } from '../db/schema'
import type { Queryable, AwardsDb, Tx } from './db-types'
import { AwardsError, type LockInfo } from './errors'
import { acquireOutcome, LOCK_TTL_MS, lockExpiry } from './lock-rules'

/**
 * The project edit lock. One row per project, keyed by `project_id`:
 * the unique constraint settles races, and every state change is one statement.
 * Time always comes from the caller (`now`), never from the database clock, so
 * tests and the e2e suite can move it.
 *
 * Lock events (`lock_acquired`, `lock_expired_taken`, `lock_released`) go to
 * the append-only log in the same transaction as the change. Heartbeats and
 * renewals are not logged: they are noise.
 */

type Row = typeof projectEditLock.$inferSelect

async function toInfo(db: Queryable, row: Row): Promise<LockInfo> {
  const [u] = await db.select({ name: user.name }).from(user).where(eq(user.id, row.holderUserId))
  return {
    holderUserId: row.holderUserId,
    holderName: u?.name ?? '',
    acquiredAt: row.acquiredAt.toISOString(),
    lastActivityAt: row.lastActivityAt.toISOString(),
    expiresAt: lockExpiry(row.lastActivityAt).toISOString(),
  }
}

/** The live lock on a project, or null when there is none or it has expired. */
export async function getLiveLock(
  db: Queryable,
  projectId: string,
  now: Date,
  ttlMs: number = LOCK_TTL_MS,
): Promise<LockInfo | null> {
  const [row] = await db
    .select()
    .from(projectEditLock)
    .where(
      and(
        eq(projectEditLock.projectId, projectId),
        gt(projectEditLock.lastActivityAt, new Date(now.getTime() - ttlMs)),
      ),
    )
  if (!row) return null
  return {
    ...(await toInfo(db, row)),
    expiresAt: lockExpiry(row.lastActivityAt, ttlMs).toISOString(),
  }
}

export type AcquireResult =
  | {
      ok: true
      lock: LockInfo
      /** The release token for this acquisition. Never part of `LockInfo`: only the holder gets it. */
      token: string
      outcome: 'acquired' | 'renewed' | 'expired_taken'
    }
  | { ok: false; lock: LockInfo }

/**
 * Takes the lock if the project has none, it is mine, or it has expired.
 * A live lock held by someone else is refused, whoever asks. The caller has
 * already checked that `userId` may edit the project.
 */
export async function acquireLock(
  db: AwardsDb,
  args: {
    projectId: string
    userId: string
    now: Date
    ttlMs?: number
    /** Renewing my own live lock normally issues a new token; a background caller that must not invalidate an open page's passes false. */
    rotateToken?: boolean
  },
): Promise<AcquireResult> {
  const { projectId, userId, now, ttlMs = LOCK_TTL_MS, rotateToken = true } = args
  const freshToken = randomUUID()
  const cutoff = new Date(now.getTime() - ttlMs)
  return db.transaction(async (tx) => {
    // Locks the row (when there is one) so the outcome below describes what the
    // upsert will do; a concurrent acquirer waits here and then sees our result.
    const [prior] = await tx
      .select()
      .from(projectEditLock)
      .where(eq(projectEditLock.projectId, projectId))
      .for('update')

    const [row] = await tx
      .insert(projectEditLock)
      .values({
        projectId,
        holderUserId: userId,
        acquiredAt: now,
        lastActivityAt: now,
        token: freshToken,
      })
      .onConflictDoUpdate({
        target: projectEditLock.projectId,
        set: {
          holderUserId: userId,
          // Renewing my own live lock keeps its start time ("editing since").
          acquiredAt: sql`case when ${projectEditLock.holderUserId} = ${userId} and ${projectEditLock.lastActivityAt} > ${cutoff.toISOString()}::timestamptz then ${projectEditLock.acquiredAt} else ${now.toISOString()}::timestamptz end`,
          lastActivityAt: now,
          // A takeover always gets a new token; a renewal does too unless told to keep it.
          token: rotateToken
            ? freshToken
            : sql`case when ${projectEditLock.holderUserId} = ${userId} and ${projectEditLock.lastActivityAt} > ${cutoff.toISOString()}::timestamptz then ${projectEditLock.token} else ${freshToken}::uuid end`,
        },
        // The whole rule, in the database: mine, or expired. Never a live lock of another.
        setWhere: sql`${projectEditLock.holderUserId} = ${userId} or ${projectEditLock.lastActivityAt} <= ${cutoff.toISOString()}::timestamptz`,
      })
      .returning()

    if (!row) {
      const [held] = await tx
        .select()
        .from(projectEditLock)
        .where(eq(projectEditLock.projectId, projectId))
      return { ok: false as const, lock: await toInfo(tx, held) }
    }

    const outcome = acquireOutcome(prior ?? null, userId, now, ttlMs)
    if (outcome === 'acquired' || outcome === 'expired_taken') {
      await appendEntryEvent(tx, {
        projectId,
        actorUserId: userId,
        type: outcome === 'acquired' ? 'lock_acquired' : 'lock_expired_taken',
        data:
          outcome === 'expired_taken'
            ? {
                previousHolderUserId: prior!.holderUserId,
                previousLastActivityAt: prior!.lastActivityAt.toISOString(),
              }
            : null,
      })
    }
    return {
      ok: true as const,
      outcome: outcome === 'denied' ? 'acquired' : outcome,
      token: row.token,
      lock: { ...(await toInfo(tx, row)), expiresAt: lockExpiry(row.lastActivityAt, ttlMs).toISOString() },
    }
  })
}

/**
 * Records activity on a lock the caller holds and returns the new lock state, or
 * throws `lock_required` (carrying the live holder, if any). This is the check
 * every write path starts with, inside its own transaction: the UPDATE keeps the
 * row locked until the write commits, so a lock cannot lapse or change hands
 * mid-write, and every save counts as activity.
 */
export async function requireLock(
  tx: Tx | AwardsDb,
  args: { projectId: string; userId: string; now: Date; ttlMs?: number },
): Promise<LockInfo> {
  const { projectId, userId, now, ttlMs = LOCK_TTL_MS } = args
  const [row] = await tx
    .update(projectEditLock)
    .set({ lastActivityAt: now })
    .where(
      and(
        eq(projectEditLock.projectId, projectId),
        eq(projectEditLock.holderUserId, userId),
        gt(projectEditLock.lastActivityAt, new Date(now.getTime() - ttlMs)),
      ),
    )
    .returning()
  if (!row) {
    const current = await getLiveLock(tx, projectId, now, ttlMs)
    throw new AwardsError(
      'lock_required',
      current
        ? `${current.holderName} is editing this project.`
        : 'You do not hold the edit lock for this project.',
      { lock: current },
    )
  }
  return { ...(await toInfo(tx, row)), expiresAt: lockExpiry(row.lastActivityAt, ttlMs).toISOString() }
}

/** The client's throttled activity ping. Same rule as a write: no live lock of mine, no refresh. */
export async function heartbeatLock(
  db: AwardsDb,
  args: { projectId: string; userId: string; now: Date; ttlMs?: number },
): Promise<LockInfo> {
  return requireLock(db, args)
}

/**
 * Releases the lock I was issued. Best effort and idempotent: a lock I no longer hold, or
 * that has since been re-acquired (a new token), is left alone. Never touches someone
 * else's, and never a newer acquisition of my own: the token is what ties a release to the
 * acquisition it ends.
 */
export async function releaseLock(
  db: AwardsDb,
  args: { projectId: string; userId: string; token: string; now: Date },
): Promise<boolean> {
  const { projectId, userId, token } = args
  // Not a uuid: it can't match, and must not reach a uuid column as a cast error.
  if (!UUID.test(token)) return false
  return db.transaction(async (tx) => {
    const released = await tx
      .delete(projectEditLock)
      .where(
        and(
          eq(projectEditLock.projectId, projectId),
          eq(projectEditLock.holderUserId, userId),
          eq(projectEditLock.token, token),
        ),
      )
      .returning({ id: projectEditLock.id })
    if (released.length === 0) return false
    await appendEntryEvent(tx, { projectId, actorUserId: userId, type: 'lock_released' })
    return true
  })
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
