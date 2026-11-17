import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FONT_WAIT_MS, resetPageReady, whenPageReady } from './page-ready'

describe('whenPageReady', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    resetPageReady()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    Reflect.deleteProperty(document, 'fonts')
  })

  it('resolves when the fonts have settled', async () => {
    Object.defineProperty(document, 'fonts', { configurable: true, value: { ready: Promise.resolve() } })
    await expect(whenPageReady()).resolves.toBeUndefined()
  })

  it('does not wait longer than the timeout for fonts that never settle', async () => {
    Object.defineProperty(document, 'fonts', { configurable: true, value: { ready: new Promise(() => {}) } })
    let done = false
    void whenPageReady().then(() => (done = true))
    await vi.advanceTimersByTimeAsync(FONT_WAIT_MS - 1)
    expect(done).toBe(false)
    await vi.advanceTimersByTimeAsync(2)
    expect(done).toBe(true)
  })

  it('shares one wait between callers until reset', () => {
    expect(whenPageReady()).toBe(whenPageReady())
    const first = whenPageReady()
    resetPageReady()
    expect(whenPageReady()).not.toBe(first)
  })
})
