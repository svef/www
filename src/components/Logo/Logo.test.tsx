import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render } from '@testing-library/react'
import { Logo } from './Logo'

describe('Logo cycling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('runs a timer while visible, and none while the tab is hidden', () => {
    const { unmount } = render(<Logo />)
    expect(vi.getTimerCount()).toBe(1)

    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(vi.getTimerCount()).toBe(0)

    hidden.mockReturnValue(false)
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(vi.getTimerCount()).toBe(1)

    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('Logo hover colours', () => {
  it('takes a new colour pair on each hover, never the last one or its resting one, and resets on leave', async () => {
    const { fireEvent } = await import('@testing-library/react')
    const { container } = render(
      <a href="#top">
        <Logo hoverColours />
      </a>,
    )
    const link = container.querySelector('a')!
    const mark = container.querySelector('[role="img"]') as HTMLElement
    let previous = ''
    for (let i = 0; i < 25; i++) {
      fireEvent.pointerEnter(link)
      const shape = mark.style.getPropertyValue('--logo-shape')
      expect(shape).not.toBe('')
      expect(shape).not.toBe('var(--color-violet)') // the brand mark's resting colour
      expect(shape).not.toBe(previous)
      previous = shape
      fireEvent.pointerLeave(link)
      expect(mark.style.getPropertyValue('--logo-shape')).toBe('')
    }
  })

  it('does nothing unless asked', async () => {
    const { fireEvent } = await import('@testing-library/react')
    const { container } = render(
      <a href="#top">
        <Logo />
      </a>,
    )
    fireEvent.pointerEnter(container.querySelector('a')!)
    expect(
      (container.querySelector('[role="img"]') as HTMLElement).style.getPropertyValue(
        '--logo-shape',
      ),
    ).toBe('')
  })
})
