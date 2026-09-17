import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WinnerCard } from './WinnerCard'

const props = {
  siteName: 'nafn.is',
  category: 'Vefur ársins',
  year: 2025,
  blurb: 'Framúrskarandi heildarupplifun, hraði og efnistök.',
  url: 'https://nafn.is',
}

describe('WinnerCard', () => {
  it('renders the site as a level 3 heading by default', () => {
    render(<WinnerCard {...props} />)
    expect(screen.getByRole('heading', { level: 3, name: 'nafn.is' })).toBeInTheDocument()
  })

  it('honours an explicit heading level, for the home page', () => {
    render(<WinnerCard {...props} headingLevel={2} />)
    expect(screen.getByRole('heading', { level: 2, name: 'nafn.is' })).toBeInTheDocument()
  })

  it('prints the category and the year together', () => {
    // The category sits in its own span so it can carry `lang`; the year is a
    // sibling. Assert on the line they share, not on the span.
    render(<WinnerCard {...props} />)
    expect(screen.getByText('Vefur ársins').closest('p')).toHaveTextContent(
      'Vefur ársins 2025',
    )
  })

  it('links the whole card to the winning site', () => {
    render(<WinnerCard {...props} />)
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://nafn.is')
  })

  it('is not a link when no URL was recorded', () => {
    // Most of the historical archive arrives this way. A card with nowhere to go
    // renders as a static block rather than as an anchor that goes nowhere —
    // which is the failure `e2e/known-links.ts` exists to catch.
    render(<WinnerCard {...props} url={null} />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'nafn.is' })).toBeInTheDocument()
  })

  it('drops the blurb rather than reserving space for it', () => {
    render(<WinnerCard {...props} blurb={null} />)
    expect(screen.queryByText(/Framúrskarandi/)).not.toBeInTheDocument()
  })

  it('renders a screenshot with the media document’s own alt text', () => {
    render(
      <WinnerCard
        {...props}
        screenshot={{ url: '/nafn.png', alt: 'Forsíða nafn.is', width: 1600, height: 1000 }}
      />,
    )
    expect(screen.getByRole('img', { name: 'Forsíða nafn.is' })).toBeInTheDocument()
  })

  it('treats a screenshot with no alt text as decorative', () => {
    // The card names the site directly below the shot, so alt text repeating the
    // domain would have a screen reader say it twice and describe nothing.
    const { container } = render(
      <WinnerCard {...props} screenshot={{ url: '/nafn.png', alt: '', width: null, height: null }} />,
    )
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(container.querySelector('img')).toHaveAttribute('alt', '')
  })

  it('marks copy that is not in the page’s language', () => {
    const { container } = render(<WinnerCard {...props} categoryLang="is" blurbLang="is" />)
    expect(container.querySelectorAll('[lang="is"]')).toHaveLength(2)
  })
})
