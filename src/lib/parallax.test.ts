import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { _parallaxCount, parallaxDrift, parallaxOffset, registerParallax } from './parallax'
import { _scrollSubscriberCount } from './scroll-bus'

function mockMedia(reduce: boolean, fine = true) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('reduce') ? reduce : query.includes('fine') ? fine : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    dispatchEvent: vi.fn(),
  }))
}

/** A host (the element's parent) at a fixed rect, and the element inside it. */
function mount(top: number, height = 400) {
  const host = document.createElement('div')
  host.getBoundingClientRect = () =>
    ({ top, bottom: top + height, height, left: 0, right: 100, width: 100 }) as DOMRect
  const el = document.createElement('div')
  host.append(el)
  document.body.append(host)
  Object.defineProperty(el, 'offsetParent', { get: () => host, configurable: true })
  return { host, el }
}

let frames: FrameRequestCallback[] = []
const flush = () => {
  const run = frames
  frames = []
  run.forEach((cb) => cb(0))
}

beforeEach(() => {
  frames = []
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb))
  vi.stubGlobal('cancelAnimationFrame', () => {})
  Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })
  mockMedia(false)
})

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('the maths', () => {
  it('offsets by (host centre - viewport centre) * speed * 0.5', () => {
    // host centre 600, viewport centre 400 -> 200 * 0.15 * 0.5
    expect(parallaxOffset(400, 400, 800, 0.15)).toBeCloseTo(15)
    expect(parallaxOffset(400, 400, 800, -0.15)).toBeCloseTo(-15)
  })

  it('is zero when the host is centred', () => {
    expect(parallaxOffset(200, 400, 800, 0.5)).toBe(0)
  })

  it('drifts a photo up to 18px a viewport', () => {
    expect(parallaxDrift(0, 800, 800)).toBeCloseTo(0 + -((0 + 400 - 400) / 800) * 18)
    expect(parallaxDrift(800, 800, 800)).toBeCloseTo(-18)
    expect(parallaxDrift(-800, 800, 800)).toBeCloseTo(18)
  })
})

describe('registerParallax', () => {
  it('writes --py for an offset on the next frame', () => {
    const { el } = mount(400)
    const off = registerParallax(el, { speed: 0.15 })
    flush()
    expect(el.style.getPropertyValue('--py')).toBe('15.0px')
    off()
    expect(el.style.getPropertyValue('--py')).toBe('')
  })

  it('writes --drift for a photo', () => {
    const { el } = mount(400, 800)
    const off = registerParallax(el, { mode: 'drift' })
    flush()
    expect(el.style.getPropertyValue('--drift')).toBe('-9.0px')
    off()
  })

  it('skips elements far off screen', () => {
    const { el } = mount(5000)
    const off = registerParallax(el, { speed: 0.15 })
    flush()
    expect(el.style.getPropertyValue('--py')).toBe('')
    off()
  })

  it('skips an element that is not rendered', () => {
    const { el } = mount(400)
    Object.defineProperty(el, 'offsetParent', { get: () => null, configurable: true })
    const off = registerParallax(el, { speed: 0.15 })
    flush()
    expect(el.style.getPropertyValue('--py')).toBe('')
    off()
  })

  it('shares one passive scroll listener, however many elements', () => {
    const add = vi.spyOn(window, 'addEventListener')
    const remove = vi.spyOn(window, 'removeEventListener')
    const offs = Array.from({ length: 25 }, () => registerParallax(mount(400).el, { speed: 0.1 }))
    const scrolls = add.mock.calls.filter(([type]) => type === 'scroll')
    expect(scrolls).toHaveLength(1)
    expect(scrolls[0][2]).toEqual({ passive: true })
    expect(_scrollSubscriberCount()).toBe(1)
    expect(_parallaxCount()).toBe(25)
    offs.forEach((off) => off())
    expect(_parallaxCount()).toBe(0)
    expect(_scrollSubscriberCount()).toBe(0)
    expect(remove.mock.calls.filter(([type]) => type === 'scroll')).toHaveLength(1)
    add.mockRestore()
    remove.mockRestore()
  })

  it('coalesces scroll events into one frame', () => {
    const { el } = mount(400)
    const off = registerParallax(el, { speed: 0.15 })
    flush()
    window.dispatchEvent(new Event('scroll'))
    window.dispatchEvent(new Event('scroll'))
    window.dispatchEvent(new Event('scroll'))
    expect(frames).toHaveLength(1)
    off()
  })

  it('never cancels a scroll event or moves the scroll position', () => {
    const { el } = mount(400)
    const off = registerParallax(el, { speed: 0.15 })
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const e = new Event('scroll', { cancelable: true })
    window.dispatchEvent(e)
    flush()
    expect(e.defaultPrevented).toBe(false)
    expect(scrollTo).not.toHaveBeenCalled()
    off()
    scrollTo.mockRestore()
  })

  it('does nothing under reduced motion: no registration, no listener, no property', () => {
    mockMedia(true)
    const add = vi.spyOn(window, 'addEventListener')
    const { el } = mount(400)
    const off = registerParallax(el, { speed: 0.15 })
    flush()
    expect(_parallaxCount()).toBe(0)
    expect(add.mock.calls.filter(([type]) => type === 'scroll')).toHaveLength(0)
    expect(el.style.getPropertyValue('--py')).toBe('')
    off()
    add.mockRestore()
  })

  it('ignores a speed of 0', () => {
    const { el } = mount(400)
    const off = registerParallax(el, { speed: 0 })
    expect(_parallaxCount()).toBe(0)
    off()
  })
})
