import { earlyBirdPrice, type EarlyBirdRounding } from './pricing'
import { toMs, type DateInput, type Localized } from './types'

/**
 * What the public submissions page needs from the awards database, shaped for
 * display. Pure: the database read is in `public-catalog.server.ts`, so this
 * can be tested without one.
 */

/** The edition's dates and early-bird settings, as ISO strings (UTC). */
export type PublicEdition = {
  year: number
  intakeOpensAt: string
  earlyBirdEndsBefore: string
  intakeClosesBefore: string
  earlyBirdDiscountPercent: number
  earlyBirdRounding: EarlyBirdRounding
}

export type PublicCategory = {
  slug: string
  name: Localized
  blurb: Localized | null
  /** Markdown, per language. Null when the category has no longer text. */
  description: Localized | null
  tierLabel: Localized | null
  /** Regular price, whole ISK. */
  price: number
  /** Early-bird price, computed from the edition's percentage. */
  earlyPrice: number
}

export type PublicChoice =
  | ({ kind: 'category' } & PublicCategory)
  | {
      kind: 'group'
      slug: string
      name: Localized
      blurb: Localized | null
      description: Localized | null
      /** The size tiers: the entrant picks one. */
      tiers: PublicCategory[]
    }

export type CategoryRow = {
  slug: string
  groupId: string | null
  name: Localized
  blurb: Localized | null
  description: Localized | null
  tierLabel: Localized | null
  price: number
  sortOrder: number
}

export type GroupRow = {
  id: string
  slug: string
  name: Localized
  blurb: Localized | null
  description: Localized | null
  sortOrder: number
}

/**
 * The choices an entrant sees: every ungrouped category, and one entry per
 * group holding its tiers. Ordered by the database's `sort_order` (a group
 * takes the lowest order among its tiers, or its own if lower).
 */
export function buildChoices(
  groups: readonly GroupRow[],
  categories: readonly CategoryRow[],
  discountPercent: number,
  rounding: EarlyBirdRounding,
): PublicChoice[] {
  const toPublic = (c: CategoryRow): PublicCategory => ({
    slug: c.slug,
    name: c.name,
    blurb: c.blurb,
    description: c.description,
    tierLabel: c.tierLabel,
    price: c.price,
    earlyPrice: earlyBirdPrice(c.price, discountPercent, rounding),
  })
  const bySort = (a: CategoryRow, b: CategoryRow) =>
    a.sortOrder - b.sortOrder || a.slug.localeCompare(b.slug)

  const ranked: { order: number; choice: PublicChoice }[] = []
  for (const c of categories.filter((c) => c.groupId === null)) {
    ranked.push({ order: c.sortOrder, choice: { kind: 'category', ...toPublic(c) } })
  }
  for (const g of groups) {
    const tiers = categories.filter((c) => c.groupId === g.id).sort(bySort)
    if (tiers.length === 0) continue
    ranked.push({
      order: Math.min(g.sortOrder, ...tiers.map((t) => t.sortOrder)),
      choice: {
        kind: 'group',
        slug: g.slug,
        name: g.name,
        blurb: g.blurb,
        description: g.description,
        tiers: tiers.map(toPublic),
      },
    })
  }
  return ranked.sort((a, b) => a.order - b.order).map((r) => r.choice)
}

export type IntakePhase = 'before' | 'open' | 'closed'

/** Where intake stands at `now` (the server clock): opens inclusive, closes exclusive. */
export function intakePhase(
  edition: Pick<PublicEdition, 'intakeOpensAt' | 'intakeClosesBefore'>,
  now: DateInput,
): IntakePhase {
  const t = toMs(now)
  if (t < toMs(edition.intakeOpensAt)) return 'before'
  if (t >= toMs(edition.intakeClosesBefore)) return 'closed'
  return 'open'
}

/**
 * The last calendar day on which an exclusive bound still allows an action, as an ISO instant:
 * `early_bird_ends_before` 5 Jan 00:00Z means "until 4 Jan".
 */
export function lastDayBefore(bound: DateInput): string {
  return new Date(toMs(bound) - 1).toISOString()
}

/**
 * The ceremony is not on the edition row (the database has no column for it), so it is held
 * here. 19 March 2027, the 2026 edition's ceremony.
 */
export const CEREMONY_DATE_2026 = '2027-03-19T00:00:00Z'
