import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { GrowText } from './GrowText'

describe('GrowText', () => {
  it('renders the label and mirrors it in data-text for width reservation', () => {
    render(<GrowText>Lesa meira</GrowText>)
    const el = screen.getByText('Lesa meira')
    expect(el).toHaveAttribute('data-text', 'Lesa meira')
    expect(el).toHaveClass('grow-text')
  })
})
