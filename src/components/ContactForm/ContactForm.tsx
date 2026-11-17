'use client'

import { useRef, useState } from 'react'
import {
  Field,
  Fields,
  FormRoot,
  Send,
  Step,
  SubmitButton,
  Success,
  inputClass,
  textareaClass,
} from '@/components/FormParts/FormParts'

export interface ContactFormLabels {
  name: string
  email: string
  message: string
  submit: string
  success: string
  /** Titles of the numbered steps. */
  steps: { about: string; send: string }
  /** Accessible name of the form. */
  formLabel: string
}

// UI only for now — TODO: wire to a route handler / email on submit (svef/www#32).
export function ContactForm({ labels }: { labels: ContactFormLabels }) {
  const [sent, setSent] = useState(false)
  const successRef = useRef<HTMLDivElement>(null)

  if (sent) {
    return <Success title={labels.success} successRef={successRef} />
  }

  return (
    <FormRoot
      label={labels.formLabel}
      onSubmit={(e) => {
        e.preventDefault()
        setSent(true)
      }}
    >
      <Step num="01" title={labels.steps.about}>
        <Fields>
          <Field id="c-name" label={labels.name}>
            <input
              id="c-name"
              name="name"
              type="text"
              required
              autoComplete="name"
              className={inputClass}
            />
          </Field>
          <Field id="c-email" label={labels.email}>
            <input
              id="c-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className={inputClass}
            />
          </Field>
        </Fields>
      </Step>

      <Step num="02" title={labels.message} labelFor="c-msg">
        <Field id="c-msg">
          <textarea id="c-msg" name="message" required rows={6} className={textareaClass} />
        </Field>
      </Step>

      <Step num="03" title={labels.steps.send}>
        <Send>
          <SubmitButton label={labels.submit} pending={false} />
        </Send>
      </Step>
    </FormRoot>
  )
}
