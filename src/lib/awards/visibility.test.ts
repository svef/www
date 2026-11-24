import { describe, expect, it } from 'vitest'
import { FIELD_DEFINITIONS, getField } from './fields'
import { evaluateWhen, forcedValue, isFieldVisible, resolveAnswers } from './visibility'

const visibleKeys = (categories: string[], answers: Record<string, unknown> = {}) =>
  resolveAnswers(FIELD_DEFINITIONS, categories, answers).visible.map((f) => f.key)

describe('evaluateWhen', () => {
  it('has no rule = visible', () => {
    expect(evaluateWhen(undefined, { categories: [], answers: {} })).toBe(true)
  })

  it('categories.any', () => {
    const rule = { categories: { any: ['app', 'ai-solution'] } }
    expect(evaluateWhen(rule, { categories: ['app'], answers: {} })).toBe(true)
    expect(evaluateWhen(rule, { categories: ['x', 'ai-solution'], answers: {} })).toBe(
      true,
    )
    expect(evaluateWhen(rule, { categories: ['x'], answers: {} })).toBe(false)
    expect(evaluateWhen(rule, { categories: [], answers: {} })).toBe(false)
  })

  it('categories.anyExcept: any category other than the listed ones', () => {
    const rule = { categories: { anyExcept: ['app'] } }
    expect(evaluateWhen(rule, { categories: ['app'], answers: {} })).toBe(false)
    expect(
      evaluateWhen(rule, { categories: ['app', 'ecommerce-website'], answers: {} }),
    ).toBe(true)
    expect(evaluateWhen(rule, { categories: ['ecommerce-website'], answers: {} })).toBe(
      true,
    )
    expect(evaluateWhen(rule, { categories: [], answers: {} })).toBe(false)
  })

  it('field.equals', () => {
    const rule = { field: { key: 'requiresLogin', equals: true } }
    expect(evaluateWhen(rule, { categories: [], answers: { requiresLogin: true } })).toBe(
      true,
    )
    expect(
      evaluateWhen(rule, { categories: [], answers: { requiresLogin: false } }),
    ).toBe(false)
    expect(evaluateWhen(rule, { categories: [], answers: {} })).toBe(false)
    expect(
      evaluateWhen(rule, { categories: [], answers: { requiresLogin: 'true' } }),
    ).toBe(false)
  })
})

describe('field visibility per category', () => {
  it('links vs appLinks', () => {
    expect(visibleKeys(['ecommerce-website'])).toContain('links')
    expect(visibleKeys(['ecommerce-website'])).not.toContain('appLinks')
    expect(visibleKeys(['app'])).toContain('appLinks')
    expect(visibleKeys(['app'])).not.toContain('links')
    const both = visibleKeys(['app', 'ecommerce-website'])
    expect(both).toContain('links')
    expect(both).toContain('appLinks')
  })

  it('category-specific questions', () => {
    expect(visibleKeys(['technical-achievement'])).toContain('technicalAchievement')
    expect(visibleKeys(['ai-solution'])).toContain('aiRole')
    expect(visibleKeys(['student-project'])).toEqual(
      expect.arrayContaining(['school', 'programme']),
    )
    expect(visibleKeys(['marketing-website'])).toEqual(
      expect.arrayContaining(['campaignPeriod', 'campaignArchive']),
    )
    const none = visibleKeys(['ecommerce-website'])
    for (const k of [
      'technicalAchievement',
      'aiRole',
      'school',
      'programme',
      'campaignPeriod',
      'campaignArchive',
    ]) {
      expect(none).not.toContain(k)
    }
  })

  it('loginInformation follows requiresLogin', () => {
    expect(visibleKeys(['app'], { requiresLogin: false })).not.toContain(
      'loginInformation',
    )
    expect(visibleKeys(['app'], { requiresLogin: true })).toContain('loginInformation')
    expect(visibleKeys(['app'])).not.toContain('loginInformation') // default false
  })

  it('logged-in-platform forces requiresLogin, which shows loginInformation', () => {
    expect(visibleKeys(['logged-in-platform'])).toContain('loginInformation')
    expect(visibleKeys(['logged-in-platform'], { requiresLogin: false })).toContain(
      'loginInformation',
    )
  })

  it('isFieldVisible matches', () => {
    expect(
      isFieldVisible(getField('school'), {
        categories: ['student-project'],
        answers: {},
      }),
    ).toBe(true)
  })
})

describe('forced / resolveAnswers', () => {
  it('forces requiresLogin only for logged-in-platform', () => {
    const f = getField('requiresLogin')
    expect(
      forcedValue(f, { categories: ['logged-in-platform', 'app'], answers: {} }),
    ).toEqual({ forced: true, value: true })
    expect(forcedValue(f, { categories: ['app'], answers: {} })).toEqual({
      forced: false,
    })
    expect(
      forcedValue(getField('title'), { categories: ['logged-in-platform'], answers: {} }),
    ).toEqual({ forced: false })
  })

  it('applies defaults and forced values, drops hidden answers', () => {
    expect(
      resolveAnswers(FIELD_DEFINITIONS, ['app'], { school: 'x', title: 'T' }).answers,
    ).toEqual({
      title: 'T',
      requiresLogin: false,
    })
    expect(
      resolveAnswers(FIELD_DEFINITIONS, ['logged-in-platform'], { requiresLogin: false })
        .answers.requiresLogin,
    ).toBe(true)
  })

  it('a hidden dependency counts as unset', () => {
    // loginInformation depends on requiresLogin, which is always visible; a field depending on a hidden one stays hidden
    const fields = [
      { ...getField('school') },
      {
        ...getField('title'),
        key: 'dep',
        when: { field: { key: 'school', equals: 'x' } },
      },
    ]
    expect(resolveAnswers(fields, ['app'], { school: 'x', dep: 'y' }).visible).toEqual([])
    expect(
      resolveAnswers(fields, ['student-project'], { school: 'x', dep: 'y' }).visible.map(
        (f) => f.key,
      ),
    ).toEqual(['school', 'dep'])
  })
})
