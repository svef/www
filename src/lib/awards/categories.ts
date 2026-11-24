import categoriesJson from './data/categories-2026.json'
import type { Edition, Localized } from './types'

export type CategoryGroup = {
  slug: string
  sortOrder: number
  selectOne: boolean
  name: Localized
  description: Localized | null
}

export type Category = {
  slug: string
  group: string | null
  sortOrder: number
  name: Localized
  blurb: Localized | null
  description: Localized | null
  /** Regular price, whole ISK. */
  price: number
  tierLabel?: Localized
}

type Data = {
  edition: Edition
  groups: CategoryGroup[]
  categories: Category[]
  exclusions: [string, string][]
}

const data = categoriesJson as unknown as Data

export const EDITION_2026: Edition = data.edition
export const CATEGORY_GROUPS: readonly CategoryGroup[] = data.groups
export const CATEGORIES: readonly Category[] = data.categories
/** Symmetric pairs: a project can't be in both. */
export const CATEGORY_EXCLUSIONS: readonly (readonly [string, string])[] = data.exclusions

export function getCategory(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug)
}
