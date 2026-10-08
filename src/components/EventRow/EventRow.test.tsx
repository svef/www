import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EventRow } from './EventRow'

const props = {
  day: '09',
  month: 'okt',
  dateTime: '2026-10-09',
  dateLabel: '9. október 2026',
  title: 'Klúðurkvöld',
  description: 'Grandi 101 · 20:00',
  href: '/vidburdir',
  ctaLabel: 'Nánar',
}

describe('EventRow', () => {
  it('renders the title as a level 3 heading by default', () => {
    render(<EventRow {...props} />)
    expect(
      screen.getByRole('heading', { level: 3, name: props.title }),
    ).toBeInTheDocument()
  })

  it('honours an explicit heading level', () => {
    render(<EventRow {...props} headingLevel={2} />)
    expect(
      screen.getByRole('heading', { level: 2, name: props.title }),
    ).toBeInTheDocument()
  })

  it('exposes a machine-readable date and hides the abbreviated badge', () => {
    const { container } = render(<EventRow {...props} />)
    const time = container.querySelector('time')
    expect(time).toHaveAttribute('dateTime', '2026-10-09')
    expect(time).toHaveTextContent('9. október 2026')
    expect(screen.getByText('09')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByText('okt')).toHaveAttribute('aria-hidden', 'true')
  })

  it('names the link with the full date rather than the badge text', () => {
    render(<EventRow {...props} />)
    expect(screen.getByRole('link').textContent).toContain('9. október 2026')
  })
})
