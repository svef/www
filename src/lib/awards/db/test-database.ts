import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { runMigrations } from './migrate'
import { seedAwards } from './seed'
import * as schema from './schema'

/**
 * A throwaway, migrated and seeded copy of the awards database, for suites that create
 * users, projects and events. `entry_event` is append-only (the database refuses to
 * delete from it), so rows such a suite writes can never be cleaned out of a shared
 * database; a database of its own can simply be dropped when the suite is done.
 *
 * `base` is any awards database URL on the server; the maintenance database `postgres`
 * on the same server is used to create and drop the copy, so the role needs CREATEDB.
 */
export type TestDatabase = { url: string; drop: () => Promise<void> }

export async function createTestDatabase(base: string): Promise<TestDatabase> {
  const name = `svef_awards_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const admin = new URL(base)
  admin.pathname = '/postgres'
  const target = new URL(base)
  target.pathname = `/${name}`

  const adminPool = new Pool({ connectionString: admin.toString(), max: 1 })
  try {
    await adminPool.query(`create database "${name}"`)
  } finally {
    await adminPool.end()
  }
  const drop = async () => {
    const pool = new Pool({ connectionString: admin.toString(), max: 1 })
    try {
      await pool.query(`drop database if exists "${name}" with (force)`)
    } finally {
      await pool.end()
    }
  }
  try {
    await runMigrations(target.toString())
    const pool = new Pool({ connectionString: target.toString(), max: 1 })
    try {
      await seedAwards(drizzle(pool, { schema }))
    } finally {
      await pool.end()
    }
  } catch (e) {
    await drop()
    throw e
  }
  return { url: target.toString(), drop }
}
