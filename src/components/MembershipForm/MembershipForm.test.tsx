import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { is } from '@/lib/i18n/is'
import { en } from '@/lib/i18n/en'
import { MembershipForm, type MembershipFormLabels } from './MembershipForm'

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

/**
 * The copy that says an application has not arrived, pinned exactly.
 *
 * This is a deliberately dumb test, and the dumbness is the point. An earlier
 * version tried to *detect* a receipt claim — look for words about the
 * application arriving, require a negation nearby — and it does not work: the
 * sentence "Umsóknin er móttekin hjá SVEF um leið og þú ýtir á hnappinn — þú
 * þarft ekki að gera meira" is an outright claim of receipt and satisfies every
 * such heuristic, while a claim phrased in words the heuristic does not know
 * ("við höfum fengið umsóknina") is invisible to it. A test that can be
 * satisfied by a lie is worse than none, because it is quoted as proof.
 *
 * So this does not judge the copy. It pins it, in both languages. Email
 * delivery is svef/www#32 and is not built, so these three strings are the ones
 * that have to stay true, and changing any of them fails here and puts the new
 * wording in front of a human — in the diff, next to this comment. When #32
 * lands, `emailOnly` goes away and `opened` is replaced by a real confirmation,
 * and this test is rewritten as part of that change rather than in passing.
 */
describe('the promise the form makes', () => {
  it('has not changed in Icelandic', () => {
    expect(is.membership.form.emailOnly).toBe(
      'Umsóknir berast okkur í tölvupósti sem stendur. Þegar þú sendir umsóknina opnast hún tilbúin í tölvupóstforritinu þínu — hún telst ekki móttekin fyrr en þú sendir póstinn sjálf/ur.',
    )
    expect(is.membership.form.opened).toBe(
      'Umsóknin ætti að hafa opnast í tölvupóstforritinu þínu. Hún berst okkur ekki fyrr en þú sendir póstinn.',
    )
    expect(is.membership.form.note).toBe(
      'Við sendum greiðsluupplýsingar í tölvupósti innan tveggja virkra daga.',
    )
  })

  it('has not changed in English', () => {
    expect(en.membership.form.emailOnly).toBe(
      'Applications reach us by email for now. Sending opens the finished application in your email app — it does not reach us until you send that email yourself.',
    )
    expect(en.membership.form.opened).toBe(
      'The application should have opened in your email app. It does not reach us until you send that email.',
    )
    expect(en.membership.form.note).toBe(
      'We send payment details by email within two working days.',
    )
  })
})

/**
 * Every behavioural test runs in both languages. English is not a translation
 * of a tested Icelandic path here — it is the copy an English reader gets, and
 * a dictionary is as easy to get wrong as a component.
 */
describe.each([
  ['is', is.membership.form],
  ['en', en.membership.form],
] as const)('MembershipForm (%s)', (_locale, labels: MembershipFormLabels) => {
  function setup() {
    render(<MembershipForm labels={labels} contactEmail="svef@svef.is" />)
    return userEvent.setup()
  }

  const statusText = () => document.querySelector('[aria-live="polite"]')?.textContent ?? ''

  it('labels every field, including the membership type select', () => {
    setup()
    expect(screen.getByLabelText(labels.name)).toHaveProperty('tagName', 'INPUT')
    expect(screen.getByLabelText(labels.email)).toHaveProperty('tagName', 'INPUT')
    expect(screen.getByLabelText(labels.company)).toHaveProperty('tagName', 'INPUT')
    expect(screen.getByLabelText(labels.type)).toHaveProperty('tagName', 'SELECT')
  })

  it('offers exactly the two memberships the association sells', () => {
    setup()
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      labels.typeIndividual,
      labels.typeCompany,
    ])
  })

  it('says up front that an application travels by email', () => {
    setup()
    expect(screen.getByText(labels.emailOnly)).toBeInTheDocument()
  })

  it('says nothing at all before the first submit', () => {
    setup()
    expect(statusText()).toBe('')
  })

  it('reports what is missing and moves focus to the first offending field', async () => {
    const user = setup()
    await user.click(screen.getByRole('button', { name: labels.submit }))

    expect(screen.getByText(labels.errors.name)).toBeInTheDocument()
    expect(screen.getByText(labels.errors.email)).toBeInTheDocument()
    expect(screen.getByLabelText(labels.name)).toHaveFocus()
    expect(screen.getByLabelText(labels.name)).toHaveAttribute('aria-invalid', 'true')
    expect(statusText()).toContain(labels.errors.summary)
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

  /**
   * The live region used to be gated on `Object.keys(errors).length`, and
   * clearing an error wrote `undefined` to the key rather than removing it —
   * `Object.keys` counts those. So the summary stayed up over a form with
   * nothing wrong with it, announcing a problem that no longer existed and
   * pointing at no field. A screen-reader user was told the form was broken
   * when it was not.
   */
  it('takes the summary down once nothing is missing', async () => {
    const user = setup()
    await user.click(screen.getByRole('button', { name: labels.submit }))
    expect(statusText()).toContain(labels.errors.summary)

    await user.type(screen.getByLabelText(labels.name), 'Anna')
    await user.type(screen.getByLabelText(labels.email), 'anna@example.is')

    expect(statusText()).toBe('')
    expect(screen.getByLabelText(labels.name)).not.toHaveAttribute('aria-invalid')
  })

  it('does not resurrect the summary by editing a field after a good submit', async () => {
    const user = setup()
    await user.type(screen.getByLabelText(labels.name), 'Anna')
    await user.type(screen.getByLabelText(labels.email), 'anna@example.is')
    await user.click(screen.getByRole('button', { name: labels.submit }))
    expect(statusText()).toContain(labels.opened)

    await user.type(screen.getByLabelText(labels.company), 'Vefstofan ehf.')
    expect(statusText()).toBe('')
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
   * After a successful submit the live region says exactly one thing: the
   * pinned `opened` line and the fallback link, and nothing else. Anything
   * added beside them — a "thanks", a "we'll be in touch" — fails here.
   */
  it('says only that the mail client opened, and offers the link again', async () => {
    const user = setup()
    await user.type(screen.getByLabelText(labels.name), 'Anna')
    await user.type(screen.getByLabelText(labels.email), 'anna@example.is')
    await user.click(screen.getByRole('button', { name: labels.submit }))

    expect(statusText().replace(/\s+/g, ' ').trim()).toBe(`${labels.opened} ${labels.fallback}`)
    expect(screen.getByRole('link', { name: labels.fallback })).toHaveAttribute('href', href)
  })

  it('drops the optional-company hint once a company application is chosen', async () => {
    const user = setup()
    expect(screen.getByText(labels.companyHint)).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText(labels.type), 'company')
    expect(screen.queryByText(labels.companyHint)).not.toBeInTheDocument()
  })
})
