import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { _scrollSubscriberCount } from './scroll-bus'
import { SPRING_PUSH, _springState, registerSpring, springTarget } from './sticker-spring'
import { registerParallax } from './parallax'

function mockMedia(reduce: boolean, fine: boolean) {
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

const box = { left: 100, top: 100, width: 100, height: 100 } // centre 150,150

function sticker(rect = box) {
  const el = document.createElement('div')
  el.getBoundingClientRect = () => ({ ...rect, right: rect.left + rect.width, bottom: rect.top + rect.height }) as DOMRect
  Object.defineProperty(el, 'offsetParent', { get: () => document.body })
  document.body.append(el)
  return el
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
})
afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('springTarget', () => {
  it('pushes away from a close pointer, harder the closer it is', () => {
    const near = springTarget(box, { x: 0, y: 0 }, { x: 140, y: 150 })
    const far = springTarget(box, { x: 0, y: 0 }, { x: 60, y: 150 })
    expect(near.x).toBeGreaterThan(0)
    expect(near.r).toBeGreaterThan(0)
    expect(far.x).toBeGreaterThan(0)
    expect(near.x).toBeGreaterThan(far.x)
    expect(near.x).toBeLessThanOrEqual(SPRING_PUSH)
  })

  it('pushes left (and tilts the other way) from a pointer on the right', () => {
    const t = springTarget(box, { x: 0, y: 0 }, { x: 160, y: 150 })
    expect(t.x).toBeLessThan(0)
    expect(t.r).toBeLessThan(0)
  })

  it('leaves a sticker alone when the pointer is out of reach', () => {
    expect(springTarget(box, { x: 0, y: 0 }, { x: 900, y: 900 })).toEqual({ x: 0, y: 0, r: 0 })
  })

  it('measures from the rest position, not from where the spring has moved it', () => {
    const moved = { ...box, left: box.left + 10 }
    expect(springTarget(moved, { x: 10, y: 0 }, { x: 140, y: 150 })).toEqual(
      springTarget(box, { x: 0, y: 0 }, { x: 140, y: 150 }),
    )
  })
})

describe('registerSpring', () => {
  it('does nothing on a coarse pointer', () => {
    mockMedia(false, false)
    const add = vi.spyOn(window, 'addEventListener')
    const off = registerSpring(sticker())
    expect(_springState().count).toBe(0)
    expect(add.mock.calls.filter(([t]) => t === 'pointermove')).toHaveLength(0)
    off()
    add.mockRestore()
  })

  it('does nothing under reduced motion', () => {
    mockMedia(true, true)
    const add = vi.spyOn(window, 'addEventListener')
    const el = sticker()
    const off = registerSpring(el)
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 150, clientY: 150 }))
    flush()
    expect(_springState().count).toBe(0)
    expect(add.mock.calls.filter(([t]) => t === 'pointermove')).toHaveLength(0)
    expect(el.style.getPropertyValue('--rx')).toBe('')
    off()
    add.mockRestore()
  })

  it('shares one set of listeners and one loop, and idles when nothing moves', () => {
    mockMedia(false, true)
    const add = vi.spyOn(window, 'addEventListener')
    const els = Array.from({ length: 10 }, () => sticker())
    const offs = els.map((el) => registerSpring(el))
    expect(add.mock.calls.filter(([t]) => t === 'pointermove')).toHaveLength(1)
    expect(_springState()).toEqual({ count: 10, running: false })

    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 140, clientY: 150 }))
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 141, clientY: 150 }))
    expect(frames).toHaveLength(1) // one loop, however many events and stickers
    flush()
    expect(Number.parseFloat(els[0].style.getPropertyValue('--rx'))).toBeGreaterThan(0)

    // The pointer leaves: they spring back, then the loop idles.
    document.dispatchEvent(new Event('pointerleave'))
    for (let i = 0; i < 400 && frames.length; i++) flush()
    expect(frames).toHaveLength(0)
    expect(_springState().running).toBe(false)
    expect(Math.abs(Number.parseFloat(els[0].style.getPropertyValue('--rx')))).toBeLessThan(0.1)

    offs.forEach((off) => off())
    expect(_springState().count).toBe(0)
    add.mockRestore()
  })

  it('shares the one scroll listener with parallax', () => {
    mockMedia(false, true)
    const add = vi.spyOn(window, 'addEventListener')
    const a = sticker()
    const offSpring = registerSpring(a)
    const host = document.createElement('div')
    host.getBoundingClientRect = () => ({ top: 0, bottom: 10, height: 10 }) as DOMRect
    const b = document.createElement('div')
    host.append(b)
    const offPar = registerParallax(b, { speed: 0.2 })
    expect(add.mock.calls.filter(([t]) => t === 'scroll')).toHaveLength(1)
    expect(_scrollSubscriberCount()).toBe(2)
    offSpring()
    offPar()
    expect(_scrollSubscriberCount()).toBe(0)
    add.mockRestore()
  })
})
