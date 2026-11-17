import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BylawsText } from './BylawsText'
import { BylawsNote } from './BylawsNote'

vi.mock('@/components/Shape/Shape', () => ({
  Shape: ({ children, as: As = 'div', ...rest }: { children: React.ReactNode; as?: React.ElementType; [k: string]: unknown }) => (
    <As aria-labelledby={rest['aria-labelledby'] as string | undefined}>{children}</As>
  ),
}))
vi.mock('@/components/Shape/Notch', () => ({
  Notch: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const doc = `# Lög SVEF

Inngangur.

### 1. gr.
Félagið heitir **SVEF**.

### 2. gr.
Tilgangur félagsins.
`

describe('BylawsText', () => {
  it('sets the title as h2 and each article as an h3 named by its heading', () => {
    render(<BylawsText markdown={doc} lang="is" />)
    expect(screen.getByRole('heading', { level: 2, name: 'Lög SVEF' })).toBeInTheDocument()
    const articles = screen.getAllByRole('heading', { level: 3 })
    expect(articles.map((h) => h.textContent)).toEqual(['11. gr.', '22. gr.'])
    // The visible number is decoration; the accessible name is the heading as written.
    expect(screen.getByRole('heading', { level: 3, name: '1. gr.' })).toBeInTheDocument()
  })

  it('renders article bodies as Markdown', () => {
    render(<BylawsText markdown={doc} lang="is" />)
    expect(screen.getByText('SVEF').tagName).toBe('STRONG')
  })

  it('renders text before the first article', () => {
    render(<BylawsText markdown={doc} lang="is" />)
    expect(screen.getByText('Inngangur.')).toBeInTheDocument()
  })

  it('falls back to one block of text when there are no article headings', () => {
    render(<BylawsText markdown={'Bara texti.\n\nAnnar texti.'} lang="is" />)
    expect(screen.queryAllByRole('heading')).toHaveLength(0)
    expect(screen.getByText('Bara texti.')).toBeInTheDocument()
    expect(screen.getByText('Annar texti.')).toBeInTheDocument()
  })

  it('sets the language on the wrapper', () => {
    const { container } = render(<BylawsText markdown={doc} lang="is" />)
    expect(container.firstElementChild).toHaveAttribute('lang', 'is')
  })

  it('renders nothing visible for an empty document', () => {
    const { container } = render(<BylawsText markdown="" lang="is" />)
    expect(container.textContent).toBe('')
  })

  it('nests a heading inside an article beneath the article h3', () => {
    render(<BylawsText markdown={'### 1. gr.\n## Undirkafli\ntexti'} lang="is" />)
    expect(screen.getByRole('heading', { level: 4, name: 'Undirkafli' })).toBeInTheDocument()
  })
})

describe('BylawsNote', () => {
  it('is a labelled aside whose heading is the notch title', () => {
    render(
      <BylawsNote heading="Hvernig má leggja til breytingu?">
        <p>Sendið tillögu.</p>
      </BylawsNote>,
    )
    const aside = screen.getByRole('complementary', { name: 'Hvernig má leggja til breytingu?' })
    expect(aside).toHaveTextContent('Sendið tillögu.')
    expect(screen.getByRole('heading', { level: 2 })).toHaveAttribute('id', 'bylaws-process')
  })
})
