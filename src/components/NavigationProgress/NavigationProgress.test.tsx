import { renderToString } from 'react-dom/server'
import { act, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NavigationProgress } from './NavigationProgress'
import { resetPageReady } from '@/lib/page-ready'

let pathname = '/is'
vi.mock('next/navigation', () => ({ usePathname: () => pathname }))

function setReducedMotion(reduced: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduced && query.includes('reduce'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia
}

const firstLoad = (c: HTMLElement) => c.querySelector('[data-first-load]')
const anyBar = (c: HTMLElement) => c.querySelector('[aria-hidden="true"]')

function link(href: string) {
  const a = document.createElement('a')
  a.href = href
  a.textContent = 'go'
  document.body.appendChild(a)
  return a
}

describe('NavigationProgress', () => {
  let resolveFonts: () => void

  beforeEach(() => {
    vi.useFakeTimers()
    pathname = '/is'
    window.history.replaceState(null, '', '/is')
    resetPageReady()
    setReducedMotion(false)
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: { ready: new Promise<void>((r) => (resolveFonts = r)) },
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('renders the first-load bar immediately, hidden from assistive tech', () => {
    const { container } = render(<NavigationProgress />)
    const bar = firstLoad(container)
    expect(bar).toBeInTheDocument()
    expect(bar).toHaveAttribute('aria-hidden', 'true')
  })

  it('finishes when the fonts are ready, then is removed', async () => {
    const { container } = render(<NavigationProgress />)
    await act(async () => {
      resolveFonts()
    })
    const bar = firstLoad(container)
    expect(bar).toBeInTheDocument()
    // Finishing: the fade's end removes it.
    fireEvent.transitionEnd(bar!, { propertyName: 'opacity' })
    expect(firstLoad(container)).toBeNull()
  })

  it('does not wait on fonts longer than the timeout', async () => {
    const { container } = render(<NavigationProgress />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    // Fonts never resolved, but the bar is finishing and goes without them.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(firstLoad(container)).toBeNull()
  })

  it('removes the bar even if the fade transition never ends', async () => {
    const { container } = render(<NavigationProgress />)
    await act(async () => {
      resolveFonts()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(firstLoad(container)).toBeNull()
  })

  it('removes it immediately when ready under reduced motion', async () => {
    setReducedMotion(true)
    const { container } = render(<NavigationProgress />)
    expect(firstLoad(container)).toBeInTheDocument()
    await act(async () => {
      resolveFonts()
    })
    expect(firstLoad(container)).toBeNull()
  })

  it('ships a noscript rule and a CSS failsafe class so it cannot stick', () => {
    // The server HTML is what matters: the bar is there, with its noscript rule.
    const html = renderToString(<NavigationProgress />)
    expect(html).toContain('data-first-load')
    expect(html).toContain(
      '<noscript><style>[data-first-load]{display:none!important}</style></noscript>',
    )
    // The failsafe is a CSS animation on the `first` class (hashed by CSS Modules).
    expect(html).toMatch(/class="[^"]*first/)
  })

  describe('client navigation', () => {
    async function settle(container: HTMLElement) {
      await act(async () => {
        resolveFonts()
      })
      fireEvent.transitionEnd(firstLoad(container)!, { propertyName: 'opacity' })
    }

    it('shows on an internal link click and clears when the path changes', async () => {
      const { container, rerender } = render(<NavigationProgress />)
      await settle(container)
      expect(anyBar(container)).toBeNull()

      fireEvent.click(link('/is/frettir'))
      expect(anyBar(container)).toBeInTheDocument()
      expect(firstLoad(container)).toBeNull()

      pathname = '/is/frettir'
      rerender(<NavigationProgress />)
      expect(anyBar(container)).toBeNull()
    })

    it('ignores external, modified and same-page clicks', async () => {
      const { container } = render(<NavigationProgress />)
      await settle(container)
      fireEvent.click(link('https://example.com/x'))
      fireEvent.click(link('/is/frettir'), { metaKey: true })
      fireEvent.click(link('/is'))
      expect(anyBar(container)).toBeNull()
    })

    it('does not come back after Back returns to the starting path', async () => {
      const { container, rerender } = render(<NavigationProgress />)
      await settle(container)

      fireEvent.click(link('/is/frettir'))
      pathname = '/is/frettir'
      rerender(<NavigationProgress />)
      // Back: the path returns to the one the click started from.
      pathname = '/is'
      rerender(<NavigationProgress />)
      expect(anyBar(container)).toBeNull()
    })
  })
})
