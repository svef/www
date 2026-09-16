import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NewsCard } from './NewsCard'

const props = {
  date: '22. maí 2026',
  title: 'Ný stjórn tekin við',
  excerpt: 'Ný stjórn SVEF tók við á aðalfundi.',
  href: '/frettir',
}

describe('NewsCard', () => {
  it('renders the title as a level 2 heading by default', () => {
    render(<NewsCard {...props} />)
    expect(
      screen.getByRole('heading', { level: 2, name: props.title }),
    ).toBeInTheDocument()
  })

  it('honours an explicit heading level', () => {
    render(<NewsCard {...props} headingLevel={3} />)
    expect(
      screen.getByRole('heading', { level: 3, name: props.title }),
    ).toBeInTheDocument()
  })
})
