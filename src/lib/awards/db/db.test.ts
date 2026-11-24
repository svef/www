// @vitest-environment node
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool, type PoolClient } from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { runMigrations } from './migrate'
import { seedAwards } from './seed'
import * as schema from './schema'

/**
 * Smoke test against a real Postgres: applies the migrations, seeds, and
 * checks the append-only guard. Skipped when AWARDS_DATABASE_URL is unset so
 * `test:ci` stays green on a machine without the database; CI sets it.
 */
const url = process.env.AWARDS_DATABASE_URL_UNPOOLED ?? process.env.AWARDS_DATABASE_URL

describe.skipIf(!url)('awards database', () => {
  let pool: Pool
  const db = () => drizzle(pool, { schema })

  beforeAll(async () => {
    await runMigrations(url!)
    pool = new Pool({ connectionString: url, max: 2 })
    await seedAwards(db())
  })
  afterAll(async () => {
    await pool?.end()
  })

  const count = async (table: string) => {
    const { rows } = await pool.query(`select count(*)::int as n from ${table}`)
    return rows[0].n as number
  }

  it('seeds the 2026 edition, group, 18 categories and the exclusion', async () => {
    expect(await count('edition')).toBe(1)
    expect(await count('category_group')).toBe(1)
    expect(await count('category')).toBe(18)
    expect(await count('category_exclusion')).toBe(1)
  })

  it('is idempotent', async () => {
    await seedAwards(db())
    expect(await count('edition')).toBe(1)
    expect(await count('category')).toBe(18)
    expect(await count('category_exclusion')).toBe(1)
  })

  it('stores the edition bounds and the grouped tiers', async () => {
    const [e] = await db().select().from(schema.edition)
    expect(e.intakeClosesBefore.toISOString()).toBe('2027-02-02T00:00:00.000Z')
    expect(e.earlyBirdDiscountPercent).toBe(30)
    const { rows } = await pool.query(
      `select count(*)::int as n from category where group_id is not null`,
    )
    expect(rows[0].n).toBe(4)
  })

  describe('entry_event is append-only', () => {
    // Everything runs in a transaction that is rolled back, so no
    // un-deletable event rows are left behind.
    const inRolledBackTx = async (fn: (client: PoolClient) => Promise<void>) => {
      const client = await pool.connect()
      try {
        await client.query('begin')
        await fn(client)
      } finally {
        await client.query('rollback')
        client.release()
      }
    }

    const insertEvent = async (client: PoolClient) => {
      const u = await client.query(
        `insert into "user" (id, name, email) values (gen_random_uuid(), 'T', $1) returning id`,
        [`t-${Date.now()}@example.com`],
      )
      const ed = await client.query(`select id from edition limit 1`)
      const p = await client.query(
        `insert into project (id, edition_id, created_by, locale)
         values (gen_random_uuid(), $1, $2, 'is') returning id`,
        [ed.rows[0].id, u.rows[0].id],
      )
      await client.query(
        `insert into entry_event (id, project_id, type) values (gen_random_uuid(), $1, 'test')`,
        [p.rows[0].id],
      )
    }

    it('accepts inserts', async () => {
      await inRolledBackTx(async (client) => {
        await insertEvent(client)
        const { rows } = await client.query(`select count(*)::int as n from entry_event`)
        expect(rows[0].n).toBeGreaterThan(0)
      })
    })

    it.each([
      ['UPDATE', `update entry_event set type = 'x'`],
      ['DELETE', `delete from entry_event`],
      ['TRUNCATE', `truncate entry_event`],
    ])('rejects %s', async (_op, statement) => {
      await inRolledBackTx(async (client) => {
        await insertEvent(client)
        await expect(client.query(statement)).rejects.toThrow(/append-only/)
      })
    })
  })

  it('enforces unique (project, category) and the price-snapshot check', async () => {
    const client = await pool.connect()
    try {
      await client.query('begin')
      const u = await client.query(
        `insert into "user" (id, name, email) values (gen_random_uuid(), 'T', $1) returning id`,
        [`u-${Date.now()}@example.com`],
      )
      const ed = await client.query(`select id from edition limit 1`)
      const p = await client.query(
        `insert into project (id, edition_id, created_by, locale)
         values (gen_random_uuid(), $1, $2, 'en') returning id`,
        [ed.rows[0].id, u.rows[0].id],
      )
      const c = await client.query(`select id from category limit 1`)
      const insertEntry = `insert into entry (id, project_id, category_id) values (gen_random_uuid(), $1, $2)`
      await client.query(insertEntry, [p.rows[0].id, c.rows[0].id])
      await client.query('savepoint s1')
      await expect(
        client.query(insertEntry, [p.rows[0].id, c.rows[0].id]),
      ).rejects.toThrow(/entry_project_category_key/)
      await client.query('rollback to savepoint s1')
      await expect(
        client.query(`update entry set price_amount = 100 where project_id = $1`, [
          p.rows[0].id,
        ]),
      ).rejects.toThrow(/entry_price_snapshot_check/)
    } finally {
      await client.query('rollback')
      client.release()
    }
  })

  it('has a unique edit lock per project', async () => {
    const { rows } = await pool.query(
      `select 1 from pg_constraint where conname = 'project_edit_lock_project_key'`,
    )
    expect(rows).toHaveLength(1)
  })
})
