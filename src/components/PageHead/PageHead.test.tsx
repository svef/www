import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PageHead } from './PageHead'

describe('PageHead', () => {
  it('renders the title as the page heading, in the top-left notch', () => {
    render(<PageHead locale="is" title="Fréttir" />)
    const h1 = screen.getByRole('heading', { level: 1, name: 'Fréttir' })
    expect(h1.parentElement).toHaveAttribute('data-notch', 'tl')
  })

  it('renders the lede and no empty body without one', () => {
    const { container, rerender } = render(<PageHead locale="is" title="Fréttir" />)
    expect(container.querySelector('p')).toBeNull()
    rerender(<PageHead locale="is" title="Fréttir" lede="Allt sem við tilkynnum." />)
    expect(screen.getByText('Allt sem við tilkynnum.')).toBeInTheDocument()
  })

  it('links the crumb back and names it for assistive technology', () => {
    render(
      <PageHead
        locale="is"
        title="Frétt"
        crumb={{
          href: '/is/frettir',
          label: 'Til baka',
          ariaLabel: 'Til baka í fréttir',
        }}
      />,
    )
    const link = screen.getByRole('link', { name: 'Til baka í fréttir' })
    expect(link).toHaveAttribute('href', '/is/frettir')
    // The visible label stays inside the accessible name (WCAG 2.5.3).
    expect(link.textContent).toContain('Til baka')
  })

  it('marks a title that is not in the page language', () => {
    render(<PageHead locale="en" title="Ný stjórn" titleLang="is" />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveAttribute('lang', 'is')
  })

  it('rolls the same shape for the same seed, so server and client agree', () => {
    const a = render(<PageHead locale="is" title="A" seed="x" />)
    const b = render(<PageHead locale="is" title="A" seed="x" />)
    expect(a.container.innerHTML).toBe(b.container.innerHTML)
  })
})
