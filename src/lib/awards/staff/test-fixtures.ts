import { and, asc, eq, inArray, isNull } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from '../db/schema'
import { uuidv7 } from 'uuidv7'

/**
 * Rows for the staff tests (Vitest and Playwright), inserted straight through the
 * schema: the project form service (#160) is built separately, and these tests are
 * about what staff do *after* a form was submitted.
 *
 * They add no editions or categories: editions are shared state that other tests
 * count and read (the "latest" edition is what the public pages show), so the tests
 * work inside the seeded edition. The rows they add are retired (soft-deleted) when
 * the test ends, and every assertion is about the rows the test made, since other
 * tests may have rows in the same edition. `entry_event` is append-only, so the log
 * rows stay behind, hanging off retired projects.
 */
export type FixtureDb = ReturnType<typeof openFixtureDb>['db']

export function openFixtureDb(url = process.env.AWARDS_DATABASE_URL_UNPOOLED ?? process.env.AWARDS_DATABASE_URL) {
  if (!url) throw new Error('AWARDS_DATABASE_URL is not set.')
  const pool = new Pool({ connectionString: url, max: 2 })
  return { db: drizzle(pool, { schema }), close: () => pool.end() }
}

export type SeededEdition = {
  editionId: string
  intakeClosesBefore: Date
  /** Two seeded categories, in sort order, with their Icelandic names. */
  categories: [{ id: string; name: string }, { id: string; name: string }]
}

/** The seeded edition (`npm run awards:seed`) and its first two categories. */
export async function seededEdition(db: FixtureDb): Promise<SeededEdition> {
  const [ed] = await db
    .select()
    .from(schema.edition)
    .where(and(eq(schema.edition.year, 2026), isNull(schema.edition.deletedAt)))
  if (!ed) throw new Error('No seeded 2026 edition: run `npm run awards:seed`.')
  const cats = await db
    .select()
    .from(schema.category)
    .where(and(eq(schema.category.editionId, ed.id), isNull(schema.category.deletedAt)))
    .orderBy(asc(schema.category.sortOrder), asc(schema.category.slug))
    .limit(2)
  if (cats.length < 2) throw new Error('The seeded edition has fewer than two categories.')
  const pick = (c: (typeof cats)[number]) => ({ id: c.id, name: c.name.is })
  return {
    editionId: ed.id,
    intakeClosesBefore: ed.intakeClosesBefore,
    categories: [pick(cats[0]), pick(cats[1])],
  }
}

/** A ten-digit kennitala-shaped string, unique per call. `leadingZero` for the Excel-eats-zeros case. */
export function uniqueKennitala(leadingZero = false): string {
  const digits = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join('')
  return `${leadingZero ? 0 : 1 + Math.floor(Math.random() * 9)}${digits}`
}

/** Soft-deletes projects the test made, so they drop out of every list and export. */
export async function retireProjects(db: FixtureDb, projectIds: readonly string[]): Promise<void> {
  if (projectIds.length === 0) return
  await db
    .update(schema.project)
    .set({ deletedAt: new Date() })
    .where(inArray(schema.project.id, [...projectIds]))
}

export async function createUser(db: FixtureDb, label: string): Promise<string> {
  const [u] = await db
    .insert(schema.user)
    .values({ name: label, email: `${label}-${uuidv7()}@example.test` })
    .returning({ id: schema.user.id })
  return u.id
}

export type FixtureBilling = {
  kennitala: string
  companyName: string
  invoiceEmail?: string
  address?: string
  reference?: string | null
}

export async function createBillingProfile(
  db: FixtureDb,
  ownerUserId: string,
  b: FixtureBilling,
): Promise<string> {
  const [row] = await db
    .insert(schema.billingProfile)
    .values({
      ownerUserId,
      kennitala: b.kennitala,
      companyName: b.companyName,
      invoiceEmail: b.invoiceEmail ?? 'reikningar@example.test',
      address: b.address ?? 'Aðalstræti 1, 101 Reykjavík',
      reference: b.reference ?? null,
    })
    .returning({ id: schema.billingProfile.id })
  return row.id
}

export async function createProject(
  db: FixtureDb,
  input: { editionId: string; userId: string; title: string; billingProfileId?: string },
): Promise<string> {
  const [p] = await db
    .insert(schema.project)
    .values({
      editionId: input.editionId,
      createdBy: input.userId,
      billingProfileId: input.billingProfileId ?? null,
      locale: 'is',
    })
    .returning({ id: schema.project.id })
  await db
    .insert(schema.projectAnswer)
    .values({ projectId: p.id, fieldKey: 'title', value: input.title })
  return p.id
}

export async function createEntry(
  db: FixtureDb,
  input: {
    projectId: string
    categoryId: string
    status: schema.EntryStatus
    submittedAt?: Date
    priceRegular?: number
    discountPercent?: number
    priceAmount?: number
  },
): Promise<string> {
  const priced = input.status !== 'draft' && input.status !== 'withdrawn'
  const submittedAt = priced ? (input.submittedAt ?? new Date('2027-01-05T13:22:00Z')) : null
  const [e] = await db
    .insert(schema.entry)
    .values({
      projectId: input.projectId,
      categoryId: input.categoryId,
      status: input.status,
      submittedAt,
      ...(priced
        ? {
            priceRegular: input.priceRegular ?? 26900,
            discountPercent: input.discountPercent ?? 30,
            priceAmount: input.priceAmount ?? 18900,
            priceLockedAt: submittedAt,
          }
        : {}),
    })
    .returning({ id: schema.entry.id })
  return e.id
}
