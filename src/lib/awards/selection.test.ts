import { describe, expect, it } from 'vitest'
import { CATEGORIES } from './categories'
import {
  assertSelectionAllowed,
  blockedOptions,
  SelectionError,
  selectionViolations,
} from './selection'

describe('blockedOptions', () => {
  it('blocks nothing for an empty selection', () => {
    expect(blockedOptions([])).toEqual({})
  })

  it('blocks the other tiers of a select_one group, with a reason in both languages', () => {
    const blocked = blockedOptions(['company-website-small'])
    expect(Object.keys(blocked).sort()).toEqual([
      'company-website-large',
      'company-website-medium',
      'company-website-startup',
    ])
    expect(blocked['company-website-large']).toMatchObject({
      kind: 'group',
      because: 'company-website-small',
      group: 'company-website',
    })
    expect(blocked['company-website-large'].message.en).toContain(
      'Company Website: Small',
    )
    expect(blocked['company-website-large'].message.is).toContain(
      'Fyrirtækjavefur: lítil fyrirtæki',
    )
  })

  it('never blocks the selected option itself', () => {
    expect(
      blockedOptions(['company-website-small'])['company-website-small'],
    ).toBeUndefined()
  })

  it('blocks symmetric exclusions in both directions', () => {
    expect(blockedOptions(['student-project'])['passion-project']).toMatchObject({
      kind: 'exclusion',
      because: 'student-project',
    })
    expect(blockedOptions(['passion-project'])['student-project']).toMatchObject({
      kind: 'exclusion',
      because: 'passion-project',
    })
  })

  it('leaves unrelated categories open', () => {
    const blocked = blockedOptions(['app', 'student-project', 'company-website-large'])
    expect(blocked['ecommerce-website']).toBeUndefined()
    expect(blocked['marketing-website']).toBeUndefined()
    expect(blocked['app']).toBeUndefined()
  })

  it('combines group and exclusion reasons', () => {
    const blocked = blockedOptions(['company-website-startup', 'passion-project'])
    expect(blocked['company-website-large'].kind).toBe('group')
    expect(blocked['student-project'].kind).toBe('exclusion')
  })

  it('works with custom rules (a non select_one group allows several)', () => {
    const rules = {
      categories: CATEGORIES,
      groups: [
        {
          slug: 'company-website',
          sortOrder: 1,
          selectOne: false,
          name: { is: 'x', en: 'x' },
          description: null,
        },
      ],
      exclusions: [],
    }
    expect(blockedOptions(['company-website-small'], rules)).toEqual({})
  })
})

describe('selectionViolations / assertSelectionAllowed', () => {
  it('accepts valid selections, including any number outside the rules', () => {
    expect(selectionViolations([])).toEqual([])
    expect(
      selectionViolations([
        'company-website-medium',
        'app',
        'ai-solution',
        'student-project',
      ]),
    ).toEqual([])
    expect(() => assertSelectionAllowed(['app', 'passion-project'])).not.toThrow()
  })

  it('reports two tiers of the same group', () => {
    const v = selectionViolations(['company-website-small', 'company-website-large'])
    expect(v).toHaveLength(1)
    expect(v[0]).toMatchObject({
      kind: 'group',
      categories: ['company-website-small', 'company-website-large'],
    })
  })

  it('reports exclusion pairs', () => {
    expect(selectionViolations(['passion-project', 'student-project'])[0]).toMatchObject({
      kind: 'exclusion',
    })
  })

  it('reports unknown categories and duplicates', () => {
    expect(selectionViolations(['nope'])).toEqual([
      { kind: 'unknown_category', category: 'nope' },
    ])
    expect(selectionViolations(['app', 'app'])).toEqual([
      { kind: 'duplicate', category: 'app' },
    ])
  })

  it('throws a SelectionError carrying the violations', () => {
    try {
      assertSelectionAllowed([
        'student-project',
        'passion-project',
        'company-website-small',
        'company-website-large',
      ])
      expect.unreachable()
    } catch (e) {
      expect(e).toBeInstanceOf(SelectionError)
      expect((e as SelectionError).violations).toHaveLength(2)
    }
  })

  it('every category in the JSON can be selected alone', () => {
    for (const c of CATEGORIES) expect(selectionViolations([c.slug])).toEqual([])
  })
})
