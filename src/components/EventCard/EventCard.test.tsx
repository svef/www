import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EventCard } from './EventCard'

const props = { title: 'Íslensku vefverðlaunin', dateLabel: '14. nóvember 2026' }

describe('EventCard', () => {
  it('renders the title as a level 3 heading by default', () => {
    render(<EventCard {...props} />)
    expect(
      screen.getByRole('heading', { level: 3, name: props.title }),
    ).toBeInTheDocument()
  })

  it('honours an explicit heading level', () => {
    render(<EventCard {...props} headingLevel={2} />)
    expect(
      screen.getByRole('heading', { level: 2, name: props.title }),
    ).toBeInTheDocument()
  })

  it('keeps the heading when the card is wrapped in a link', () => {
    render(<EventCard {...props} href="/vidburdir" />)
    expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument()
  })
})

describe('EventCard with a second link', () => {
  const past = {
    title: 'Klúðurkvöld',
    dateLabel: '13. mar 2026',
    dateTime: '2026-03-13T12:00:00.000Z',
    location: 'Grandi 101 — Sjö sögur af mistökum.',
    href: '/vidburdir/kludurkvold',
    secondary: { href: '/myndir', label: 'Myndir frá viðburði' },
  }

  it('offers both destinations as separate links', () => {
    // A card that is itself a link cannot contain another one, so the shape
    // changes: the title carries the event link and the photos link sits beside
    // it. Both must be reachable and separately named.
    render(<EventCard {...past} />)
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(2)
    expect(screen.getByRole('link', { name: past.title })).toHaveAttribute(
      'href',
      '/vidburdir/kludurkvold',
    )
    expect(screen.getByRole('link', { name: /Myndir frá viðburði/ })).toHaveAttribute(
      'href',
      '/myndir',
    )
  })

  it('keeps the title a heading, with the link inside it', () => {
    render(<EventCard {...past} />)
    const heading = screen.getByRole('heading', { level: 3, name: past.title })
    expect(heading.querySelector('a')).toBeInTheDocument()
  })

  it('keeps the arrow out of the accessible name', () => {
    render(<EventCard {...past} />)
    expect(screen.getByText('→')).toHaveAttribute('aria-hidden', 'true')
  })

  it('exposes a machine-readable date when one is given', () => {
    const { container } = render(<EventCard {...past} />)
    expect(container.querySelector('time')).toHaveAttribute(
      'dateTime',
      '2026-03-13T12:00:00.000Z',
    )
  })

  it('marks untranslated copy with its own language', () => {
    render(<EventCard {...past} titleLang="is" locationLang="is" />)
    expect(screen.getByRole('heading', { level: 3 })).toHaveAttribute('lang', 'is')
  })
})
