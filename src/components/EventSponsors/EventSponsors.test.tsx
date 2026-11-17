import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EventSponsors } from './EventSponsors'
import type { EventSponsor } from '@/lib/content/events-mapping'

const logo = { url: '/l.svg', width: 100, height: 50 }
const sponsor = (over: Partial<EventSponsor>): EventSponsor => ({
  name: 'A',
  logo,
  url: null,
  label: null,
  labelLocale: 'is',
  ...over,
})

describe('EventSponsors', () => {
  it('renders nothing without sponsors', () => {
    const { container } = render(<EventSponsors sponsors={[]} title="Samstarfsaðilar" locale="is" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('names each logo by the sponsor and links it only when there is a url', () => {
    render(
      <EventSponsors
        title="Samstarfsaðilar"
        locale="is"
        sponsors={[sponsor({ name: 'A', url: 'https://a.example' }), sponsor({ name: 'B' })]}
      />,
    )
    expect(screen.getByRole('link', { name: 'A' })).toHaveAttribute('href', 'https://a.example')
    expect(screen.getByRole('img', { name: 'B' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'B' })).toBeNull()
  })

  it('prints a shared label once, and a new label starts a new row', () => {
    render(
      <EventSponsors
        title="Partners"
        locale="en"
        sponsors={[
          sponsor({ name: 'A', label: 'Drinks' }),
          sponsor({ name: 'B', label: 'Drinks' }),
          sponsor({ name: 'C', label: 'Food' }),
        ]}
      />,
    )
    expect(screen.getAllByText('Drinks')).toHaveLength(1)
    expect(screen.getByText('Food')).toBeInTheDocument()
    expect(screen.getAllByRole('list')).toHaveLength(2)
  })

  it('marks a label that fell back to Icelandic', () => {
    render(
      <EventSponsors
        title="Partners"
        locale="en"
        sponsors={[sponsor({ label: 'Drykkir í boði', labelLocale: 'is' })]}
      />,
    )
    expect(screen.getByText('Drykkir í boði')).toHaveAttribute('lang', 'is')
  })
})
