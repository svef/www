import 'server-only'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

/**
 * The awards database client. Server-only, and a separate database from
 * Payload's: Payload never imports this module.
 *
 * One `pg` pool per server instance, created on first use so importing the
 * module never needs the environment (the build imports route modules).
 * `AWARDS_DATABASE_URL` is the pooled URL on Neon; migrations use the
 * unpooled one (see migrate.ts).
 */
export type AwardsDb = NodePgDatabase<typeof schema>

let pool: Pool | undefined
let db: AwardsDb | undefined

export function getAwardsDb(): AwardsDb {
  if (!db) {
    const url = process.env.AWARDS_DATABASE_URL
    if (!url) throw new Error('AWARDS_DATABASE_URL is not set.')
    // A small pool: serverless instances multiply, and Neon's pooler does the rest.
    pool = new Pool({ connectionString: url, max: 5 })
    db = drizzle(pool, { schema })
  }
  return db
}

export async function closeAwardsDb(): Promise<void> {
  await pool?.end()
  pool = undefined
  db = undefined
}
