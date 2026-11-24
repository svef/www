import { and, eq, isNull } from 'drizzle-orm'
import type { AwardsDb } from '../db/client'
import { appendUserEvent } from '../db/entry-event'
import { user, userRole } from '../db/schema'
import { ADMIN_ROLE } from '../auth/roles'

/**
 * Granting and removing the admin role from the admin's user page. Every change is logged
 * in `user_event` (`role_granted` / `role_removed`, with the role in `data`), in the same
 * transaction as the change.
 */

export type RoleChange = 'grant' | 'remove'

export type RoleChangeRefusal =
  /** An admin cannot remove their own role: it is how the last admin stays one. */
  | 'self'
  | 'already_admin'
  | 'not_admin'
  | 'not_found'

export type RoleChangeResult = { ok: true } | { ok: false; reason: RoleChangeRefusal }

/** The rule, without the database. */
export function planRoleChange(input: {
  actorId: string
  targetId: string
  change: RoleChange
  targetIsAdmin: boolean
}): RoleChangeResult {
  if (input.change === 'remove') {
    if (input.actorId === input.targetId) return { ok: false, reason: 'self' }
    if (!input.targetIsAdmin) return { ok: false, reason: 'not_admin' }
    return { ok: true }
  }
  if (input.targetIsAdmin) return { ok: false, reason: 'already_admin' }
  return { ok: true }
}

/**
 * Grants or removes the admin role. The caller has checked that the actor is an admin
 * (`requireAdmin`). The target's user row is locked for the change, so two admins pressing
 * at once cannot both pass the check; removing is a soft delete, like everything else here.
 */
export async function setAdminRole(
  db: AwardsDb,
  input: { actorId: string; targetId: string; change: RoleChange; now: Date },
): Promise<RoleChangeResult> {
  return db.transaction(async (tx) => {
    const [target] = await tx
      .select({ id: user.id })
      .from(user)
      .where(and(eq(user.id, input.targetId), isNull(user.deletedAt)))
      .for('update')
    if (!target) return { ok: false, reason: 'not_found' } as const
    const held = await tx
      .select({ id: userRole.id })
      .from(userRole)
      .where(
        and(
          eq(userRole.userId, input.targetId),
          eq(userRole.role, ADMIN_ROLE),
          isNull(userRole.deletedAt),
        ),
      )
    const plan = planRoleChange({
      actorId: input.actorId,
      targetId: input.targetId,
      change: input.change,
      targetIsAdmin: held.length > 0,
    })
    if (!plan.ok) return plan

    if (input.change === 'grant') {
      await tx.insert(userRole).values({ userId: input.targetId, role: ADMIN_ROLE })
    } else {
      await tx
        .update(userRole)
        .set({ deletedAt: input.now })
        .where(
          and(
            eq(userRole.userId, input.targetId),
            eq(userRole.role, ADMIN_ROLE),
            isNull(userRole.deletedAt),
          ),
        )
    }
    await appendUserEvent(tx, {
      userId: input.targetId,
      actorUserId: input.actorId,
      type: input.change === 'grant' ? 'role_granted' : 'role_removed',
      data: { role: ADMIN_ROLE },
      createdAt: input.now,
    })
    return { ok: true } as const
  })
}
