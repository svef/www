import { drizzle } from 'drizzle-orm/node-postgres'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { Pool } from 'pg'
import { fileURLToPath } from 'node:url'
import type { AwardsDb } from '../db/client'
import { appendUserEvent } from '../db/entry-event'
import * as schema from '../db/schema'
import { SUPERADMIN_ROLE } from '../auth/roles'

/**
 * Granting super admin, which the admin interface deliberately cannot do
 * (src/lib/awards/auth/roles.ts). Run by hand against a database:
 *
 *   npm run awards:grant-superadmin -- someone@example.com
 *
 * The account must already exist (sign up first). Idempotent: a user who already is a super
 * admin is left as they are and nothing is logged. A grant is logged in `user_event`
 * (`role_granted`, `{ role: 'superadmin' }`) with no actor, as a change made by the system.
 */
export type GrantSuperAdminResult = 'granted' | 'already' | 'not_found'

export async function grantSuperAdmin(
  db: AwardsDb,
  input: { email: string; now: Date },
): Promise<GrantSuperAdminResult> {
  const email = input.email.trim().toLowerCase()
  if (!email) return 'not_found'
  return db.transaction(async (tx) => {
    const [u] = await tx
      .select({ id: schema.user.id })
      .from(schema.user)
      .where(and(sql`lower(${schema.user.email}) = ${email}`, isNull(schema.user.deletedAt)))
      .for('update')
    if (!u) return 'not_found' as const
    const held = await tx
      .select({ id: schema.userRole.id })
      .from(schema.userRole)
      .where(
        and(
          eq(schema.userRole.userId, u.id),
          eq(schema.userRole.role, SUPERADMIN_ROLE),
          isNull(schema.userRole.deletedAt),
        ),
      )
    if (held.length > 0) return 'already' as const
    await tx.insert(schema.userRole).values({ userId: u.id, role: SUPERADMIN_ROLE })
    await appendUserEvent(tx, {
      userId: u.id,
      actorUserId: null,
      type: 'role_granted',
      data: { role: SUPERADMIN_ROLE },
      createdAt: input.now,
    })
    return 'granted' as const
  })
}

/** CLI entry: `npm run awards:grant-superadmin -- <email>`. */
async function main() {
  const email = process.argv[2]
  if (!email) throw new Error('Usage: npm run awards:grant-superadmin -- <email>')
  const url = process.env.AWARDS_DATABASE_URL_UNPOOLED ?? process.env.AWARDS_DATABASE_URL
  if (!url) throw new Error('Set AWARDS_DATABASE_URL_UNPOOLED (or AWARDS_DATABASE_URL).')
  const host = new URL(url).hostname
  const pool = new Pool({ connectionString: url, max: 1 })
  try {
    const result = await grantSuperAdmin(drizzle(pool, { schema }), { email, now: new Date() })
    if (result === 'not_found') {
      console.error(`awards: no account with the email ${email} on ${host}. Sign up first.`)
      process.exitCode = 1
    } else {
      console.log(
        result === 'granted'
          ? `awards: ${email} is now a super admin (${host})`
          : `awards: ${email} was already a super admin (${host}); nothing changed`,
      )
    }
  } finally {
    await pool.end()
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
