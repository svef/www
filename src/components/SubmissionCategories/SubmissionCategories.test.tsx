import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { CATEGORIES, CATEGORY_GROUPS } from '@/lib/awards/categories'
import { buildChoices } from '@/lib/awards/public-catalog'
import { SubmissionCategories } from './SubmissionCategories'

const choices = buildChoices(
  CATEGORY_GROUPS.map((g) => ({ id: g.slug, slug: g.slug, name: g.name, blurb: null, description: g.description, sortOrder: g.sortOrder })),
  CATEGORIES.map((c) => ({ slug: c.slug, groupId: c.group, name: c.name, blurb: c.blurb, description: c.description, tierLabel: c.tierLabel ?? null, price: c.price, sortOrder: c.sortOrder })),
  30,
  'nearest-900',
)
const copy = {
  earlyBird: 'Snemmskráning',
  regular: 'Almennt verð',
  currency: 'kr.',
  tiersTitle: 'Veldu eina stærð',
  tiersNote: 'Aðeins einn.',
}

describe('SubmissionCategories', () => {
  it('lists the fifteen choices, the group holding four tiers', () => {
    render(<SubmissionCategories choices={choices} locale="is" copy={copy} label="Flokkar" />)
    const list = screen.getByRole('list', { name: 'Flokkar' })
    expect(list.querySelectorAll(':scope > li')).toHaveLength(15)
    const group = list.querySelector('[data-choice="company-website"]') as HTMLElement
    expect(group.querySelectorAll('[data-category]')).toHaveLength(4)
    expect(within(group).getByRole('heading', { name: 'Veldu eina stærð' })).toBeInTheDocument()
  })

  it('shows regular and early-bird prices in the locale’s format', () => {
    render(<SubmissionCategories choices={choices} locale="en" copy={copy} label="Categories" />)
    const card = document.querySelector('[data-choice="marketing-website"]') as HTMLElement
    expect(card.textContent).toContain('18,900 kr.')
    expect(card.textContent).toContain('26,900 kr.')
  })

  it('shows the blurb and the full description without a disclosure', () => {
    render(<SubmissionCategories choices={choices} locale="is" copy={copy} label="Flokkar" />)
    const card = document.querySelector('[data-choice="marketing-website"]') as HTMLElement
    expect(card.querySelector('details')).toBeNull()
    const blurb = CATEGORIES.find((c) => c.slug === 'marketing-website')!.blurb!.is
    expect(within(card).getByText(blurb)).toBeInTheDocument()
    expect(card.querySelector('[data-description]')!.textContent).toContain(
      'Vefir sem eru gerðir fyrir tiltekna markaðsherferð',
    )
  })
})
