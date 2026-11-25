// @vitest-environment node
import { and, eq, isNull } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import * as schema from '../db/schema'
import { createTestDatabase, type TestDatabase } from '../db/test-database'
import { withRollback } from '../staff/rollback'
import { createUser, openFixtureDb, type FixtureDb } from '../staff/test-fixtures'
import { planRoleChange, setAdminRole } from './roles'
import { grantSuperAdmin } from './superadmin'

describe('planRoleChange (pure)', () => {
  const base = { actorId: 'a', targetId: 'b' }
  const admin = ['admin']
  const superadmin = ['superadmin']

  it('lets an admin or a super admin grant to a non-admin and remove from an admin', () => {
    for (const actorRoles of [admin, superadmin]) {
      expect(planRoleChange({ ...base, change: 'grant', actorRoles, targetRoles: [] })).toEqual({ ok: true })
      expect(planRoleChange({ ...base, change: 'remove', actorRoles, targetRoles: admin })).toEqual({ ok: true })
    }
  })

  it('refuses to remove the actor’s own role, whatever else is true', () => {
    for (const roles of [admin, superadmin]) {
      expect(
        planRoleChange({ actorId: 'a', targetId: 'a', change: 'remove', actorRoles: roles, targetRoles: roles }),
      ).toEqual({ ok: false, reason: 'self' })
    }
  })

  it('refuses a change that changes nothing', () => {
    expect(planRoleChange({ ...base, change: 'grant', actorRoles: admin, targetRoles: admin })).toEqual({
      ok: false,
      reason: 'already_admin',
    })
    expect(planRoleChange({ ...base, change: 'remove', actorRoles: admin, targetRoles: [] })).toEqual({
      ok: false,
      reason: 'not_admin',
    })
  })

  it('never touches a super admin: not removing, not granting, not even by another super admin', () => {
    for (const actorRoles of [admin, superadmin]) {
      for (const targetRoles of [superadmin, ['superadmin', 'admin']]) {
        for (const change of ['grant', 'remove'] as const) {
          expect(planRoleChange({ ...base, change, actorRoles, targetRoles })).toEqual({
            ok: false,
            reason: 'superadmin',
          })
        }
      }
    }
  })

  it('refuses an actor who is no longer an admin (the retired staff value does not count)', () => {
    for (const actorRoles of [[], ['staff']]) {
      expect(planRoleChange({ ...base, change: 'grant', actorRoles, targetRoles: [] })).toEqual({
        ok: false,
        reason: 'actor_not_admin',
      })
      expect(planRoleChange({ ...base, change: 'remove', actorRoles, targetRoles: admin })).toEqual({
        ok: false,
        reason: 'actor_not_admin',
      })
    }
  })
})

const url = process.env.AWARDS_DATABASE_URL_UNPOOLED ?? process.env.AWARDS_DATABASE_URL

const activeRoles = async (tx: FixtureDb, userId: string) =>
  (
    await tx
      .select({ role: schema.userRole.role })
      .from(schema.userRole)
      .where(and(eq(schema.userRole.userId, userId), isNull(schema.userRole.deletedAt)))
  )
    .map((r) => r.role)
    .sort()
const events = (tx: FixtureDb, userId: string) =>
  tx.select().from(schema.userEvent).where(eq(schema.userEvent.userId, userId))
const makeAdmin = (tx: FixtureDb, userId: string, role = 'admin') =>
  tx.insert(schema.userRole).values({ userId, role })

