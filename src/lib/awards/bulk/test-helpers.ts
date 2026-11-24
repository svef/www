import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from '../db/schema'
import {
  acquireEditLock,
  createProject,
  releaseEditLock,
  saveAnswers,
  setCategories,
  setProjectBillingProfile,
} from '../projects/service'
import { AwardsError } from '../projects/errors'

/**
 * Shared set-up for the withdraw and bulk suites (each makes its own throwaway database):
 * verified users, and projects with every required answer, a billing profile and entries,
 * built through the real services so the rows are what the app would write.
 */
export type Db = ReturnType<typeof drizzle<typeof schema>>

export const EARLY = new Date('2026-12-15T12:00:00Z')
export const REGULAR = new Date('2027-01-10T12:00:00Z')

export const complete = {
  title: 'Fjallavefurinn',
  description: 'A site about mountains.',
  owners: [{ name: 'Anna', email: 'anna@example.is' }],
  publicCredit: 'Made by Anna',
  links: ['https://fjall.is'],
  appLinks: ['https://apps.apple.com/is/app/x/id1'],
  campaignPeriod: { start: '2026-05-01', end: '2026-06-01' },
}

let n = 0
export async function makeUser(db: Db, name: string, verified = true) {
  const [u] = await db
    .insert(schema.user)
    .values({
      name,
      email: `bulk-${Date.now()}-${n++}-${Math.random().toString(36).slice(2)}@example.com`,
      emailVerified: verified,
    })
    .returning({ id: schema.user.id, email: schema.user.email })
  return u
}

export async function makeProfile(db: Db, ownerUserId: string, companyName = 'Fjall ehf.') {
  const [bp] = await db
    .insert(schema.billingProfile)
    .values({
      ownerUserId,
      kennitala: '7106697169',
      companyName,
      invoiceEmail: 'invoice@fjall.is',
      address: 'Laugavegur 1',
    })
    .returning({ id: schema.billingProfile.id })
  return bp.id
}

/**
 * A project by `owner` with the given categories. The owner holds the edit lock at `now` unless
 * `release` is set (a bulk action takes the lock itself). `fill` writes the required answers.
 */
export async function makeProject(
  db: Db,
  owner: { id: string },
  categories: string[],
  opts: { now?: Date; fill?: boolean; billing?: boolean | string; title?: string } = {},
) {
  const now = opts.now ?? EARLY
  const [ed] = await db.select().from(schema.edition).where(eq(schema.edition.year, 2026))
  const { id } = await createProject(db, { userId: owner.id, locale: 'en', editionId: ed.id })
  await acquireEditLock(db, { userId: owner.id, projectId: id, now })
  await setCategories(db, { userId: owner.id, projectId: id, categories, now })
  if (opts.fill ?? true)
    await saveAnswers(db, {
      userId: owner.id,
      projectId: id,
      now,
      patch: { answers: { ...complete, title: opts.title ?? complete.title } },
    })
  if (opts.billing !== false) {
    const profileId = typeof opts.billing === 'string' ? opts.billing : await makeProfile(db, owner.id)
    await setProjectBillingProfile(db, { userId: owner.id, projectId: id, billingProfileId: profileId, now })
  }
  return { id, ed }
}

export const entriesOf = (db: Db, projectId: string) =>
  db.select().from(schema.entry).where(eq(schema.entry.projectId, projectId))

export async function eventsOf(db: Db, projectId: string, type: string) {
  const rows = await db.select().from(schema.entryEvent).where(eq(schema.entryEvent.projectId, projectId))
  return rows.filter((e) => e.type === type)
}

export async function refusal(p: Promise<unknown>) {
  try {
    await p
  } catch (e) {
    if (e instanceof AwardsError) return e
    throw e
  }
  throw new Error('expected an AwardsError')
}

export async function acceptTerms(db: Db, userId: string, projectId: string) {
  await db
    .insert(schema.termsAcceptance)
    .values({ userId, projectId, termsVersion: 'draft', acceptedAt: EARLY })
}

/** Releases the lock `userId` holds on a project, with the token its acquisition was issued. */
export async function releaseHeldLock(db: Db, userId: string, projectId: string, now: Date) {
  const [row] = await db
    .select({ token: schema.projectEditLock.token })
    .from(schema.projectEditLock)
    .where(eq(schema.projectEditLock.projectId, projectId))
  return releaseEditLock(db, { userId, projectId, token: row?.token ?? '', now })
}
