import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TierCard } from './TierCard'

const props = {
  name: 'Einstaklingsaðild',
  price: '23.900 kr.',
  priceNote: 'á ári',
  benefits: ['Frítt á alla viðburði'],
  ctaLabel: 'Ganga í SVEF',
  ctaHref: '/hafa-samband',
}

describe('TierCard', () => {
  it('renders the tier name as a level 2 heading by default', () => {
    render(<TierCard {...props} />)
    expect(
      screen.getByRole('heading', { level: 2, name: props.name }),
    ).toBeInTheDocument()
  })

  it('honours an explicit heading level', () => {
    render(<TierCard {...props} headingLevel={3} />)
    expect(
      screen.getByRole('heading', { level: 3, name: props.name }),
    ).toBeInTheDocument()
  })
})
