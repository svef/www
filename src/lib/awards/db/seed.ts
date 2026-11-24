import { eq, sql } from 'drizzle-orm'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { fileURLToPath } from 'node:url'
import seedData from '../data/categories-2026.json'
import * as schema from './schema'
import { category, categoryExclusion, categoryGroup, edition } from './schema'

type Db = NodePgDatabase<typeof schema>

export const EDITION_YEAR = 2026

/**
 * Idempotent upsert of the 2026 edition, its category group, the categories
 * and the exclusions, from `src/lib/awards/data/categories-2026.json`.
 * Keys on (year), (edition, slug) and the ordered category pair, so re-running
 * updates in place and never duplicates. `terms_version` is left alone: it is
 * set when the terms text exists, and a re-seed must not clear it.
 */
export async function seedAwards(db: Db): Promise<{ editionId: string }> {
  const e = seedData.edition
  return db.transaction(async (tx) => {
    const editionValues = {
      year: EDITION_YEAR,
      intakeOpensAt: new Date(e.intakeOpensAt),
      earlyBirdEndsBefore: new Date(e.earlyBirdEndsBefore),
      intakeClosesBefore: new Date(e.intakeClosesBefore),
      earlyBirdDiscountPercent: e.earlyBirdDiscountPercent,
      earlyBirdRounding: e.earlyBirdRounding,
    }
    const [ed] = await tx
      .insert(edition)
      .values(editionValues)
      .onConflictDoUpdate({
        target: edition.year,
        set: { ...editionValues, deletedAt: null },
      })
      .returning({ id: edition.id })
    const editionId = ed.id

    const groupIds = new Map<string, string>()
    for (const g of seedData.groups) {
      const values = {
        editionId,
        slug: g.slug,
        name: g.name,
        blurb: (g as { blurb?: schema.LocalizedText }).blurb ?? null,
        description: g.description ?? null,
        sortOrder: g.sortOrder,
        selectOne: g.selectOne,
      }
      const [row] = await tx
        .insert(categoryGroup)
        .values(values)
        .onConflictDoUpdate({
          target: [categoryGroup.editionId, categoryGroup.slug],
          set: { ...values, deletedAt: null },
        })
        .returning({ id: categoryGroup.id })
      groupIds.set(g.slug, row.id)
    }

    const categoryIds = new Map<string, string>()
    for (const c of seedData.categories) {
      const groupSlug = (c as { group?: string }).group
      const groupId = groupSlug ? groupIds.get(groupSlug) : undefined
      if (groupSlug && !groupId)
        throw new Error(`Unknown group "${groupSlug}" on ${c.slug}`)
      const values = {
        editionId,
        groupId: groupId ?? null,
        slug: c.slug,
        name: c.name,
        blurb: c.blurb ?? null,
        description: c.description ?? null,
        tierLabel: (c as { tierLabel?: schema.LocalizedText }).tierLabel ?? null,
        price: c.price,
        sortOrder: c.sortOrder,
      }
      const [row] = await tx
        .insert(category)
        .values(values)
        .onConflictDoUpdate({
          target: [category.editionId, category.slug],
          set: { ...values, deletedAt: null },
        })
        .returning({ id: category.id })
      categoryIds.set(c.slug, row.id)
    }

    for (const [slugA, slugB] of seedData.exclusions) {
      const a = categoryIds.get(slugA)
      const b = categoryIds.get(slugB)
      if (!a || !b) throw new Error(`Unknown category in exclusion ${slugA} / ${slugB}`)
      // Stored once, smaller id first (see the table's CHECK).
      const [categoryAId, categoryBId] = a < b ? [a, b] : [b, a]
      await tx
        .insert(categoryExclusion)
        .values({ categoryAId, categoryBId })
        .onConflictDoUpdate({
          target: [categoryExclusion.categoryAId, categoryExclusion.categoryBId],
          set: { deletedAt: null },
        })
    }

    return { editionId }
  })
}

/** CLI entry: `npm run awards:seed`. */
async function main() {
  const url = process.env.AWARDS_DATABASE_URL_UNPOOLED ?? process.env.AWARDS_DATABASE_URL
  if (!url) throw new Error('Set AWARDS_DATABASE_URL to seed.')
  const pool = new Pool({ connectionString: url, max: 1 })
  try {
    const db = drizzle(pool, { schema })
    await seedAwards(db)
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(category)
      .where(
        eq(
          category.editionId,
          sql`(select id from edition where year = ${EDITION_YEAR})`,
        ),
      )
    console.log(`awards: seeded ${EDITION_YEAR} edition with ${n} categories`)
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
