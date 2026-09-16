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
