import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SpotlightRow } from './SpotlightRow'

const props = {
  title: 'Hádegisfyrirlestur: Aðgengi í raunheimum',
  body: '14. nóv 2026 · 12:00 · Grandi 101',
}

describe('SpotlightRow', () => {
  it('leaves text unmarked when it is in the page’s own language', () => {
    render(<SpotlightRow {...props} />)
    expect(screen.getByRole('heading', { level: 2 })).not.toHaveAttribute('lang')
  })

  it('marks a title that fell back to another language', () => {
    // On /en most events are still Icelandic-only. Unmarked, a screen reader
    // reads Icelandic in an English voice — and this is the first heading on
    // the home page, so it is the first thing that happens (svef/www#90).
    render(<SpotlightRow {...props} titleLang="is" />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveAttribute('lang', 'is')
  })

  it('marks the body separately from the title', () => {
    // They come from different fields and fall back independently: a title can
    // be translated while the venue line is not.
    render(<SpotlightRow {...props} titleLang="is" bodyLang="en" />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveAttribute('lang', 'is')
    expect(screen.getByText(props.body)).toHaveAttribute('lang', 'en')
  })

  it('renders the body unmarked when no language is given', () => {
    render(<SpotlightRow {...props} />)
    expect(screen.getByText(props.body)).not.toHaveAttribute('lang')
  })
})
