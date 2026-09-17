import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { is } from '@/lib/i18n/is'
import { MembershipForm } from './MembershipForm'

const labels = is.membership.form

function setup() {
  render(<MembershipForm labels={labels} contactEmail="svef@svef.is" />)
  return userEvent.setup()
}

/**
 * The component hands the finished application to the visitor's mail client by
 * assigning `window.location.href`. jsdom has no navigation, so the real
 * `location` is swapped for a plain object and the assignment is read back.
 */
let href = ''
const realLocation = window.location

beforeEach(() => {
  href = ''
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      get href() {
        return href
      },
      set href(value: string) {
        href = value
      },
    },
  })
})

afterEach(() => {
  Object.defineProperty(window, 'location', { configurable: true, value: realLocation })
})

describe('MembershipForm', () => {
  it('labels every field, including the membership type select', async () => {
    setup()
    expect(screen.getByLabelText(labels.name)).toHaveProperty('tagName', 'INPUT')
    expect(screen.getByLabelText(labels.email)).toHaveProperty('tagName', 'INPUT')
    expect(screen.getByLabelText(labels.company)).toHaveProperty('tagName', 'INPUT')
    expect(screen.getByLabelText(labels.type)).toHaveProperty('tagName', 'SELECT')
  })

  it('offers exactly the two memberships the association sells', () => {
    setup()
    expect(
      screen.getAllByRole('option').map((o) => o.textContent),
    ).toEqual([labels.typeIndividual, labels.typeCompany])
  })

  it('says up front that an application travels by email', () => {
    setup()
    expect(screen.getByText(labels.emailOnly)).toBeInTheDocument()
  })

  it('reports what is missing and moves focus to the first offending field', async () => {
    const user = setup()
    await user.click(screen.getByRole('button', { name: labels.submit }))

    expect(screen.getByText(labels.errors.name)).toBeInTheDocument()
    expect(screen.getByText(labels.errors.email)).toBeInTheDocument()
    expect(screen.getByLabelText(labels.name)).toHaveFocus()
    expect(screen.getByLabelText(labels.name)).toHaveAttribute('aria-invalid', 'true')
  })

  it('does not open a mail client when the form is incomplete', async () => {
    const user = setup()
    await user.click(screen.getByRole('button', { name: labels.submit }))
    expect(href).toBe('')
  })

  it('rejects an address that is not one', async () => {
    const user = setup()
    await user.type(screen.getByLabelText(labels.name), 'Anna')
    await user.type(screen.getByLabelText(labels.email), 'anna@')
    await user.click(screen.getByRole('button', { name: labels.submit }))
    expect(screen.getByText(labels.errors.emailInvalid)).toBeInTheDocument()
    expect(href).toBe('')
  })

  it('clears a field error as the field is corrected', async () => {
    const user = setup()
    await user.click(screen.getByRole('button', { name: labels.submit }))
    expect(screen.getByText(labels.errors.name)).toBeInTheDocument()
    await user.type(screen.getByLabelText(labels.name), 'Anna')
    expect(screen.queryByText(labels.errors.name)).not.toBeInTheDocument()
  })

  it('asks for a company name only when the application is a company one', async () => {
    const user = setup()
    await user.type(screen.getByLabelText(labels.name), 'Anna')
    await user.type(screen.getByLabelText(labels.email), 'anna@example.is')
    await user.selectOptions(screen.getByLabelText(labels.type), 'company')
    await user.click(screen.getByRole('button', { name: labels.submit }))

    expect(screen.getByText(labels.errors.company)).toBeInTheDocument()
    expect(screen.getByLabelText(labels.company)).toHaveFocus()
    expect(href).toBe('')
  })

  it('accepts an individual application with no company', async () => {
    const user = setup()
    await user.type(screen.getByLabelText(labels.name), 'Anna')
    await user.type(screen.getByLabelText(labels.email), 'anna@example.is')
    await user.click(screen.getByRole('button', { name: labels.submit }))
    expect(screen.queryByText(labels.errors.company)).not.toBeInTheDocument()
    expect(href).toMatch(/^mailto:svef@svef\.is\?/)
  })

  it('hands the application to the visitor’s own mail client, filled in', async () => {
    const user = setup()
    await user.type(screen.getByLabelText(labels.name), 'Anna Jónsdóttir')
    await user.type(screen.getByLabelText(labels.email), 'anna@example.is')
    await user.type(screen.getByLabelText(labels.company), 'Vefstofan ehf.')
    await user.selectOptions(screen.getByLabelText(labels.type), 'company')
    await user.click(screen.getByRole('button', { name: labels.submit }))

    const url = new URL(href)
    expect(url.protocol).toBe('mailto:')
    expect(url.pathname).toBe('svef@svef.is')
    expect(url.searchParams.get('subject')).toBe(labels.mailSubject)
    expect(url.searchParams.get('body')).toBe(
      [
        `${labels.name}: Anna Jónsdóttir`,
        `${labels.email}: anna@example.is`,
        `${labels.company}: Vefstofan ehf.`,
        `${labels.type}: ${labels.typeCompany}`,
      ].join('\n'),
    )
  })

  /**
   * The point of the whole component. Email delivery is svef/www#32 and is not
   * built, so nothing here may read as a receipt. `ContactForm` shows a success
   * message for a message nobody receives; this asserts that bug is not copied.
   */
  it('never tells anyone their application was received', async () => {
    const user = setup()
    await user.type(screen.getByLabelText(labels.name), 'Anna')
    await user.type(screen.getByLabelText(labels.email), 'anna@example.is')
    await user.click(screen.getByRole('button', { name: labels.submit }))

    const status = screen.getByText(labels.opened, { exact: false })
    expect(status).toBeInTheDocument()
    // It says the opposite: not ours until you send it.
    expect(labels.opened).toContain('berst okkur ekki')
    expect(screen.queryByText(/takk/i)).not.toBeInTheDocument()
    // Every sentence on the panel that mentions the application arriving says
    // it has not. A claim of receipt would be one that does not.
    const claims = Array.from(document.querySelectorAll('p'))
      .map((p) => p.textContent ?? '')
      .filter((text) => /móttek|berst|barst/i.test(text))
    expect(claims.length).toBeGreaterThan(0)
    for (const claim of claims) expect(claim).toMatch(/ekki/i)
  })

  it('announces the outcome in a live region', async () => {
    const user = setup()
    await user.click(screen.getByRole('button', { name: labels.submit }))
    const live = document.querySelector('[aria-live="polite"]')
    expect(live?.textContent).toContain(labels.errors.summary)
  })

  it('offers a link to the same application when nothing opened', async () => {
    const user = setup()
    await user.type(screen.getByLabelText(labels.name), 'Anna')
    await user.type(screen.getByLabelText(labels.email), 'anna@example.is')
    await user.click(screen.getByRole('button', { name: labels.submit }))
    expect(screen.getByRole('link', { name: labels.fallback })).toHaveAttribute('href', href)
  })

  it('drops the optional-company hint once a company application is chosen', async () => {
    const user = setup()
    expect(screen.getByText(labels.companyHint)).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText(labels.type), 'company')
    expect(screen.queryByText(labels.companyHint)).not.toBeInTheDocument()
  })
})
