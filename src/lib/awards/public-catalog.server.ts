import 'server-only'
import { and, desc, eq, isNull } from 'drizzle-orm'
import { getAwardsDb } from './db/client'
import { category, categoryGroup, edition } from './db/schema'
import {
  buildChoices,
  intakePhase,
  type IntakePhase,
  type PublicChoice,
  type PublicEdition,
} from './public-catalog'

export type PublicCatalog = { edition: PublicEdition; choices: PublicChoice[] }

/**
 * The latest edition and its choices, read from the awards database: it is the
 * source of truth, so a price edited there shows on the page.
 *
 * Returns null when the database holds no edition. A connection error is thrown,
 * not swallowed: during a revalidation Next then keeps serving the last good
 * page instead of caching an error page, and a build fails loudly. A caller that
 * would rather degrade (the home page keeps its teaser) catches it itself.
 */
export async function getPublicCatalog(): Promise<PublicCatalog | null> {
  const db = getAwardsDb()
  const [ed] = await db
    .select()
    .from(edition)
    .where(isNull(edition.deletedAt))
    .orderBy(desc(edition.year))
    .limit(1)
  if (!ed) return null

  const [groups, categories] = await Promise.all([
    db
      .select()
      .from(categoryGroup)
      .where(and(eq(categoryGroup.editionId, ed.id), isNull(categoryGroup.deletedAt))),
    db
      .select()
      .from(category)
      .where(and(eq(category.editionId, ed.id), isNull(category.deletedAt))),
  ])

  const rounding = ed.earlyBirdRounding as PublicEdition['earlyBirdRounding']
  return {
    edition: {
      year: ed.year,
      intakeOpensAt: ed.intakeOpensAt.toISOString(),
      earlyBirdEndsBefore: ed.earlyBirdEndsBefore.toISOString(),
      intakeClosesBefore: ed.intakeClosesBefore.toISOString(),
      earlyBirdDiscountPercent: ed.earlyBirdDiscountPercent,
      earlyBirdRounding: rounding,
    },
    choices: buildChoices(groups, categories, ed.earlyBirdDiscountPercent, rounding),
  }
}

/**
 * Where intake stands now, for pages that only want to know whether to link to the
 * submissions page (the home teaser). Null when the database cannot be read or has
 * no edition: those callers keep their static copy rather than fail a build.
 */
export async function getIntakePhase(): Promise<IntakePhase | null> {
  try {
    const catalog = await getPublicCatalog()
    return catalog ? intakePhase(catalog.edition, new Date()) : null
  } catch (error) {
    console.error('awards: could not read the intake dates', error)
    return null
  }
}
