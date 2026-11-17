import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { axe } from 'vitest-axe'
import { _insetCount } from '@/lib/inset'
import { restingPolygon } from '@/lib/stair/stairs'
import { STAIR_INTERVAL } from '@/lib/shape/motion'
import { _stairTimerCount } from '@/lib/shape/scheduler'
import { Shape } from '@/components/Shape/Shape'
import { Stair, StairText } from './Stair'

// jsdom does no layout: make every element count as rendered.
function fakeLayout() {
  const d = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetParent')
  Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
    configurable: true,
    get(this: HTMLElement) {
      return this.parentElement
    },
  })
  return () => d && Object.defineProperty(HTMLElement.prototype, 'offsetParent', d)
}

function setReducedMotion(reduce: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduce && query.includes('reduce'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    dispatchEvent: vi.fn(),
  }))
}

/** An IntersectionObserver the test fires by hand. */
// The scheduler creates its observers once per module, so they outlive a single test:
// `all` is deliberately never reset.
class FakeIO {
  static all: FakeIO[] = []
  targets = new Set<Element>()
  constructor(public cb: IntersectionObserverCallback) {
    FakeIO.all.push(this)
  }
  observe(t: Element) {
    this.targets.add(t)
  }
  unobserve(t: Element) {
    this.targets.delete(t)
  }
  disconnect() {
    this.targets.clear()
  }
  takeRecords() {
    return []
  }
  /** Fires on every observer that watches `target`. */
  static fire(target: Element, ratio: number) {
    FakeIO.all
      .filter((o) => o.targets.has(target))
      .forEach((o) =>
        o.cb(
          [
            {
              target,
              isIntersecting: ratio > 0,
              intersectionRatio: ratio,
              intersectionRect: { height: ratio * 300 } as DOMRectReadOnly,
              rootBounds: { height: 900 } as DOMRectReadOnly,
            } as IntersectionObserverEntry,
          ],
          o as unknown as IntersectionObserver,
        ),
      )
  }
}

const poly = (el: Element) => el.querySelector<HTMLElement>('[data-stair]')!

describe('Stair on the server', () => {
  it('renders the head, an aria-hidden polygon at rest and the children, with no pending state', () => {
    const html = renderToString(
      <Stair preset="yellow">
        <h2>Fréttir</h2>
      </Stair>,
    )
    expect(html).toContain('data-stair-head')
    expect(html).toContain('data-stair="yellow"')
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('clip-path:' + restingPolygon('yellow'))
    expect(html).not.toContain('data-stair-state')
    expect(html).toContain('Fréttir')
  })
})

