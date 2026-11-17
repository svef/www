import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NewsCard, NEWS_CARD_LOOKS } from './NewsCard'

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
    render(<NewsCard {...props} titleLang="is" excerptLang="is" />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveAttribute('lang', 'is')
    expect(screen.getByText(props.excerpt)).toHaveAttribute('lang', 'is')
  })

  it('marks the title and the excerpt independently', () => {
    // A translated headline over an untranslated summary is a real state:
    // Payload localizes the two fields separately. Marking the summary as
    // English would have a screen reader read Icelandic in an English voice.
    render(<NewsCard {...props} excerptLang="is" />)
    expect(screen.getByRole('heading', { level: 2 })).not.toHaveAttribute('lang')
    expect(screen.getByText(props.excerpt)).toHaveAttribute('lang', 'is')
  })

  it('gives each position in a list its own look, repeating after six', () => {
    const { rerender } = render(<NewsCard {...props} index={0} />)
    const colourAt = () => screen.getByRole('link').className
    const first = colourAt()
    rerender(<NewsCard {...props} index={1} />)
    expect(colourAt()).not.toBe(first)
    expect(NEWS_CARD_LOOKS).toHaveLength(6)
    expect(NEWS_CARD_LOOKS[0].color).not.toBe(NEWS_CARD_LOOKS[1].color)
  })

  it('sets the date and the foot in notches on the sides its look asks for', () => {
    render(<NewsCard {...props} index={2} />)
    // Third look: date top-right, foot bottom-right.
    expect(screen.getByText(props.date)).toHaveAttribute('data-notch', 'tr')
    expect(screen.getByRole('heading', { level: 2 }).parentElement).toHaveAttribute(
      'data-notch',
      'br',
    )
  })
})
