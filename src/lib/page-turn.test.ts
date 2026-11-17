import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  PAGE_TURN_MS,
  PAGE_TURN_RISE_HOLD_MS,
  PAGE_TURN_SWAP,
  RESTING_PATH,
  pageTurnHold,
  readPageTurnEnv,
  stepPath,
} from './page-turn'
import { createRng } from './shape/random'

describe('pageTurnHold', () => {
  it('holds arriving content while a page turn is running', () => {
    expect(pageTurnHold({ active: true, reduced: false })).toBe(PAGE_TURN_RISE_HOLD_MS)
  })

  it('does not hold when no transition is running (first load, unsupported browser, not animated)', () => {
    expect(pageTurnHold({ active: false, reduced: false })).toBe(0)
  })

  it('never holds under reduced motion, even if a transition somehow ran', () => {
    expect(pageTurnHold({ active: true, reduced: true })).toBe(0)
    expect(pageTurnHold({ active: false, reduced: true })).toBe(0)
  })

  it('releases content before the sweep is over, so it rises as the block leaves', () => {
    expect(PAGE_TURN_RISE_HOLD_MS).toBeGreaterThan(PAGE_TURN_SWAP * PAGE_TURN_MS)
    expect(PAGE_TURN_RISE_HOLD_MS).toBeLessThan(PAGE_TURN_MS)
  })
})

describe('readPageTurnEnv', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  function stubMedia(reduced: boolean) {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: reduced && query.includes('reduce'),
    }))
  }

  it('reads reduced motion', () => {
    stubMedia(true)
    expect(readPageTurnEnv().reduced).toBe(true)
    stubMedia(false)
    expect(readPageTurnEnv().reduced).toBe(false)
  })

  it('sees a running view transition via document.activeViewTransition', () => {
    stubMedia(false)
    expect(readPageTurnEnv().active).toBe(false)
    Object.defineProperty(document, 'activeViewTransition', {
      value: {},
      configurable: true,
    })
    expect(readPageTurnEnv().active).toBe(true)
    delete (document as unknown as Record<string, unknown>).activeViewTransition
  })

  it('treats an engine without the pseudo-class as no transition, without throwing', () => {
    stubMedia(false)
    vi.spyOn(document.documentElement, 'matches').mockImplementation(() => {
      throw new SyntaxError('not a valid selector')
    })
    expect(readPageTurnEnv()).toEqual({ active: false, reduced: false })
  })
})

describe('stepPath', () => {
  it('is a 12-point polygon within the box', () => {
    const path = stepPath(createRng(7))
    const points = path.match(/^polygon\((.*)\)$/)![1]!.split(',')
    expect(points).toHaveLength(12)
    for (const n of path.match(/-?\d+(\.\d+)?(?=%)/g)!.map(Number)) {
      expect(n).toBeGreaterThanOrEqual(0)
      expect(n).toBeLessThanOrEqual(100)
    }
  })

  it('is the same for the same draws and differs between draws', () => {
    expect(stepPath(createRng(3))).toBe(stepPath(createRng(3)))
    expect(stepPath(createRng(3))).not.toBe(stepPath(createRng(4)))
  })

  it('has a resting outline of the same shape for server rendering', () => {
    expect(RESTING_PATH.match(/,/g)).toHaveLength(11)
  })
})
