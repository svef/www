import { existsSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { eq } from 'drizzle-orm'
import * as schema from '../src/lib/awards/db/schema'
import {
  createEntry,
  createProject,
  createUser,
  openFixtureDb,
  retireProjects,
  seededEdition,
  uniqueKennitala,
} from '../src/lib/awards/staff/test-fixtures'
import { closeAwardsPool, emailOf } from './awards-session'

/**
 * Draft reminders (svef/www#167): the cron route is guarded, sends nothing outside a wave,
 * mails a person with unsubmitted drafts once inside one, and does not mail them again. The
 * clock is passed as `?now=` (an authorised override, ignored on Vercel production), because the
 * server's own clock is fixed at 1 March 2027 by `playwright.config.ts`.
 */
if (existsSync('.env.local')) process.loadEnvFile('.env.local')

const RUN = uniqueKennitala().slice(0, 6)
const OUTBOX = path.resolve(process.cwd(), '.awards-outbox')
const CRON = '/api/awards/cron/draft-reminders'
const AUTH = { authorization: 'Bearer e2e-cron-secret' }

const { db, close } = openFixtureDb()
const projects: string[] = []
test.afterAll(async () => {
  await retireProjects(db, projects)
  await close()
  await closeAwardsPool()
})

async function mails(to: string) {
  const files = (await readdir(OUTBOX).catch(() => [] as string[])).filter((f) => f.endsWith(`-${to}.json`)).sort()
  return Promise.all(files.map(async (f) => JSON.parse(await readFile(path.join(OUTBOX, f), 'utf8'))))
}

test('the draft reminder cron is guarded and mails each person once per wave', async ({ request }) => {
  const ed = await seededEdition(db)
  const owner = await createUser(db, `drafts-${RUN}`)
  await db.update(schema.user).set({ preferredLocale: 'en' }).where(eq(schema.user.id, owner))
  const projectId = await createProject(db, { editionId: ed.editionId, userId: owner, title: `Drög ${RUN}` })
  projects.push(projectId)
  await createEntry(db, { projectId, categoryId: ed.categories[0].id, status: 'draft' })
  const email = await emailOf(owner)

  expect((await request.get(CRON)).status()).toBe(401)
  expect((await request.get(CRON, { headers: { authorization: 'Bearer wrong' } })).status()).toBe(401)

  // Outside both waves (between them, and the server's own clock, after close): nothing.
  for (const url of [`${CRON}?now=2027-01-15T09:00:00Z`, CRON]) {
    const res = await request.get(url, { headers: AUTH })
    expect(res.status()).toBe(200)
    expect((await res.json()).wave).toBeNull()
  }
  expect(await mails(email)).toEqual([])

  // Inside wave 1: mailed, in English, with the project and the deadline.
  const first = await request.get(`${CRON}?now=2027-01-03T09:00:00Z`, { headers: AUTH })
  expect(first.status()).toBe(200)
  expect(await first.json()).toMatchObject({ wave: 'early_bird' })
  const sent = await mails(email)
  expect(sent).toHaveLength(1)
  expect(sent[0].subject).toMatch(/early-bird/i)
  expect(sent[0].text).toContain(`Drög ${RUN}`)
  expect(sent[0].text).toContain('4 January 2027')
  expect(sent[0].text).toContain('/en/submissions/mine')

  // Again, the next day: nothing more for this person.
  await request.get(`${CRON}?now=2027-01-03T09:00:00Z`, { headers: AUTH })
  await request.get(`${CRON}?now=2027-01-04T09:00:00Z`, { headers: AUTH })
  expect(await mails(email)).toHaveLength(1)
  const log = await db.select().from(schema.reminderLog).where(eq(schema.reminderLog.userId, owner))
  expect(log.map((r) => r.wave)).toEqual(['early_bird'])

  // Wave 2 is its own reminder.
  await request.get(`${CRON}?now=2027-01-31T09:00:00Z`, { headers: AUTH })
  expect(await mails(email)).toHaveLength(2)
})
