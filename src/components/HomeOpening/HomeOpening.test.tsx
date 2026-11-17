import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { HomeOpening, type HomeOpeningProps } from './HomeOpening'
import { HERO_ACTIONS_AT, HERO_HOLD } from './useHeroMorph'

const props: HomeOpeningProps = {
  locale: 'is',
  lines: ['Félag fólksins', 'sem býr til', 'vefinn á Íslandi.'],
  actions: [
    { label: 'Gerast félagi', href: '/is/skraning' },
    { label: 'Sjá viðburði', href: '/is/vidburdir' },
  ],
  intro: { text: 'Við erum fólkið á bak við vefinn.' },
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

const hero = (container: HTMLElement) => container.querySelector('section')!

describe('HomeOpening', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: { ready: Promise.resolve() },
    })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('has one h1 that reads as the whole headline, one word to a box', () => {
    setReducedMotion(true)
    const { container } = render(<HomeOpening {...props} />)
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1).toHaveTextContent('Félag fólksins sem býr til vefinn á Íslandi.')
    expect(container.querySelectorAll('[data-word]')).toHaveLength(8)
    // The words are numbered across lines: they stagger as one run.
    const last = container.querySelectorAll<HTMLElement>('[data-word]')[7]
    expect(last.style.getPropertyValue('--i')).toBe('7')
  })

  it('marks a headline that is not in the page language', () => {
    setReducedMotion(true)
    render(<HomeOpening {...props} lines={['The people']} titleLang="en" />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveAttribute('lang', 'en')
  })

  it('links the buttons it is given, and only those', () => {
    setReducedMotion(true)
    render(<HomeOpening {...props} actions={[props.actions[1]]} />)
    expect(screen.getByRole('link', { name: 'Sjá viðburði' })).toHaveAttribute(
      'href',
      '/is/vidburdir',
    )
    expect(screen.queryByRole('link', { name: 'Gerast félagi' })).toBeNull()
  })

  it('renders the intro band with its statement', () => {
    setReducedMotion(true)
    render(<HomeOpening {...props} />)
    expect(screen.getByText('Við erum fólkið á bak við vefinn.')).toBeInTheDocument()
  })

  it('under reduced motion shows the settled headline and the buttons at once', () => {
    setReducedMotion(true)
    const { container } = render(<HomeOpening {...props} />)
    expect(hero(container).getAttribute('data-hero')).toBe('settled')
    expect(hero(container).hasAttribute('data-actions')).toBe(true)
  })

  it('with motion, holds, plays the words, then brings in the buttons', async () => {
    setReducedMotion(false)
    const { container } = render(<HomeOpening {...props} />)
    await act(async () => {
      await Promise.resolve()
    })
    expect(hero(container).getAttribute('data-hero')).toBe('wait')
    expect(hero(container).hasAttribute('data-actions')).toBe(false)

    act(() => void vi.advanceTimersByTime(HERO_HOLD))
    expect(hero(container).getAttribute('data-hero')).toBe('play')
    expect(hero(container).hasAttribute('data-actions')).toBe(false)

    act(() => void vi.advanceTimersByTime(HERO_ACTIONS_AT))
    expect(hero(container).hasAttribute('data-actions')).toBe(true)

    // Once the last word has landed the headline is settled: no animation left to replay.
    act(() => void vi.advanceTimersByTime(5000))
    expect(hero(container).getAttribute('data-hero')).toBe('settled')
  })

  it('fixes every word to a box before the morph starts', async () => {
    setReducedMotion(false)
    const rect = { width: 120.5, height: 90 } as DOMRect
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(rect)
    const { container } = render(<HomeOpening {...props} />)
    await act(async () => {
      await Promise.resolve()
    })
    const word = container.querySelector<HTMLElement>('[data-word]')!
    expect(word.style.width).toBe('120.5px')
    expect(word.style.height).toBe('90px')
  })

  it('has no accessibility violations', async () => {
    vi.useRealTimers() // axe schedules with timers
    setReducedMotion(true)
    const { container } = render(
      <main>
        <HomeOpening {...props} />
      </main>,
    )
    expect((await axe(container)).violations).toEqual([])
  })
})
