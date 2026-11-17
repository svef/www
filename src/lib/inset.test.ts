import { describe, expect, it } from 'vitest'
import {
  easeInset,
  INSET_DESKTOP,
  INSET_PHONE,
  INSET_RANGE,
  insetMax,
  insetTarget,
} from './inset'

describe('insetMax', () => {
  it('is 24px, and 12px on phones', () => {
    expect(insetMax(1440)).toBe(INSET_DESKTOP)
    expect(insetMax(700)).toBe(INSET_DESKTOP)
    expect(insetMax(699)).toBe(INSET_PHONE)
    expect(insetMax(390)).toBe(12)
  })
})

describe('insetTarget', () => {
  const vh = 800
  it('starts at 0, at the scroll position where the element first sits (top at 75% of the viewport)', () => {
    const docTop = 2000
    const start = docTop - vh * 0.75
    expect(insetTarget(0, docTop, vh, 24)).toBe(0)
    expect(insetTarget(start, docTop, vh, 24)).toBe(0)
    expect(insetTarget(start + INSET_RANGE / 2, docTop, vh, 24)).toBe(12)
    expect(insetTarget(start + INSET_RANGE, docTop, vh, 24)).toBe(24)
    expect(insetTarget(start + 10 * INSET_RANGE, docTop, vh, 24)).toBe(24)
  })

  it('grows with the scroll from the top for elements already in the first screen', () => {
    expect(insetTarget(0, 100, vh, 24)).toBe(0)
    expect(insetTarget(160, 100, vh, 24)).toBe(12)
  })
})

describe('easeInset', () => {
  it('covers 7% of the way each frame, so it glides', () => {
    expect(easeInset(0, 24)).toEqual({ value: 24 * 0.07, moving: true })
  })

  it('settles exactly on the target and then stops asking for frames', () => {
    let v = 0
    let frames = 0
    for (let moving = true; moving && frames < 1000; frames++) {
      const step = easeInset(v, 24)
      v = step.value
      moving = step.moving
    }
    expect(v).toBe(24)
    expect(frames).toBeLessThan(150)
    expect(easeInset(24, 24)).toEqual({ value: 24, moving: false })
  })

  it('eases back out too', () => {
    const step = easeInset(24, 0)
    expect(step.value).toBeLessThan(24)
    expect(step.value).toBeGreaterThan(0)
  })
})
