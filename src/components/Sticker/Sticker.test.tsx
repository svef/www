import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { axe } from 'vitest-axe'
import { _parallaxCount } from '@/lib/parallax'
import { _scrollSubscriberCount } from '@/lib/scroll-bus'
import { _springState } from '@/lib/sticker-spring'
import { TEXT_STICKERS } from '@/lib/stickers/text'
import { PageStickers } from './PageStickers'
import { Sticker } from './Sticker'

function mockMedia(reduce: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('reduce') ? reduce : query.includes('fine'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    dispatchEvent: vi.fn(),
  }))
}

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', () => 1)
  vi.stubGlobal('cancelAnimationFrame', () => {})
  mockMedia(false)
})
afterEach(() => vi.unstubAllGlobals())

describe('Sticker', () => {
  it('artwork: an empty-alt image of the right file, recoloured on request', () => {
    const { container, rerender } = render(<Sticker kind="artwork" art="cool" />)
    const img = container.querySelector('img')!
    expect(img).toHaveAttribute('src', '/stickers/cool.svg')
    expect(img).toHaveAttribute('alt', '')
    expect(img).toHaveAttribute('draggable', 'false')
    rerender(<Sticker kind="artwork" art="cool" recolor="red" />)
    expect(container.querySelector('img')).toHaveAttribute('src', '/stickers/cool-red.svg')
  })

  it('text: the copy of the locale, no image', () => {
    const copy = TEXT_STICKERS['trust-me-developer']
    const is = render(<Sticker kind="text" copy={copy} locale="is" tone="yellow" />)
    expect(is.container.textContent).toContain('Treystu mér')
    expect(is.container.textContent).toContain('forritari')
    expect(is.container.querySelector('img')).toBeNull()
    is.unmount()
    const en = render(<Sticker kind="text" copy={copy} locale="en" tone="yellow" />)
    expect(en.container.textContent).toContain('Trust me')
    expect(en.container.textContent).not.toContain('Treystu')
  })

  it('is decorative: aria-hidden, inert, nothing focusable', () => {
    const { container } = render(<Sticker kind="artwork" art="cool" position={{ top: '1px' }} />)
    const el = container.firstElementChild!
    expect(el).toHaveAttribute('aria-hidden', 'true')
    expect(el).toHaveAttribute('inert')
    expect(container.querySelectorAll('a, button, input, [tabindex]')).toHaveLength(0)
  })

  it('places itself with custom properties, rotation included', () => {
    const { container } = render(
      <Sticker
        kind="artwork"
        art="cool"
        position={{ right: '6%', top: '42%' }}
        rotate={7}
        mobile={{ left: '44px', width: '130px' }}
      />,
    )
    const el = container.firstElementChild as HTMLElement
    expect(el.style.getPropertyValue('--r')).toBe('6%')
    expect(el.style.getPropertyValue('--t')).toBe('42%')
    expect(el.style.getPropertyValue('--rot')).toBe('7deg')
    expect(el.style.getPropertyValue('--ml')).toBe('44px')
    expect(el.style.getPropertyValue('--mw')).toBe('130px')
  })

  it('renders the same on the server (no layout reads before mount)', () => {
    const html = renderToString(<Sticker kind="artwork" art="cool" speed={0.2} />)
    expect(html).toContain('/stickers/cool.svg')
  })

  it('registers for parallax and the spring, and leaves on unmount', () => {
    const { unmount } = render(<Sticker kind="artwork" art="cool" speed={0.2} />)
    expect(_parallaxCount()).toBe(1)
    expect(_springState().count).toBe(1)
    expect(_scrollSubscriberCount()).toBe(2)
    unmount()
    expect(_parallaxCount()).toBe(0)
    expect(_springState().count).toBe(0)
    expect(_scrollSubscriberCount()).toBe(0)
  })

  it('shares one scroll listener across a whole page of stickers', () => {
    const add = vi.spyOn(window, 'addEventListener')
    const { unmount } = render(
      <>
        <PageStickers page="forsida" locale="is" />
        <PageStickers page="vidburdir" locale="is" />
        <PageStickers page="footer" locale="is" />
      </>,
    )
    expect(_parallaxCount()).toBe(4) // the hero one has no speed
    expect(add.mock.calls.filter(([t]) => t === 'scroll')).toHaveLength(1)
    unmount()
    add.mockRestore()
  })

  it('reduced motion: static placement, nothing registered, no listeners', () => {
    mockMedia(true)
    const add = vi.spyOn(window, 'addEventListener')
    const { container } = render(
      <Sticker kind="artwork" art="cool" speed={0.2} position={{ top: '10px' }} />,
    )
    expect(_parallaxCount()).toBe(0)
    expect(_springState().count).toBe(0)
    expect(add.mock.calls.filter(([t]) => ['scroll', 'pointermove'].includes(t as string))).toHaveLength(0)
    const el = container.firstElementChild as HTMLElement
    expect(el.style.getPropertyValue('--py')).toBe('')
    expect(el.style.getPropertyValue('--t')).toBe('10px')
    add.mockRestore()
  })

  it('motion={false} registers nothing', () => {
    render(<Sticker kind="artwork" art="cool" speed={0.2} motion={false} />)
    expect(_parallaxCount()).toBe(0)
    expect(_springState().count).toBe(0)
  })

  it('has no axe violations, artwork or text', async () => {
    const { container } = render(
      <main>
        <Sticker kind="artwork" art="cool" />
        <Sticker kind="text" copy={TEXT_STICKERS.cool} locale="en" tone="pink" />
      </main>,
    )
    expect((await axe(container)).violations).toEqual([])
  })
})

describe('PageStickers', () => {
  it('renders a page\'s stickers, recoloured where the rule says', () => {
    const { container } = render(<PageStickers page="vidburdir" locale="is" />)
    const imgs = container.querySelectorAll('img')
    expect(imgs).toHaveLength(1)
    expect(imgs[0]).toHaveAttribute('src', '/stickers/cool-pink.svg')
  })

  it('renders only the requested band', () => {
    const { container } = render(<PageStickers page="forsida" band="events" locale="is" />)
    expect(container.querySelectorAll('img')).toHaveLength(2)
  })

  it('renders nothing for a band the page does not have', () => {
    const { container } = render(<PageStickers page="forsida" band="footer" locale="is" />)
    expect(container).toBeEmptyDOMElement()
  })
})
