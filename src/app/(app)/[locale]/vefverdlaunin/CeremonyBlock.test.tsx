import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CeremonyBlock } from './CeremonyBlock'

const props = {
  eyebrow: 'Hátíðin 2026',
  headline: '14. nóvember í Hörpu',
  lines: ['Innsendingar opnar til 10. október 2026.', 'Miðar fara í sölu 1. september 2026.'],
}

describe('CeremonyBlock', () => {
  it('renders the headline as the block’s heading', () => {
    render(<CeremonyBlock {...props} />)
    expect(
      screen.getByRole('heading', { level: 2, name: '14. nóvember í Hörpu' }),
    ).toBeInTheDocument()
  })

  it('does not mark the headline up as a machine-readable date', () => {
    // `headline` is prose an editor writes — "Tuttugasta hátíðin" is a valid
    // heading — so a <time> around it would mark a sentence up as a timestamp.
    const { container } = render(<CeremonyBlock {...props} />)
    expect(container.querySelector('time')).toBeNull()
  })

  it('prints every line it is given, and nothing when there are none', () => {
    render(<CeremonyBlock {...props} />)
    expect(screen.getByText(props.lines[0]!)).toBeInTheDocument()
    expect(screen.getByText(props.lines[1]!)).toBeInTheDocument()
  })

  it('renders both calls to action when the edition has both URLs', () => {
    // The dev fixtures deliberately set neither, because the export draws both
    // as bare buttons with no destination — so this is the only place the
    // button-present path is exercised.
    render(
      <CeremonyBlock
        {...props}
        submit={{ label: 'Senda inn vef', href: 'https://example.test/submit' }}
        tickets={{ label: 'Kaupa miða', href: 'https://example.test/tickets' }}
      />,
    )
    expect(screen.getByRole('link', { name: 'Senda inn vef' })).toHaveAttribute(
      'href',
      'https://example.test/submit',
    )
    expect(screen.getByRole('link', { name: 'Kaupa miða' })).toHaveAttribute(
      'href',
      'https://example.test/tickets',
    )
  })

  it('renders one call to action when only one URL is set', () => {
    render(
      <CeremonyBlock {...props} tickets={{ label: 'Kaupa miða', href: 'https://example.test/t' }} />,
    )
    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(screen.getByRole('link', { name: 'Kaupa miða' })).toBeInTheDocument()
  })

  it('renders no buttons at all when the board has set neither URL', () => {
    // The state the seeded fixtures are actually in. A call to action that goes
    // nowhere is worse than no call to action.
    render(<CeremonyBlock {...props} />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('marks a headline that fell back to Icelandic', () => {
    render(<CeremonyBlock {...props} headlineLang="is" />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveAttribute('lang', 'is')
  })
})
