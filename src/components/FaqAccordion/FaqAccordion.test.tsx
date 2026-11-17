import { describe, it, expect } from 'vitest'
import { axe } from 'vitest-axe'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FaqAccordion, type FaqItem } from './FaqAccordion'

const items: FaqItem[] = [
  { question: 'Hvað kostar aðild?', answer: 'Sjá verðskrá.' },
  { question: 'Who can join?', answer: 'Hver sem er.', questionLang: 'en', answerLang: 'is' },
  { question: 'Hvað kostar aðild?', answer: 'Annað svar með sömu spurningu.' },
]

describe('FaqAccordion', () => {
  it('starts with every answer closed and out of the accessibility tree', () => {
    render(<FaqAccordion items={items} />)
    for (const button of screen.getAllByRole('button')) {
      expect(button).toHaveAttribute('aria-expanded', 'false')
    }
    expect(screen.queryByRole('region')).toBeNull()
    expect(screen.getByText('Sjá verðskrá.')).not.toBeVisible()
  })

  it('opens and closes a row with the keyboard', async () => {
    const user = userEvent.setup()
    render(<FaqAccordion items={items} />)
    const first = screen.getAllByRole('button')[0]
    first.focus()
    await user.keyboard('{Enter}')
    expect(first).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('region', { name: 'Hvað kostar aðild?' })).toHaveTextContent('Sjá verðskrá.')
    await user.keyboard(' ')
    expect(first).toHaveAttribute('aria-expanded', 'false')
  })

  it('lets several rows be open at once', async () => {
    const user = userEvent.setup()
    render(<FaqAccordion items={items} />)
    const [a, b] = screen.getAllByRole('button')
    await user.click(a)
    await user.click(b)
    expect(screen.getAllByRole('region')).toHaveLength(2)
  })

  it('keeps rows with the same question independent', async () => {
    const user = userEvent.setup()
    render(<FaqAccordion items={items} />)
    await user.click(screen.getAllByRole('button')[2])
    expect(screen.getByRole('region')).toHaveTextContent('Annað svar')
    expect(screen.getAllByRole('button')[0]).toHaveAttribute('aria-expanded', 'false')
  })

  it('marks question and answer languages separately', async () => {
    const user = userEvent.setup()
    render(<FaqAccordion items={items} />)
    await user.click(screen.getAllByRole('button')[1])
    expect(screen.getByText('Who can join?')).toHaveAttribute('lang', 'en')
    expect(screen.getByText('Hver sem er.')).toHaveAttribute('lang', 'is')
  })

  it('renders nothing but an empty wrapper for no items', () => {
    render(<FaqAccordion items={[]} />)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('has no accessibility violations, closed or open', async () => {
    const user = userEvent.setup()
    const { container } = render(<FaqAccordion items={items.slice(0, 2)} />)
    expect((await axe(container)).violations).toEqual([])
    await user.click(screen.getAllByRole('button')[0])
    expect((await axe(container)).violations).toEqual([])
  })
})
