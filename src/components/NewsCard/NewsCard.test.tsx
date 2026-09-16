import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NewsCard } from './NewsCard'

const props = {
  date: '22. maí 2026',
  dateTime: '2026-05-22T12:00:00.000Z',
  title: 'Ný stjórn tekin við',
  excerpt: 'Ný stjórn SVEF tók við á aðalfundi.',
  href: '/frettir/ny-stjorn-tekin-vid',
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

  it('links to the article', () => {
    render(<NewsCard {...props} />)
    expect(screen.getByRole('link')).toHaveAttribute('href', props.href)
  })

  it('exposes the date in machine-readable form', () => {
    render(<NewsCard {...props} />)
    const time = screen.getByText(props.date)
    expect(time.tagName).toBe('TIME')
    expect(time).toHaveAttribute('datetime', props.dateTime)
  })

  it('keeps the call to action out of the link name', () => {
    render(<NewsCard {...props} cta="Lesa fréttina" />)
    // The whole card is one link; repeating "Lesa fréttina" in its name would
    // tell a screen-reader user nothing the title has not already said.
    const link = screen.getByRole('link')
    expect(link.textContent).toContain('Lesa fréttina')
    expect(link).toHaveAccessibleName(expect.not.stringContaining('Lesa fréttina'))
    expect(link).toHaveAccessibleName(expect.stringContaining(props.title))
  })

  it('marks the article text with its own language when it differs', () => {
    render(<NewsCard {...props} lang="is" />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveAttribute('lang', 'is')
    expect(screen.getByText(props.excerpt)).toHaveAttribute('lang', 'is')
  })

  it('renders a cover image when there is one', () => {
    render(
      <NewsCard {...props} cover={{ url: '/cover.jpg', width: 800, height: 450 }} />,
    )
    // Decorative next to the title it illustrates, so it has an empty alt and
    // stays out of the accessible tree.
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