describe.skipIf(!url)('setAdminRole', () => {
  const { db, close } = openFixtureDb()
  afterAll(() => close())
  const now = new Date('2027-02-01T12:00:00Z')

  it('grants, removes and logs each change; never the actor’s own role', async () => {
    await withRollback(db, async (tx) => {
      const actor = await createUser(tx, 'role-actor')
      await makeAdmin(tx, actor)
      const target = await createUser(tx, 'role-target')

      expect(await setAdminRole(tx, { actorId: actor, targetId: target, change: 'grant', now })).toEqual({ ok: true })
      expect(await activeRoles(tx, target)).toEqual(['admin'])
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
      expect(await setAdminRole(tx, { actorId: actor, targetId: actor, change: 'remove', now })).toEqual({
        ok: false,
        reason: 'self',
      })
      expect(await activeRoles(tx, actor)).toEqual(['admin'])
      expect(await events(tx, actor)).toHaveLength(0)
    })
  })

  it('re-reads the actor’s roles: someone whose admin role is gone cannot change anything', async () => {
    await withRollback(db, async (tx) => {
      const actor = await createUser(tx, 'role-demoted')
      const target = await createUser(tx, 'role-target')
      expect(await setAdminRole(tx, { actorId: actor, targetId: target, change: 'grant', now })).toEqual({
        ok: false,
        reason: 'actor_not_admin',
      })
      expect(await activeRoles(tx, target)).toEqual([])
    })
  })

  it('leaves a super admin alone, and lets a super admin manage admins', async () => {
    await withRollback(db, async (tx) => {
      const admin = await createUser(tx, 'role-admin')
      await makeAdmin(tx, admin)
      const sup = await createUser(tx, 'role-super')
      await makeAdmin(tx, sup, 'superadmin')
      for (const change of ['grant', 'remove'] as const) {
        expect(await setAdminRole(tx, { actorId: admin, targetId: sup, change, now })).toEqual({
          ok: false,
          reason: 'superadmin',
        })
      }
      expect(await activeRoles(tx, sup)).toEqual(['superadmin'])
      expect(await events(tx, sup)).toHaveLength(0)

      expect(await setAdminRole(tx, { actorId: sup, targetId: admin, change: 'remove', now })).toEqual({ ok: true })
      expect(await setAdminRole(tx, { actorId: sup, targetId: admin, change: 'grant', now })).toEqual({ ok: true })
      expect(await activeRoles(tx, admin)).toEqual(['admin'])
    })
  })

  it('says when the account does not exist', async () => {
    await withRollback(db, async (tx) => {
      const actor = await createUser(tx, 'role-actor')
      await makeAdmin(tx, actor)
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

describe.skipIf(!url)('grantSuperAdmin', () => {
  const { db, close } = openFixtureDb()
  afterAll(() => close())
  const now = new Date('2027-02-01T12:00:00Z')

  it('grants once, logs it as the system, matches the email in any case, and refuses unknown emails', async () => {
    await withRollback(db, async (tx) => {
      const id = await createUser(tx, 'super-target')
      const [{ email }] = await tx.select({ email: schema.user.email }).from(schema.user).where(eq(schema.user.id, id))
      expect(await grantSuperAdmin(tx, { email: ` ${email.toUpperCase()} `, now })).toBe('granted')
      expect(await grantSuperAdmin(tx, { email, now })).toBe('already')
      expect(await activeRoles(tx, id)).toEqual(['superadmin'])
      const log = await events(tx, id)
      expect(log.map((e) => [e.type, e.actorUserId, e.data])).toEqual([['role_granted', null, { role: 'superadmin' }]])
      expect(await grantSuperAdmin(tx, { email: 'nobody-here@example.test', now })).toBe('not_found')
    })
  })
})

/**
 * Real concurrency needs real commits, so this runs in a database of its own (dropped after):
 * two admins remove each other at the same moment, again and again. Each time exactly one
 * change goes through and the other is refused, because the second reads the first's commit.
 */
describe.skipIf(!url)('setAdminRole under concurrency', () => {
  let test: TestDatabase
  let pool: Pool
  let db: FixtureDb
  beforeAll(async () => {
    test = await createTestDatabase(url!)
    pool = new Pool({ connectionString: test.url, max: 4 })
    db = drizzle(pool, { schema })
  }, 60_000)
  afterAll(async () => {
    await pool?.end()
    await test?.drop()
  })

  it('two admins removing each other at once leaves one of them an admin', async () => {
    const now = new Date('2027-02-01T12:00:00Z')
    for (let round = 0; round < 8; round++) {
      const a = await createUser(db, `race-a-${round}`)
      const b = await createUser(db, `race-b-${round}`)
      await makeAdmin(db, a)
      await makeAdmin(db, b)
      const results = await Promise.all([
        setAdminRole(db, { actorId: a, targetId: b, change: 'remove', now }),
        setAdminRole(db, { actorId: b, targetId: a, change: 'remove', now }),
      ])
      expect(results.filter((r) => r.ok)).toHaveLength(1)
      expect(results.filter((r) => !r.ok)).toEqual([{ ok: false, reason: 'actor_not_admin' }])
      const remaining = [...(await activeRoles(db, a)), ...(await activeRoles(db, b))]
      expect(remaining).toEqual(['admin'])
    }
  }, 60_000)
})
