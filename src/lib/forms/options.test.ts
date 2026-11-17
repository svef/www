import { describe, expect, it } from 'vitest'
import { FEEDBACK_SUBJECTS, TALK_TOPICS, isFeedbackSubject, isTalkTopic } from './options'

describe('form option guards', () => {
  it('accept every value the collections accept', () => {
    for (const s of FEEDBACK_SUBJECTS) expect(isFeedbackSubject(s)).toBe(true)
    for (const t of TALK_TOPICS) expect(isTalkTopic(t)).toBe(true)
  })

  it('reject anything else, including non-strings and the other form’s values', () => {
    expect(isFeedbackSubject('nope')).toBe(false)
    expect(isFeedbackSubject(undefined)).toBe(false)
    expect(isFeedbackSubject(null)).toBe(false)
    expect(isTalkTopic(42)).toBe(false)
    expect(isTalkTopic('')).toBe(false)
  })
})
