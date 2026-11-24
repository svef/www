import { describe, expect, it } from 'vitest'
import { neighbours, parseStepHash, STEP_IDS, stepHash } from './steps'

describe('the step in the URL hash', () => {
  it('names a step by its section id', () => {
    expect(parseStepHash('#section-people')).toEqual({ step: 'people' })
    expect(parseStepHash(stepHash('review'))).toEqual({ step: 'review' })
  })

  it('opens the step a field lives in', () => {
    expect(parseStepHash('#field-title')).toEqual({ step: 'project', fieldKey: 'title' })
    expect(parseStepHash('#field-publicCredit')).toEqual({
      step: 'people',
      fieldKey: 'publicCredit',
    })
    expect(parseStepHash('#field-categoryPitch')).toEqual({
      step: 'questions',
      fieldKey: 'categoryPitch',
    })
    expect(parseStepHash('#field-billing')).toEqual({
      step: 'billing',
      fieldKey: 'billing',
    })
  })

  it('ignores what the form does not know', () => {
    expect(parseStepHash('')).toBeNull()
    expect(parseStepHash('#main')).toBeNull()
    expect(parseStepHash('#requests')).toBeNull()
    expect(parseStepHash('#section-nope')).toBeNull()
    expect(parseStepHash('#field-nope')).toBeNull()
  })
})

describe('neighbours', () => {
  it('has no step before the first or after the last', () => {
    expect(STEP_IDS).toHaveLength(7)
    expect(neighbours('categories')).toEqual({ prev: null, next: 'project' })
    expect(neighbours('image')).toEqual({ prev: 'people', next: 'billing' })
    expect(neighbours('review')).toEqual({ prev: 'billing', next: null })
  })
})
