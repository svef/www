import { createRef, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { is } from '@/lib/i18n/is'
import { en } from '@/lib/i18n/en'
import {
  Chip,
  Chips,
  ErrorSummary,
  Field,
  Fields,
  FormHead,
  FormRoot,
  Pending,
  Reveal,
  Send,
  Step,
  SubmitButton,
  Success,
  describe,
  inputClass,
  textareaClass,
  type FormsCopy,
} from './FormParts'

/**
 * The parts the three forms are built from, assembled into one demo form. The forms
 * themselves bind to server actions, so this is where their states are shown.
 */
function Demo({
  copy,
  errors = {},
  pending = false,
}: {
  copy: FormsCopy
  errors?: Record<string, string>
  pending?: boolean
}) {
  const [subject, setSubject] = useState('general')
  const f = copy.feedback
  const msg = (key: string | undefined) => (key ? copy.errors[key as 'required'] : undefined)
  return (
    <div style={{ width: 'min(760px, 100%)' }}>
      <FormHead id="demo-title" title={f.heading} intro={f.lead} />
      {Object.keys(errors).length > 0 && (
        <ErrorSummary
          copy={copy}
          errors={errors}
          labels={[
            ['subject', 'demo-subject', f.subject],
            ['message', 'demo-message', f.message],
            ['email', 'demo-email', f.email],
          ]}
          summaryRef={createRef()}
        />
      )}
      <FormRoot labelledBy="demo-title" noValidate onSubmit={(e) => e.preventDefault()}>
        <Step num="01" title={f.subject} titleId="demo-subject">
          <Chips role="radiogroup" labelledBy="demo-subject" invalid={!!errors.subject}>
            {Object.entries(f.subjects).map(([v, label]) => (
              <Chip key={v} id={`demo-${v}`} type="radio" name="subject" value={v} label={label} checked={subject === v} onChange={() => setSubject(v)} />
            ))}
          </Chips>
          {subject === 'other' && (
            <Reveal>
              <Field id="demo-other" label={f.subjectOther}>
                <input id="demo-other" className={inputClass} />
              </Field>
            </Reveal>
          )}
        </Step>
        <Step num="02" title={f.message} labelFor="demo-message">
          <Field id="demo-message" error={msg(errors.message)}>
            <textarea id="demo-message" className={textareaClass} rows={5} {...describe('demo-message', msg(errors.message))} />
          </Field>
        </Step>
        <Step num="03" title={f.name} optionalText={copy.optional} hint={f.contactHint}>
          <Fields>
            <Field id="demo-name" label={f.name}>
              <input id="demo-name" className={inputClass} />
            </Field>
            <Field id="demo-email" label={f.email} error={msg(errors.email)}>
              <input id="demo-email" type="email" className={inputClass} {...describe('demo-email', msg(errors.email))} />
            </Field>
          </Fields>
        </Step>
        <Send>
          <SubmitButton label={f.submit} pending={pending} />
          <Pending text={pending ? copy.sending : null} />
        </Send>
      </FormRoot>
    </div>
  )
}

const meta: Meta<typeof Demo> = {
  title: 'Forms/FormParts',
  component: Demo,
  parameters: { layout: 'padded' },
  args: { copy: is.forms },
}
export default meta

type Story = StoryObj<typeof Demo>

export const Default: Story = {}
export const English: Story = { args: { copy: en.forms } }
export const WithErrors: Story = {
  args: { errors: { subject: 'required', message: 'required', email: 'invalid' } },
}
export const Pending_: Story = { name: 'Pending', args: { pending: true } }
export const Succeeded: Story = {
  render: ({ copy }) => <Success title={copy.feedback.successTitle} body={copy.feedback.successBody} successRef={createRef()} />,
}
