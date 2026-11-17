import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatsRow } from './StatsRow'

describe('StatsRow', () => {
  it('renders nothing for an empty list', () => {
    const { container } = render(<StatsRow items={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders each figure with its label as a list item', () => {
    render(
      <StatsRow
        items={[
          { value: '120', label: 'Félagar' },
          { value: '30', label: 'Members', labelLang: 'en' },
        ]}
      />,
    )
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByText('120')).toBeInTheDocument()
    expect(screen.getByText('Members')).toHaveAttribute('lang', 'en')
    expect(screen.getByText('Félagar')).not.toHaveAttribute('lang')
  })

  it('cycles pink, yellow, violet', () => {
    render(
      <StatsRow
        items={['1', '2', '3', '4'].map((value) => ({ value, label: `l${value}` }))}
      />,
    )
    const classes = screen.getAllByRole('listitem').map((li) => li.className)
    // CSS Modules class names are identity-mapped by name in tests: the fourth row wraps to the first colour.
    expect(classes[3]).toBe(classes[0])
    expect(new Set(classes).size).toBe(3)
  })
})
