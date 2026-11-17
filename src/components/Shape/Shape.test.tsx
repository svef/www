import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { axe } from 'vitest-axe'
import { computeGeometry, polygonPoints, toClipPath } from '@/lib/shape/geometry'
import { createRng, initialDraws, toSeed } from '@/lib/shape/random'
import { _ambientTimerCount, _resetFirstBatch } from '@/lib/shape/scheduler'
import { Shape } from './Shape'
import { Notch } from './Notch'

// jsdom does no layout: give every element a box, and make it count as rendered.
function fakeLayout(width = 400, height = 300) {
  const proto = HTMLElement.prototype
  const saved = ['offsetWidth', 'offsetHeight', 'offsetParent'].map(
    (k) => [k, Object.getOwnPropertyDescriptor(proto, k)] as const,
  )
  Object.defineProperty(proto, 'offsetWidth', { configurable: true, get: () => width })
  Object.defineProperty(proto, 'offsetHeight', { configurable: true, get: () => height })
  Object.defineProperty(proto, 'offsetParent', {
    configurable: true,
    get(this: HTMLElement) {
      return this.parentElement
    },
  })
  return () => saved.forEach(([k, d]) => d && Object.defineProperty(proto, k, d))
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

/** A stand-in IntersectionObserver whose entries the test fires by hand. */
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
  fire(target: Element, ratio: number) {
    this.cb(
      [
        {
          target,
          isIntersecting: ratio > 0,
          intersectionRatio: ratio,
          intersectionRect: { height: ratio * 300 } as DOMRectReadOnly,
          rootBounds: { height: 900 } as DOMRectReadOnly,
        } as IntersectionObserverEntry,
      ],
      this as unknown as IntersectionObserver,
    )
  }
}

const layer = (el: Element) => el.querySelector<HTMLElement>('[data-shape-layer]')!

describe('Shape on the server', () => {
  it('renders the element, a hidden colour layer and the content, with no clip-path', () => {
    const html = renderToString(
      <Shape as="header" color="yellow" auto="tr,br" className="x">
        <Notch corner="tl" pad={44} drift={110} minViewport={640}>
          <h1>Viðburðir</h1>
        </Notch>
        <p>Texti</p>
      </Shape>,
    )
    const host = document.createElement('div')
    host.innerHTML = html
    const el = host.firstElementChild as HTMLElement
    expect(el.tagName).toBe('HEADER')
    expect(el.hasAttribute('data-shape')).toBe(true)
    expect(el.className).toContain('x')
    expect(el.hasAttribute('data-shape-state')).toBe(false)
    expect(layer(el).getAttribute('aria-hidden')).toBe('true')
    expect(layer(el).getAttribute('style')).toBeNull()
    const notch = el.querySelector('[data-notch]')!
    expect(notch.getAttribute('data-notch')).toBe('tl')
    expect(notch.getAttribute('data-notch-pad')).toBe('44')
    expect(notch.getAttribute('data-notch-drift')).toBe('110')
    expect(notch.getAttribute('data-notch-min')).toBe('640')
    expect(el.querySelector('h1')?.textContent).toBe('Viðburðir')
  })

  it('renders bars and the mark as hidden decoration', () => {
    const html = renderToString(<Shape bars={2} mark />)
    const host = document.createElement('div')
    host.innerHTML = html
    expect(host.querySelectorAll('[data-shape-bar][aria-hidden="true"]')).toHaveLength(2)
    expect(host.querySelector('[data-shape-mark]')?.getAttribute('aria-hidden')).toBe(
      'true',
    )
  })
})

