import { getCategory } from '@/lib/awards/categories'
import { getField } from '@/lib/awards/fields'
import { earlyBirdPrice, type EarlyBirdRounding } from '@/lib/awards/pricing'
import { toMs, type Localized } from '@/lib/awards/types'
import type { EntryView, ProjectView } from '@/lib/awards/projects/types'
import type { SectionId } from './copy'
import { fieldErrorsByKey, sectionOfField, SUBMIT_STEP_FIELDS } from './sections'

/**
 * What the categories section and the review show from the current state: the price
 * of each entry and the total, and the list of what is still missing. Pure, so the
 * numbers and the list can be tested without a browser; the clock is the server's
 * (`serverNow` on the project view), never the browser's.
 */

type EarlyBird = ProjectView['earlyBird']

export type PriceLine = {
  slug: string
  regular: number
  /** What the category costs if submitted before the early-bird deadline. */
  early: number
  /** Set once the entry is submitted: the price is locked and does not move. */
  locked: number | null
}

export type PriceBreakdown = {
  lines: PriceLine[]
  /** Everything at the regular price (locked entries at their locked price). */
  totalRegular: number
  /** Everything at the early-bird price (locked entries at their locked price). */
  totalEarly: number
  /** Early bird is still open at `now`. */
  earlyAvailable: boolean
  /** What a submit right now would lock in. */
  totalNow: number
}

export function priceBreakdown(
  categories: readonly string[],
  entries: readonly Pick<EntryView, 'category' | 'price'>[],
  earlyBird: Pick<EarlyBird, 'endsBefore' | 'discountPercent'> & {
    rounding?: EarlyBirdRounding
  },
  now: string,
): PriceBreakdown {
  const lines: PriceLine[] = []
  for (const slug of categories) {
    const category = getCategory(slug)
    if (!category) continue
    const locked = entries.find((e) => e.category === slug)?.price?.amount ?? null
    lines.push({
      slug,
      regular: category.price,
      early: earlyBirdPrice(category.price, earlyBird.discountPercent, earlyBird.rounding),
      locked,
    })
  }
  const earlyAvailable = toMs(now) < toMs(earlyBird.endsBefore)
  const sum = (pick: (l: PriceLine) => number) =>
    lines.reduce((total, l) => total + (l.locked ?? pick(l)), 0)
  const totalRegular = sum((l) => l.regular)
  const totalEarly = sum((l) => l.early)
  return {
    lines,
    totalRegular,
    totalEarly,
    earlyAvailable,
    totalNow: earlyAvailable ? totalEarly : totalRegular,
  }
}

export type MissingItem = {
  /** A field key, or `categories` / `billing`. Unique per list. */
  key: string
  section: SectionId
  /** The field to land on; undefined for a whole section. */
  fieldKey?: string
  message: Localized
}

/**
 * What stops the project from being submitted, in form order, each with where to fix it.
 * The terms checkbox is the submit step's own and is not listed. A field with several
 * problems is listed once, with the first.
 */
export function missingItems(
  categories: readonly string[],
  answers: Readonly<Record<string, unknown>>,
  billingProfileId: string | null,
): MissingItem[] {
  const items: MissingItem[] = []
  if (categories.length === 0)
    items.push({
      key: 'categories',
      section: 'categories',
      message: {
        is: 'Veldu að minnsta kosti einn flokk.',
        en: 'Choose at least one category.',
      },
    })
  if (categories.length > 0) {
    const errors = fieldErrorsByKey(categories, answers)
    const order = ['categories', 'project', 'questions', 'people', 'image', 'billing', 'review']
    const keys = Object.keys(errors)
      .filter((k) => !SUBMIT_STEP_FIELDS.has(k))
      .sort(
        (a, b) => order.indexOf(sectionOfField(a) ?? '') - order.indexOf(sectionOfField(b) ?? ''),
      )
    for (const key of keys) {
      const field = getField(key)
      const section = sectionOfField(key)
      if (!section) continue
      const first = errors[key][0].message
      items.push({
        key,
        section,
        fieldKey: key,
        message: {
          is: `${field.label.is}: ${first.is}`,
          en: `${field.label.en}: ${first.en}`,
        },
      })
    }
  }
  if (!billingProfileId)
    items.push({
      key: 'billing',
      section: 'billing',
      message: {
        is: 'Veldu greiðanda reiknings.',
        en: 'Choose who is invoiced.',
      },
    })
  return items
}
