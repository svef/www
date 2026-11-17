import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SectionHead } from './SectionHead'
import { PageSection } from '../PageSection/PageSection'

describe('SectionHead', () => {
  it('renders the title as an h2 with the given id and lang', () => {
    render(<SectionHead title="Stjórn" id="h-board" titleLang="is" />)
    const h = screen.getByRole('heading', { level: 2, name: 'Stjórn' })
    expect(h).toHaveAttribute('id', 'h-board')
    expect(h).toHaveAttribute('lang', 'is')
  })

  it('renders children beside the title', () => {
    render(
      <SectionHead title="T">
        <span>Aðeins á íslensku</span>
      </SectionHead>,
    )
    expect(screen.getByText('Aðeins á íslensku')).toBeInTheDocument()
  })

  it('can name a PageSection', () => {
    render(
      <PageSection aria-labelledby="h">
        <SectionHead title="Fréttir" id="h" />
      </PageSection>,
    )
    expect(screen.getByRole('region', { name: 'Fréttir' })).toBeInTheDocument()
  })
})

describe('PageSection', () => {
  it('passes through section attributes and merges class names', () => {
    render(
      <PageSection last className="extra" data-testid="s">
        body
      </PageSection>,
    )
    const s = screen.getByTestId('s')
    expect(s.tagName).toBe('SECTION')
    expect(s.className).toContain('extra')
    expect(s.className).toContain('last')
  })

  it('is not a landmark without a name', () => {
    render(<PageSection>body</PageSection>)
    expect(screen.queryByRole('region')).toBeNull()
  })
})
