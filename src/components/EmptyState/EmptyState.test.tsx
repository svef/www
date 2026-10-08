import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EmptyState } from './EmptyState'

const props = {
  title: 'Engar fréttir enn',
  body: 'Hér birtast tilkynningar frá SVEF um leið og þær koma.',
}

describe('EmptyState', () => {
  it('renders the title as a level 2 heading by default', () => {
    render(<EmptyState {...props} />)
    expect(
      screen.getByRole('heading', { level: 2, name: props.title }),
    ).toBeInTheDocument()
  })

  it('honours an explicit heading level', () => {
    render(<EmptyState {...props} headingLevel={3} />)
    expect(
      screen.getByRole('heading', { level: 3, name: props.title }),
    ).toBeInTheDocument()
  })

  it('states the situation without announcing an error', () => {
    render(<EmptyState {...props} />)
    expect(screen.getByText(props.body)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
