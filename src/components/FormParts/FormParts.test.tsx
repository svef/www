import { describe, it, expect, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { is } from '@/lib/i18n/is'
import { en } from '@/lib/i18n/en'
import {
  Chip,
  Chips,
  ErrorSummary,
  Field,
  FormRoot,
  Honeypot,
  Pending,
  SubmitButton,
  Success,
  describe as describeControl,
  errorMessage,
} from './FormParts'

const copy = is.forms

describe('errorMessage', () => {
  it('has nothing to say without a key', () => {
    expect(errorMessage(copy, undefined)).toBeUndefined()
  })

  it('looks a known key up in the dictionary of the form’s own language', () => {
    expect(errorMessage(copy, 'required')).toBe(is.forms.errors.required)
    expect(errorMessage(en.forms, 'required')).toBe(en.forms.errors.required)
  })

  it('reads an unknown key as "invalid" rather than showing nothing', () => {
    expect(errorMessage(copy, 'something-new')).toBe(copy.errors.invalid)
  })

  it('never shows the summary sentence as a field error', () => {
    expect(errorMessage(copy, 'summary')).toBe(copy.errors.invalid)
  })
})

describe('describe', () => {
  it('links a control to its hint and error, and flags it invalid only with an error', () => {
    expect(describeControl('f', undefined)).toEqual({ 'aria-invalid': undefined, 'aria-describedby': undefined })
    expect(describeControl('f', undefined, 'f-hint')).toMatchObject({ 'aria-describedby': 'f-hint' })
    expect(describeControl('f', 'required', 'f-hint')).toEqual({
      'aria-invalid': true,
      'aria-describedby': 'f-hint f-error',
    })
  })
})

describe('Field', () => {
  it('labels its control, shows the optional marker, the hint and the error', () => {
    render(
      <Field id="email" label="Netfang" optionalText="valfrjálst" hint="Við svörum þar" hintId="email-hint" error="Vantar">
        <input id="email" />
      </Field>,
    )
    expect(screen.getByLabelText(/Netfang/)).toBeInTheDocument()
    expect(screen.getByText('(valfrjálst)')).toBeInTheDocument()
    expect(screen.getByText('Við svörum þar')).toHaveAttribute('id', 'email-hint')
    expect(screen.getByText('Vantar')).toHaveAttribute('id', 'email-error')
  })

  it('renders no label or error when it has none', () => {
    const { container } = render(
      <Field id="x">
        <input id="x" />
      </Field>,
    )
    expect(container.querySelector('label')).toBeNull()
    expect(container.querySelector('p')).toBeNull()
  })
})

describe('ErrorSummary', () => {
  it('lists only the fields with errors, in display order, each linking to its control', () => {
    render(
      <ErrorSummary
        copy={copy}
        errors={{ email: 'invalid', name: 'required' }}
        labels={[
          ['name', 'f-name', 'Nafn'],
          ['subject', 'f-subject', 'Efni'],
          ['email', 'f-email', 'Netfang'],
        ]}
        summaryRef={createRef()}
      />,
    )
    const links = screen.getAllByRole('link')
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['#f-name', '#f-email'])
    expect(links[0]).toHaveTextContent(`Nafn: ${copy.errors.required}`)
    expect(screen.getByRole('alert')).toHaveTextContent(copy.errors.summary)
  })
})

describe('Chips and Chip', () => {
  it('reports its checked state through onChange', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(
      <>
        <p id="g">Efni</p>
        <Chips role="group" labelledBy="g">
          <Chip id="c1" type="checkbox" name="topics" value="a" label="Aðgengi" checked={false} onChange={onChange} />
        </Chips>
      </>,
    )
    await user.click(screen.getByRole('checkbox', { name: 'Aðgengi' }))
    expect(onChange).toHaveBeenCalledWith(true)
    expect(screen.getByRole('group', { name: 'Efni' })).toBeInTheDocument()
  })

  it('marks an invalid radio group', () => {
    render(
      <>
        <p id="g">Efni</p>
        <Chips role="radiogroup" labelledBy="g" invalid>
          <Chip id="c1" type="radio" name="s" value="a" label="A" checked invalid onChange={() => {}} />
        </Chips>
      </>,
    )
    expect(screen.getByRole('radiogroup')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('radio')).toBeChecked()
  })
})

describe('SubmitButton', () => {
  it('stays focusable but does not submit again while pending', async () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault())
    const user = userEvent.setup()
    const { rerender } = render(
      <form onSubmit={onSubmit}>
        <SubmitButton label="Senda" pending={false} />
      </form>,
    )
    await user.click(screen.getByRole('button', { name: 'Senda' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)

    rerender(
      <form onSubmit={onSubmit}>
        <SubmitButton label="Senda" pending />
      </form>,
    )
    const button = screen.getByRole('button', { name: 'Senda' })
    expect(button).toHaveAttribute('aria-disabled', 'true')
    expect(button).not.toBeDisabled()
    await user.click(button)
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })
})

describe('Pending and Success', () => {
  it('keeps the pending live region mounted when it is empty', () => {
    render(<Pending text={null} />)
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('shows a success body only when given one, and can take focus', () => {
    const ref = createRef<HTMLDivElement>()
    const { rerender } = render(<Success title="Takk" successRef={ref} />)
    expect(screen.getByRole('heading', { name: 'Takk' })).toBeInTheDocument()
    expect(screen.getByRole('status').querySelector('p')).toBeNull()
    expect(ref.current).toHaveAttribute('tabindex', '-1')
    rerender(<Success title="Takk" body="Við heyrum í þér" successRef={ref} />)
    expect(screen.getByText('Við heyrum í þér')).toBeInTheDocument()
  })
})

describe('Honeypot and FormRoot', () => {
  it('hides the trap field from assistive tech', () => {
    const { container } = render(<Honeypot />)
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelector('input')).toHaveAttribute('tabindex', '-1')
  })

  it('names the form', async () => {
    const { container } = render(
      <FormRoot label="Ábendingar">
        <Field id="m" label="Skilaboð">
          <textarea id="m" />
        </Field>
      </FormRoot>,
    )
    expect(screen.getByRole('form', { name: 'Ábendingar' })).toBeInTheDocument()
    expect((await axe(container)).violations).toEqual([])
  })
})
