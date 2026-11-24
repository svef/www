import { existsSync, readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import type { BrowserContext } from '@playwright/test'
import { Pool } from 'pg'

/**
 * Test-only helpers for the awards e2e: users straight in the awards database, and
 * acting as one through the test-session cookie (see `src/lib/awards/session.ts`,
 * honoured only when the server runs with `AWARDS_TEST_SESSION=1`, as the Playwright
 * config starts it).
 */
const localEnv = existsSync('.env.local') ? parseEnv(readFileSync('.env.local', 'utf8')) : {}
const url =
  process.env.AWARDS_DATABASE_URL_UNPOOLED ??
  process.env.AWARDS_DATABASE_URL ??
  localEnv.AWARDS_DATABASE_URL_UNPOOLED ??
  localEnv.AWARDS_DATABASE_URL

let pool: Pool | undefined
export function awardsPool(): Pool {
  if (!url) throw new Error('AWARDS_DATABASE_URL is not set; the awards e2e needs the seeded database.')
  return (pool ??= new Pool({ connectionString: url, max: 3 }))
}

let counter = 0
export async function createUser(name: string, verified = false): Promise<string> {
  const { rows } = await awardsPool().query(
    `insert into "user" (id, name, email, email_verified) values (gen_random_uuid(), $1, $2, $3) returning id`,
    [name, `e2e-${Date.now()}-${counter++}-${Math.random().toString(36).slice(2)}@example.com`, verified],
  )
  return rows[0].id as string
}

/** The account's email, for finding what was sent to it. */
export async function emailOf(userId: string): Promise<string> {
  const { rows } = await awardsPool().query(`select email from "user" where id = $1`, [userId])
  return rows[0].email as string
}

/** Lets `userId` edit the project, as if they had accepted an invitation. */
export async function makeEditor(projectId: string, userId: string): Promise<void> {
  await awardsPool().query(
    `insert into project_person (id, project_id, kind, name, email, can_edit, user_id, accepted_at)
     values (gen_random_uuid(), $1, 'collaborator', 'Editor', 'editor@example.com', true, $2, now())`,
    [projectId, userId],
  )
}

/** The release token of the project's edit lock, or null when nobody holds it. */
export async function lockTokenOf(projectId: string): Promise<string | null> {
  const { rows } = await awardsPool().query(`select token from project_edit_lock where project_id = $1`, [projectId])
  return (rows[0]?.token as string | undefined) ?? null
}

export async function markSubmitted(projectId: string): Promise<void> {
  await awardsPool().query(
    `update entry set status = 'submitted', submitted_at = now() where project_id = $1`,
    [projectId],
  )
}

export async function closeAwardsPool(): Promise<void> {
  await pool?.end()
  pool = undefined
}

export async function actAs(
  context: BrowserContext,
  baseURL: string,
  userId: string,
  clockOffsetMs?: number,
): Promise<void> {
  const cookies = [{ name: 'awards-test-user', value: userId, url: baseURL }]
  if (clockOffsetMs !== undefined)
    cookies.push({ name: 'awards-test-clock-ms', value: String(clockOffsetMs), url: baseURL })
  await context.addCookies(cookies)
}
