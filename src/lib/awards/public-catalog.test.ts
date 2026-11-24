import { describe, expect, it } from 'vitest'
import { CATEGORIES, CATEGORY_GROUPS, EDITION_2026 } from './categories'
import {
  buildChoices,
  intakePhase,
  lastDayBefore,
  type CategoryRow,
  type GroupRow,
} from './public-catalog'

const groups: GroupRow[] = CATEGORY_GROUPS.map((g) => ({
  id: `id-${g.slug}`,
  slug: g.slug,
  name: g.name,
  blurb: null,
  description: g.description,
  sortOrder: g.sortOrder,
}))
const rows: CategoryRow[] = CATEGORIES.map((c) => ({
  slug: c.slug,
  groupId: c.group ? `id-${c.group}` : null,
  name: c.name,
  blurb: c.blurb,
  description: c.description,
  tierLabel: c.tierLabel ?? null,
  price: c.price,
  sortOrder: c.sortOrder,
}))

describe('buildChoices', () => {
  const choices = buildChoices(groups, rows, 30, 'nearest-900')

  it('makes fifteen choices: fourteen categories and the group', () => {
    expect(choices).toHaveLength(15)
    expect(choices.filter((c) => c.kind === 'group')).toHaveLength(1)
  })

  it('puts the group first with its four tiers in order', () => {
    const group = choices[0]
    expect(group.kind).toBe('group')
    if (group.kind !== 'group') return
    expect(group.tiers.map((t) => t.slug)).toEqual([
      'company-website-startup',
      'company-website-small',
      'company-website-medium',
      'company-website-large',
    ])
  })

  it('computes the early-bird price from the percentage', () => {
    const marketing = choices.find((c) => c.slug === 'marketing-website')
    expect(marketing).toMatchObject({ price: 26900, earlyPrice: 18900 })
    const group = choices[0]
    if (group.kind !== 'group') throw new Error('expected the group')
    expect(group.tiers[0]).toMatchObject({ price: 9900, earlyPrice: 6900 })
  })

  it('leaves the price alone with no discount', () => {
    const none = buildChoices(groups, rows, 0, 'nearest-900')
    expect(none.find((c) => c.slug === 'marketing-website')).toMatchObject({
      price: 26900,
      earlyPrice: 26900,
    })
  })

  it('drops a group with no tiers', () => {
    expect(buildChoices(groups, rows.filter((r) => r.groupId === null), 30, 'nearest-900')).toHaveLength(14)
  })
})

describe('intakePhase', () => {
  it('opens at the stored instant, inclusive', () => {
    expect(intakePhase(EDITION_2026, '2026-11-30T23:59:59.999Z')).toBe('before')
    expect(intakePhase(EDITION_2026, '2026-12-01T00:00:00Z')).toBe('open')
  })

  it('closes at the stored instant, exclusive', () => {
    expect(intakePhase(EDITION_2026, '2027-02-01T23:59:59.999Z')).toBe('open')
    expect(intakePhase(EDITION_2026, '2027-02-02T00:00:00Z')).toBe('closed')
  })
})

describe('lastDayBefore', () => {
  it('turns an exclusive bound into its last day', () => {
    expect(lastDayBefore(EDITION_2026.earlyBirdEndsBefore).slice(0, 10)).toBe('2027-01-04')
    expect(lastDayBefore(EDITION_2026.intakeClosesBefore).slice(0, 10)).toBe('2027-02-01')
  })
})
