import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BoardCard } from './BoardCard'
import { BoardGrid } from './BoardGrid'

// Shape measures the DOM on mount; its own tests cover that.
vi.mock('@/components/Shape/Shape', () => ({
  Shape: ({ layer, children, className }: { layer: React.ReactNode; children?: React.ReactNode; className?: string }) => (
    <div className={className} data-testid="shape">
      <div data-testid="layer">{layer}</div>
      {children}
    </div>
  ),
}))

describe('BoardCard', () => {
  it('names the person and the role in the caption', () => {
    render(<BoardCard name="Anna Jónsdóttir" role="Formaður" />)
    const fig = screen.getByRole('figure')
    expect(fig).toHaveTextContent('Anna Jónsdóttir')
    expect(fig).toHaveTextContent('Formaður')
  })

  it('appends the employer with the language-appropriate joiner', () => {
    render(<BoardCard name="A" role="Formaður" company="JúnÍ Digital" companyPrefix="hjá" />)
    expect(screen.getByText('Formaður hjá JúnÍ Digital')).toBeInTheDocument()
  })

  it('ignores the joiner when there is no employer', () => {
    render(<BoardCard name="A" role="Gjaldkeri" companyPrefix="hjá" company={null} />)
    expect(screen.getByText('Gjaldkeri')).toBeInTheDocument()
  })

  it('does not leave a double space when the joiner is missing', () => {
    render(<BoardCard name="A" role="Ritari" company="Acme" />)
    expect(screen.getByText('Ritari Acme')).toBeInTheDocument()
  })

  it('marks a role in another language', () => {
    render(<BoardCard name="A" role="Chair" roleLang="en" />)
    expect(screen.getByText('Chair')).toHaveAttribute('lang', 'en')
  })

  it('treats the portrait as decoration: the caption already names the person', () => {
    render(
      <BoardCard
        name="A"
        role="R"
        portrait={{ url: '/p.jpg', alt: 'Anna', width: 400, height: 500 }}
      />,
    )
    const img = screen.getByTestId('layer').querySelector('img')
    expect(img).not.toBeNull()
    expect(img).toHaveAttribute('alt', '')
  })

  it('keeps its shape with a placeholder when there is no portrait', () => {
    render(<BoardCard name="A" role="R" portrait={null} />)
    expect(screen.getByTestId('layer').querySelector('img')).toBeNull()
    expect(screen.getByTestId('layer').children).toHaveLength(1)
  })

  it('repeats its decorative look every eight cards', () => {
    render(
      <>
        <BoardCard name="A" role="R" index={1} />
        <BoardCard name="B" role="R" index={9} />
        <BoardCard name="C" role="R" index={2} />
      </>,
    )
    const [a, b, c] = screen.getAllByRole('figure').map((f) => f.getAttribute('data-look'))
    expect(a).toBe(b)
    expect(a).not.toBe(c)
  })
})

describe('BoardGrid', () => {
  it('holds its cards', () => {
    render(
      <BoardGrid>
        <BoardCard name="A" role="R" />
        <BoardCard name="B" role="R" />
      </BoardGrid>,
    )
    expect(screen.getAllByRole('figure')).toHaveLength(2)
  })
})
