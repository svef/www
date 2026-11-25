import { and, asc, eq, inArray, isNull } from 'drizzle-orm'
import type { AwardsDb } from '../db/client'
import { appendUserEvent } from '../db/entry-event'
import { user, userRole } from '../db/schema'
import { ADMIN_ROLE, hasAdminRole, hasSuperAdminRole } from '../auth/roles'

/**
 * Granting and removing the admin role from the admin's user page. Every change is logged
 * in `user_event` (`role_granted` / `role_removed`, with the role in `data`), in the same
 * transaction as the change.
 *
 * Only the regular admin role is managed here. A super admin has every admin permission,
 * but regular admins cannot manage super admins: a super admin's roles cannot be changed
 * from the admin, and super admin cannot be granted from it (`awards:grant-superadmin`).
 */

export type RoleChange = 'grant' | 'remove'

export type RoleChangeRefusal =
  /** An admin cannot remove their own role. */
  | 'self'
  /** The actor is no longer an admin (the role was removed after the page loaded). */
  | 'actor_not_admin'
  /** The target is a super admin, whom the admin cannot manage. */
  | 'superadmin'
  | 'already_admin'
  | 'not_admin'
  | 'not_found'

export type RoleChangeResult = { ok: true } | { ok: false; reason: RoleChangeRefusal }

/** The rule, without the database. The roles are the actor's and target's active ones. */
export function planRoleChange(input: {
  actorId: string
  targetId: string
  change: RoleChange
  actorRoles: readonly string[]
  targetRoles: readonly string[]
}): RoleChangeResult {
  if (!hasAdminRole(input.actorRoles)) return { ok: false, reason: 'actor_not_admin' }
  if (input.change === 'remove' && input.actorId === input.targetId) return { ok: false, reason: 'self' }
  if (hasSuperAdminRole(input.targetRoles)) return { ok: false, reason: 'superadmin' }
  const targetIsAdmin = input.targetRoles.includes(ADMIN_ROLE)
  if (input.change === 'remove') {
    if (!targetIsAdmin) return { ok: false, reason: 'not_admin' }
    return { ok: true }
  }
  if (targetIsAdmin) return { ok: false, reason: 'already_admin' }
  return { ok: true }
}

/**
 * Grants or removes the admin role. The caller has checked that the actor is an admin
 * (`requireAdmin`), but that was before this transaction, so the actor's roles are read
 * again here, as are the target's.
 *
 * Both user rows are locked first (`FOR UPDATE`, in id order so two changes never deadlock),
 * and every role change takes the same locks. So changes that touch the same people run one
 * after the other, and the second reads what the first committed: of two admins removing each
 * other at once, the second finds its own role gone and is refused. Removing is a soft
 * delete, like everything else here.
 */
export async function setAdminRole(
  db: AwardsDb,
  input: { actorId: string; targetId: string; change: RoleChange; now: Date },
): Promise<RoleChangeResult> {
  return db.transaction(async (tx) => {
    const ids = [...new Set([input.actorId, input.targetId])]
    const locked = await tx
      .select({ id: user.id })
      .from(user)
      .where(and(inArray(user.id, ids), isNull(user.deletedAt)))
      .orderBy(asc(user.id))
      .for('update')
    const present = new Set(locked.map((r) => r.id))
    if (!present.has(input.targetId)) return { ok: false, reason: 'not_found' } as const

    const held = await tx
      .select({ userId: userRole.userId, role: userRole.role })
      .from(userRole)
      .where(and(inArray(userRole.userId, ids), isNull(userRole.deletedAt)))
    const rolesOf = (id: string) => (present.has(id) ? held.filter((r) => r.userId === id).map((r) => r.role) : [])
    const plan = planRoleChange({
      actorId: input.actorId,
      targetId: input.targetId,
      change: input.change,
      actorRoles: rolesOf(input.actorId),
      targetRoles: rolesOf(input.targetId),
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