describe('Shape on the client', () => {
  let restore: () => void
  const originalIO = globalThis.IntersectionObserver

  beforeEach(() => {
    restore = fakeLayout()
    FakeIO.all = []
  })
  afterEach(() => {
    restore()
    setReducedMotion(false)
    globalThis.IntersectionObserver = originalIO
    vi.useRealTimers()
  })

  it('paints the seeded polygon before the first frame, the same for the same seed', () => {
    setReducedMotion(true)
    const { container } = render(<Shape auto="tr" seed={5} />)
    const el = container.firstElementChild as HTMLElement
    const g = computeGeometry({
      width: 400,
      height: 300,
      auto: ['tr'],
      draws: initialDraws(createRng(toSeed(5))),
    })!
    expect(layer(el).style.clipPath).toBe(toClipPath(polygonPoints(g)))
    expect(el.hasAttribute('data-shape-painted')).toBe(true)

    const again = render(<Shape auto="tr" seed={5} />)
    expect(layer(again.container.firstElementChild!).style.clipPath).toBe(
      layer(el).style.clipPath,
    )
  })

  it('shows everything at once under reduced motion', () => {
    setReducedMotion(true)
    const { container } = render(
      <Shape>
        <h2>Fyrirsögn</h2>
        <p>Texti</p>
      </Shape>,
    )
    expect(container.firstElementChild!.getAttribute('data-shape-state')).toBe('in')
  })

  it('marks headings to reveal and only the outermost body blocks to fade', () => {
    setReducedMotion(true)
    const { container } = render(
      <Shape>
        <Notch corner="tl">
          <h1>
            Titill <a href="#a">tengill</a>
          </h1>
        </Notch>
        <p>
          Texti með <a href="#b">tengli</a>
        </p>
        <div data-fade="">
          <ul>
            <li>Atriði</li>
          </ul>
        </div>
        <h2 data-shape-still="">Kyrr</h2>
      </Shape>,
    )
    const el = container.firstElementChild!
    expect(el.querySelector('h1')!.hasAttribute('data-shape-reveal')).toBe(true)
    expect(el.querySelector('h2')!.hasAttribute('data-shape-reveal')).toBe(false)
    expect(el.querySelector('p')!.hasAttribute('data-shape-fade')).toBe(true)
    expect(el.querySelector('a[href="#a"]')!.hasAttribute('data-shape-fade')).toBe(false)
    expect(el.querySelector('a[href="#b"]')!.hasAttribute('data-shape-fade')).toBe(false)
    expect(el.querySelector('[data-fade]')!.hasAttribute('data-shape-fade')).toBe(true)
    expect(el.querySelector('ul')!.hasAttribute('data-shape-fade')).toBe(false)
  })

  it('holds content back off screen and reveals it when 20% scrolls into view', async () => {
    setReducedMotion(false)
    globalThis.IntersectionObserver = FakeIO as unknown as typeof IntersectionObserver
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      top: 5000,
      bottom: 5300,
      left: 0,
      right: 400,
      width: 400,
      height: 300,
      x: 0,
      y: 5000,
      toJSON: () => ({}),
    })
    const { container } = render(
      <Shape>
        <p>Texti</p>
      </Shape>,
    )
    const el = container.firstElementChild!
    expect(el.getAttribute('data-shape-state')).toBe('pending')
    await act(() => new Promise((r) => requestAnimationFrame(() => r(null))))
    const rise = FakeIO.all.find((io) => io.targets.has(el))
    expect(rise).toBeDefined()
    act(() => rise!.fire(el, 0.1))
    expect(el.getAttribute('data-shape-state')).toBe('pending')
    act(() => rise!.fire(el, 0.2))
    expect(el.getAttribute('data-shape-state')).toBe('in')
    vi.restoreAllMocks()
  })

  it('settles above-the-fold shapes in place on the first load, and plays the entrance for later ones', async () => {
    setReducedMotion(false)
    globalThis.IntersectionObserver = FakeIO as unknown as typeof IntersectionObserver
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      top: 100,
      bottom: 400,
      left: 0,
      right: 400,
      width: 400,
      height: 300,
      x: 0,
      y: 100,
      toJSON: () => ({}),
    })
    _resetFirstBatch()
    const first = render(
      <Shape>
        <p>Texti</p>
      </Shape>,
    )
    const a = first.container.firstElementChild!
    expect(a.getAttribute('data-shape-state')).toBe('pending')
    await act(() => new Promise((r) => requestAnimationFrame(() => r(null))))
    expect(a.getAttribute('data-shape-state')).toBe('settled')

    // a later batch (a client navigation) keeps the entrance
    const later = render(
      <Shape>
        <p>Texti</p>
      </Shape>,
    )
    const b = later.container.firstElementChild!
    await act(() => new Promise((r) => requestAnimationFrame(() => r(null))))
    expect(b.getAttribute('data-shape-state')).toBe('pending')
    vi.restoreAllMocks()
  })

  it('runs one ambient timer per beat however many shapes drift, and none while hidden', () => {
    setReducedMotion(false)
    const shapes = (
      <>
        {Array.from({ length: 6 }, (_, i) => (
          <Shape key={i} ambient />
        ))}
        <Shape ambient="lively" />
      </>
    )
    const { unmount } = render(shapes)
    expect(_ambientTimerCount()).toBe(2)

    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(_ambientTimerCount()).toBe(0)
    hidden.mockReturnValue(false)
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(_ambientTimerCount()).toBe(2)

    unmount()
    expect(_ambientTimerCount()).toBe(0)
  })

  it('has no accessibility violations', async () => {
    setReducedMotion(true)
    const { container } = render(
      <Shape as="section" aria-label="Viðburðir" bars={1} mark>
        <Notch corner="tl">
          <h2>Viðburðir</h2>
        </Notch>
        <p>Texti</p>
      </Shape>,
    )
    expect((await axe(container)).violations).toEqual([])
  })
})
