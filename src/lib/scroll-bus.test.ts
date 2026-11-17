import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { _scrollSubscriberCount, requestScrollFrame, subscribeScroll } from './scroll-bus'

let frames: FrameRequestCallback[] = []

beforeEach(() => {
  frames = []
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb))
  vi.stubGlobal('cancelAnimationFrame', () => {
    frames = []
  })
})
afterEach(() => vi.unstubAllGlobals())

const flush = () => {
  const run = frames
  frames = []
  run.forEach((cb) => cb(0))
}

describe('scroll bus', () => {
  it('runs subscribers once per frame, however many events arrive', () => {
    const fn = vi.fn()
    const off = subscribeScroll(fn)
    window.dispatchEvent(new Event('scroll'))
    window.dispatchEvent(new Event('scroll'))
    window.dispatchEvent(new Event('resize'))
    expect(fn).not.toHaveBeenCalled() // never in the handler itself
    flush()
    expect(fn).toHaveBeenCalledTimes(1)
    off()
  })

  it('asks for nothing while nobody is listening', () => {
    requestScrollFrame()
    expect(frames).toHaveLength(0)
  })

  it('stops running a subscriber once it unsubscribes, and detaches with the last one', () => {
    const remove = vi.spyOn(window, 'removeEventListener')
    const a = vi.fn()
    const b = vi.fn()
    const offA = subscribeScroll(a)
    const offB = subscribeScroll(b)
    expect(_scrollSubscriberCount()).toBe(2)
    offA()
    window.dispatchEvent(new Event('scroll'))
    flush()
    expect(a).not.toHaveBeenCalled()
    expect(b).toHaveBeenCalledTimes(1)
    expect(remove).not.toHaveBeenCalled()
    offB()
    expect(_scrollSubscriberCount()).toBe(0)
    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function))
    expect(remove).toHaveBeenCalledWith('resize', expect.any(Function))
    remove.mockRestore()
  })

  it('does not run a pending frame after the last subscriber has gone', () => {
    const fn = vi.fn()
    const off = subscribeScroll(fn)
    window.dispatchEvent(new Event('scroll'))
    off()
    flush()
    expect(fn).not.toHaveBeenCalled()
  })
})
