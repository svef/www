// @vitest-environment node
import { and, eq, isNull } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'
import * as schema from '../db/schema'
import { withRollback } from '../staff/rollback'
import { createUser, openFixtureDb } from '../staff/test-fixtures'
import { planRoleChange, setAdminRole } from './roles'

describe('planRoleChange (pure)', () => {
  const base = { actorId: 'a', targetId: 'b' }

  it('grants to someone who is not an admin, and removes from someone who is', () => {
    expect(planRoleChange({ ...base, change: 'grant', targetIsAdmin: false })).toEqual({ ok: true })
    expect(planRoleChange({ ...base, change: 'remove', targetIsAdmin: true })).toEqual({ ok: true })
  })

  it('refuses to remove the actor’s own role, whatever else is true', () => {
    expect(planRoleChange({ actorId: 'a', targetId: 'a', change: 'remove', targetIsAdmin: true })).toEqual({
      ok: false,
      reason: 'self',
    })
  })

  it('refuses a change that changes nothing', () => {
    expect(planRoleChange({ ...base, change: 'grant', targetIsAdmin: true })).toEqual({
      ok: false,
      reason: 'already_admin',
    })
    expect(planRoleChange({ ...base, change: 'remove', targetIsAdmin: false })).toEqual({
      ok: false,
      reason: 'not_admin',
    })
  })
})

const url = process.env.AWARDS_DATABASE_URL_UNPOOLED ?? process.env.AWARDS_DATABASE_URL

describe.skipIf(!url)('setAdminRole', () => {
  const { db, close } = openFixtureDb()
  afterAll(() => close())
  const now = new Date('2027-02-01T12:00:00Z')

  const activeRoles = (tx: typeof db, userId: string) =>
    tx
      .select({ role: schema.userRole.role })
      .from(schema.userRole)
      .where(and(eq(schema.userRole.userId, userId), isNull(schema.userRole.deletedAt)))
  const events = (tx: typeof db, userId: string) =>
    tx.select().from(schema.userEvent).where(eq(schema.userEvent.userId, userId))

  it('grants, removes and logs each change; never the actor’s own role', async () => {
    await withRollback(db, async (tx) => {
      const actor = await createUser(tx, 'role-actor')
      const target = await createUser(tx, 'role-target')

      expect(await setAdminRole(tx, { actorId: actor, targetId: target, change: 'grant', now })).toEqual({ ok: true })
      expect(await activeRoles(tx, target)).toEqual([{ role: 'admin' }])
      expect(await setAdminRole(tx, { actorId: actor, targetId: target, change: 'grant', now })).toEqual({
        ok: false,
        reason: 'already_admin',
      })

      expect(await setAdminRole(tx, { actorId: actor, targetId: target, change: 'remove', now })).toEqual({ ok: true })
      expect(await activeRoles(tx, target)).toEqual([])
      // The row is kept, soft-deleted.
      const all = await tx.select().from(schema.userRole).where(eq(schema.userRole.userId, target))
      expect(all).toHaveLength(1)
      expect(all[0].deletedAt).not.toBeNull()

      const log = await events(tx, target)
      expect(log.map((e) => [e.type, e.actorUserId, e.data])).toEqual([
        ['role_granted', actor, { role: 'admin' }],
        ['role_removed', actor, { role: 'admin' }],
      ])

      // An admin cannot take their own role away, and nothing is logged for the attempt.
      await setAdminRole(tx, { actorId: target, targetId: actor, change: 'grant', now })
      expect(await setAdminRole(tx, { actorId: actor, targetId: actor, change: 'remove', now })).toEqual({
        ok: false,
        reason: 'self',
      })
      expect(await activeRoles(tx, actor)).toEqual([{ role: 'admin' }])
      expect(await events(tx, actor)).toHaveLength(1)
    })
  })

  it('says when the account does not exist', async () => {
    await withRollback(db, async (tx) => {
      const actor = await createUser(tx, 'role-actor')
      expect(
        await setAdminRole(tx, {
          actorId: actor,
          targetId: '0198c7a0-1111-7222-8333-444455556666',
          change: 'grant',
          now,
        }),
      ).toEqual({ ok: false, reason: 'not_found' })
    })
  })
})
