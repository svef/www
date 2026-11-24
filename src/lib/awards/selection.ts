import {
  CATEGORIES,
  CATEGORY_EXCLUSIONS,
  CATEGORY_GROUPS,
  type Category,
  type CategoryGroup,
} from './categories'
import type { Localized } from './types'

export type SelectionRules = {
  categories: readonly Category[]
  groups: readonly CategoryGroup[]
  exclusions: readonly (readonly [string, string])[]
}

export const DEFAULT_RULES: SelectionRules = {
  categories: CATEGORIES,
  groups: CATEGORY_GROUPS,
  exclusions: CATEGORY_EXCLUSIONS,
}

export type BlockReason = {
  kind: 'group' | 'exclusion'
  /** The currently selected category that causes the block. */
  because: string
  group?: string
  message: Localized
}

export type SelectionViolation =
  | { kind: 'unknown_category'; category: string }
  | { kind: 'duplicate'; category: string }
  | { kind: 'group' | 'exclusion'; categories: [string, string]; message: Localized }

function nameOf(rules: SelectionRules, slug: string): Localized {
  return rules.categories.find((c) => c.slug === slug)?.name ?? { is: slug, en: slug }
}

function groupOf(rules: SelectionRules, slug: string): CategoryGroup | undefined {
  const g = rules.categories.find((c) => c.slug === slug)?.group
  return g ? rules.groups.find((x) => x.slug === g) : undefined
}

function reasonFor(
  rules: SelectionRules,
  candidate: string,
  selected: string,
): BlockReason | null {
  const group = groupOf(rules, candidate)
  if (group?.selectOne && groupOf(rules, selected)?.slug === group.slug) {
    const a = nameOf(rules, selected)
    return {
      kind: 'group',
      because: selected,
      group: group.slug,
      message: {
        is: `Aðeins einn flokkur í „${group.name.is}“ er leyfður. Þú hefur valið „${a.is}“.`,
        en: `Only one category in “${group.name.en}” is allowed. You have chosen “${a.en}”.`,
      },
    }
  }
  const excluded = rules.exclusions.some(
    ([x, y]) =>
      (x === candidate && y === selected) || (y === candidate && x === selected),
  )
  if (excluded) {
    const a = nameOf(rules, selected)
    return {
      kind: 'exclusion',
      because: selected,
      message: {
        is: `Ekki er hægt að senda inn í þessum flokki og „${a.is}“ saman.`,
        en: `This category can't be combined with “${a.en}”.`,
      },
    }
  }
  return null
}

/**
 * For a current selection (non-withdrawn entries' categories), which options are blocked and why,
 * for greying out. Selected options are never blocked (they can be deselected). If a selection is
 * itself invalid, the first conflicting selected category is reported.
 */
export function blockedOptions(
  selection: readonly string[],
  rules: SelectionRules = DEFAULT_RULES,
): Record<string, BlockReason> {
  const blocked: Record<string, BlockReason> = {}
  for (const category of rules.categories) {
    if (selection.includes(category.slug)) continue
    for (const selected of selection) {
      const reason = reasonFor(rules, category.slug, selected)
      if (reason) {
        blocked[category.slug] = reason
        break
      }
    }
  }
  return blocked
}

/** Every rule the selection breaks (empty array when valid). */
export function selectionViolations(
  selection: readonly string[],
  rules: SelectionRules = DEFAULT_RULES,
): SelectionViolation[] {
  const out: SelectionViolation[] = []
  const seen = new Set<string>()
  for (const slug of selection) {
    if (!rules.categories.some((c) => c.slug === slug))
      out.push({ kind: 'unknown_category', category: slug })
    else if (seen.has(slug)) out.push({ kind: 'duplicate', category: slug })
    seen.add(slug)
  }
  const unique = [...seen].filter((s) => rules.categories.some((c) => c.slug === s))
  for (let i = 0; i < unique.length; i++) {
    for (let j = i + 1; j < unique.length; j++) {
      const reason = reasonFor(rules, unique[j], unique[i])
      if (reason)
        out.push({
          kind: reason.kind,
          categories: [unique[i], unique[j]],
          message: reason.message,
        })
    }
  }
  return out
}

export class SelectionError extends Error {
  constructor(public readonly violations: SelectionViolation[]) {
    super(`Invalid category selection: ${violations.map((v) => v.kind).join(', ')}`)
    this.name = 'SelectionError'
  }
}

/** Server-side assertion: throws SelectionError when the selection breaks a rule. */
export function assertSelectionAllowed(
  selection: readonly string[],
  rules: SelectionRules = DEFAULT_RULES,
): void {
  const violations = selectionViolations(selection, rules)
  if (violations.length) throw new SelectionError(violations)
}
