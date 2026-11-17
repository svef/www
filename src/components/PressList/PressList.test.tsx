import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { PressList, type PressListItem } from './PressList'

const items: PressListItem[] = [
  { title: 'Vefverðlaunin afhent', outlet: 'Vísir', url: 'https://visir.is/a', date: { iso: '2025-03-01T00:00:00.000Z', label: 'Mars 2025' } },
  { title: 'Ný stjórn', outlet: 'mbl.is', url: null },
]

describe('PressList', () => {
  it('links a row only when it has a url', () => {
    render(<PressList items={items} />)
    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(screen.getByRole('link', { name: 'Vefverðlaunin afhent' })).toHaveAttribute('href', 'https://visir.is/a')
    // The unlinked row is still listed, as text.
    expect(screen.getByRole('heading', { name: 'Ný stjórn' })).toBeInTheDocument()
  })

  it('shows the date as a <time> only when there is one', () => {
    render(<PressList items={items} dateLang="is" />)
    const [first, second] = screen.getAllByRole('listitem')
    const time = within(first).getByText('Mars 2025')
    expect(time.tagName).toBe('TIME')
    expect(time).toHaveAttribute('datetime', '2025-03-01T00:00:00.000Z')
    expect(time).toHaveAttribute('lang', 'is')
    expect(second.querySelector('time')).toBeNull()
  })

  it('sets the list language when given', () => {
    render(<PressList items={items} lang="is" />)
    expect(screen.getByRole('list')).toHaveAttribute('lang', 'is')
  })

  it('renders an empty list without rows', () => {
    render(<PressList items={[]} />)
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
  })
})
