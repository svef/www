import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ButtonLink } from './ButtonLink'

describe('ButtonLink', () => {
  it('is a link with the label as its name', () => {
    render(<ButtonLink href="/is/vidburdir">Skoða viðburði</ButtonLink>)
    const a = screen.getByRole('link', { name: 'Skoða viðburði' })
    expect(a).toHaveAttribute('href', '/is/vidburdir')
  })

  it('marks a label in another language', () => {
    render(
      <ButtonLink href="/x" lang="en">
        Join
      </ButtonLink>,
    )
    expect(screen.getByRole('link')).toHaveAttribute('lang', 'en')
  })

  it('applies variant, size and extra classes', () => {
    render(
      <ButtonLink href="/x" variant="text" size="large" className="extra">
        Go
      </ButtonLink>,
    )
    const cls = screen.getByRole('link').className
    expect(cls).toContain('text')
    expect(cls).toContain('large')
    expect(cls).toContain('extra')
    expect(cls).not.toContain('solid')
  })

  it('defaults to a solid, medium button', () => {
    render(<ButtonLink href="/x">Go</ButtonLink>)
    const cls = screen.getByRole('link').className
    expect(cls).toContain('solid')
    expect(cls).not.toContain('large')
  })
})