describe('Stair in the browser', () => {
  const originalIO = globalThis.IntersectionObserver
  let restore: () => void

  beforeEach(() => {
    restore = fakeLayout()
    globalThis.IntersectionObserver = FakeIO as unknown as typeof IntersectionObserver
    vi.useFakeTimers()
  })
  afterEach(() => {
    restore()
    setReducedMotion(false)
    globalThis.IntersectionObserver = originalIO
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('holds its children until a quarter of the head is on screen, then rises', () => {
    const { container } = render(
      <Stair preset="pink" seed={1}>
        <StairText>
          <h2>Viðburðir</h2>
        </StairText>
      </Stair>,
    )
    const head = container.firstElementChild!
    expect(head.getAttribute('data-stair-state')).toBe('pending')
    expect(poly(head).style.clipPath).toBe(restingPolygon('pink'))

    act(() => FakeIO.fire(head, 0.1))
    expect(head.getAttribute('data-stair-state')).toBe('pending')
    act(() => FakeIO.fire(head, 0.25))
    expect(head.getAttribute('data-stair-state')).toBe('in')
  })

  it('also rises for a head too tall to ever be 25% visible, once a quarter of the screen is filled', () => {
    const { container } = render(<Stair preset="red" />)
    const head = container.firstElementChild!
    act(() => FakeIO.fire(head, 0.2)) // intersectionRect is 0.2 × 300 = 60px: not enough
    expect(head.getAttribute('data-stair-state')).toBe('pending')
    act(() => FakeIO.fire(head, 0.24))
    expect(head.getAttribute('data-stair-state')).toBe('pending')
    act(() => FakeIO.fire(head, 1)) // 300px of a 900px screen: more than a quarter
    expect(head.getAttribute('data-stair-state')).toBe('in')
  })

  it('does not step before it has risen, steps one edge per beat once it has, and only while on screen', () => {
    const { container } = render(<Stair preset="pink" seed={4} />)
    const head = container.firstElementChild!
    const rest = restingPolygon('pink')

    act(() => FakeIO.fire(poly(head), 1)) // on screen, head not arrived
    act(() => void vi.advanceTimersByTime(STAIR_INTERVAL))
    expect(poly(head).style.clipPath).toBe(rest)

    act(() => FakeIO.fire(head, 1))
    act(() => void vi.advanceTimersByTime(STAIR_INTERVAL))
    const first = poly(head).style.clipPath
    expect(first).not.toBe(rest)
    expect(poly(head).style.transition).toContain('clip-path')
    const edges = (a: string, b: string) =>
      a.split(',').filter((pt, i) => pt !== b.split(',')[i]).length
    expect(edges(rest, first)).toBeLessThanOrEqual(4) // one parameter shared by at most a few vertices

    act(() => FakeIO.fire(poly(head), 0)) // scrolled away
    act(() => void vi.advanceTimersByTime(STAIR_INTERVAL * 3))
    expect(poly(head).style.clipPath).toBe(first)

    act(() => FakeIO.fire(poly(head), 1))
    act(() => void vi.advanceTimersByTime(STAIR_INTERVAL))
    expect(poly(head).style.clipPath).not.toBe(first)
  })

  it('stops the beat while the tab is hidden', () => {
    const { container } = render(<Stair preset="pink" />)
    const head = container.firstElementChild!
    act(() => FakeIO.fire(head, 1))
    act(() => FakeIO.fire(poly(head), 1))
    expect(_stairTimerCount()).toBe(1)

    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
    act(() => void document.dispatchEvent(new Event('visibilitychange')))
    expect(_stairTimerCount()).toBe(0)
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
    act(() => void document.dispatchEvent(new Event('visibilitychange')))
    expect(_stairTimerCount()).toBe(1)
  })

  it('a bare stair waits for `revealed`, then steps', () => {
    const { container, rerender } = render(
      <Stair preset="violet" bare revealed={false} />,
    )
    const el = container.firstElementChild as HTMLElement
    act(() => FakeIO.fire(el, 1))
    act(() => void vi.advanceTimersByTime(STAIR_INTERVAL))
    expect(el.style.clipPath).toBe(restingPolygon('violet'))
    rerender(<Stair preset="violet" bare revealed />)
    act(() => void vi.advanceTimersByTime(STAIR_INTERVAL))
    expect(el.style.clipPath).not.toBe(restingPolygon('violet'))
  })

  it('clears its timer and observers when it unmounts', () => {
    const { unmount } = render(<Stair preset="pink" />)
    expect(_stairTimerCount()).toBe(1)
    unmount()
    expect(_stairTimerCount()).toBe(0)
  })

  describe('reduced motion', () => {
    it('shows the final shape and content at once, and never steps', () => {
      setReducedMotion(true)
      const { container } = render(
        <Stair preset="pink" seed={4}>
          <h2>Viðburðir</h2>
        </Stair>,
      )
      const head = container.firstElementChild!
      expect(head.getAttribute('data-stair-state')).toBe('in')
      expect(poly(head).style.clipPath).toBe(restingPolygon('pink'))
      expect(_stairTimerCount()).toBe(0)
      act(() => void vi.advanceTimersByTime(STAIR_INTERVAL * 5))
      expect(poly(head).style.clipPath).toBe(restingPolygon('pink'))
      expect(poly(head).style.transition).toBe('none')
    })

    it('adds no scroll listener and no inset', () => {
      setReducedMotion(true)
      const add = vi.spyOn(window, 'addEventListener')
      render(
        <>
          <Stair preset="pink" />
          <Shape band inset />
        </>,
      )
      expect(add.mock.calls.filter(([type]) => type === 'scroll')).toHaveLength(0)
      expect(_insetCount()).toBe(0)
    })

    it('motion={false} is the same', () => {
      const { container } = render(<Stair preset="yellow" motion={false} />)
      expect(container.firstElementChild!.getAttribute('data-stair-state')).toBe('in')
      expect(_stairTimerCount()).toBe(0)
      expect(_insetCount()).toBe(0)
    })
  })
})

describe('the band inset', () => {
  const originalIO = globalThis.IntersectionObserver
  let restore: () => void
  beforeEach(() => {
    restore = fakeLayout()
    globalThis.IntersectionObserver = FakeIO as unknown as typeof IntersectionObserver
  })
  afterEach(() => {
    restore()
    globalThis.IntersectionObserver = originalIO
    vi.restoreAllMocks()
  })

  it('serves every stair and band with one passive scroll listener, and lets go of it with the last', () => {
    const add = vi.spyOn(window, 'addEventListener')
    const remove = vi.spyOn(window, 'removeEventListener')
    const scrollAdds = () => add.mock.calls.filter(([type]) => type === 'scroll')

    const { unmount } = render(
      <>
        <Stair preset="pink" />
        <Stair preset="yellow" />
        <Stair preset="violet" bare />
        <Shape band inset />
        <Shape band inset color="red" />
        <Shape band />
      </>,
    )
    expect(_insetCount()).toBe(5)
    expect(scrollAdds()).toHaveLength(1)
    const [, handler, options] = scrollAdds()[0]
    expect(options).toEqual({ passive: true })

    // listening never touches scrolling: the handler only asks for a frame
    const prevented = vi.fn()
    const evt = new Event('scroll', { cancelable: true })
    evt.preventDefault = prevented
    ;(handler as EventListener)(evt)
    expect(prevented).not.toHaveBeenCalled()

    unmount()
    expect(_insetCount()).toBe(0)
    expect(remove.mock.calls.filter(([type]) => type === 'scroll')).toHaveLength(1)
  })

  it('writes --hin, easing toward the full inset as the page scrolls', async () => {
    const frames: FrameRequestCallback[] = []
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => frames.push(cb))
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      bottom: 400,
      left: 0,
      right: 1000,
      width: 1000,
      height: 400,
      x: 0,
      y: 0,
      toJSON() {},
    })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 })
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1440 })
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 1000 })
    const { container } = render(<Stair preset="pink" />)
    const el = poly(container)
    const run = () => act(() => void frames.splice(0).forEach((f) => f(0)))
    run()
    const first = parseFloat(el.style.getPropertyValue('--hin'))
    expect(first).toBeGreaterThan(0)
    expect(first).toBeLessThan(24) // eased, not snapped
    for (let i = 0; i < 200; i++) run()
    expect(el.style.getPropertyValue('--hin')).toBe('24.00px')
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 })
  })

  it('is axe clean', async () => {
    const { container } = render(
      <Stair preset="pink">
        <StairText>
          <h2>Viðburðir</h2>
        </StairText>
      </Stair>,
    )
    expect((await axe(container)).violations).toEqual([])
  })
})
