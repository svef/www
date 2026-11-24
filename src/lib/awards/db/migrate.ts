import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import { fileURLToPath } from 'node:url'

export const migrationsFolder = fileURLToPath(new URL('./migrations', import.meta.url))

/** Apply pending migrations to the database at `url`. Safe to re-run. */
export async function runMigrations(url: string): Promise<void> {
  const pool = new Pool({ connectionString: url, max: 1 })
  try {
    await migrate(drizzle(pool), { migrationsFolder })
  } finally {
    await pool.end()
  }
}

/**
 * CLI entry: `npm run awards:migrate`. Uses the unpooled URL (DDL and
 * advisory locks do not belong behind a transaction pooler) and falls back to
 * the pooled one, as on a plain local Postgres.
 */
async function main() {
  const url = process.env.AWARDS_DATABASE_URL_UNPOOLED ?? process.env.AWARDS_DATABASE_URL
  if (!url) {
    throw new Error(
      'Set AWARDS_DATABASE_URL_UNPOOLED (or AWARDS_DATABASE_URL) to migrate.',
    )
  }
  await runMigrations(url)
  console.log('awards: migrations applied')
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
