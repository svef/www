'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { submitFeedback } from '@/lib/forms/actions'
import { EMPTY_STATE } from '@/lib/forms/state'
import { FEEDBACK_SUBJECTS } from '@/lib/forms/options'
import type { Locale } from '@/lib/i18n'
import { useAutoGrow } from '@/lib/use-auto-grow'
import {
  Chip,
  Chips,
  ErrorSummary,
  Field,
  FieldError,
  Fields,
  FormHead,
  FormRoot,
  Honeypot,
  Pending,
  Reveal,
  Send,
  Step,
  SubmitButton,
  Success,
  describe,
  errorMessage,
  inputClass,
  textareaClass,
  type FormsCopy,
} from '@/components/FormParts/FormParts'

export function FeedbackForm({ locale, copy }: { locale: Locale; copy: FormsCopy }) {
  const t = copy.feedback
  const [state, formAction, pending] = useActionState(submitFeedback, EMPTY_STATE)

  // Controlled, because React resets a form after its action finishes and we do
  // not want a failed submit to wipe what somebody just wrote.
  const [subject, setSubject] = useState('')
  const [subjectOther, setSubjectOther] = useState('')
  const [message, setMessage] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  const messageRef = useAutoGrow(message)
  const summaryRef = useRef<HTMLDivElement>(null)
  const successRef = useRef<HTMLDivElement>(null)

  // Each submit returns a fresh state object, so this runs on every failed
  // attempt, even when the set of errors is the same as last time.
  useEffect(() => {
    if (state.status === 'error') summaryRef.current?.focus()
    if (state.status === 'success') successRef.current?.focus()
  }, [state])

  if (state.status === 'success') {
    return <Success title={t.successTitle} body={t.successBody} successRef={successRef} />
  }

  const errors = state.status === 'error' ? (state.errors ?? {}) : {}
  const err = (field: string) => errorMessage(copy, errors[field])
  const showOther = subject === 'other'

  return (
    <>
      <FormHead id="fb-heading" title={t.heading} intro={t.contactHint} />
      <FormRoot labelledBy="fb-heading" action={formAction} noValidate>
        <input type="hidden" name="locale" value={locale} />
        <Honeypot />

        {Object.keys(errors).length > 0 && (
          <ErrorSummary
            copy={copy}
            errors={errors}
            summaryRef={summaryRef}
            labels={[
              ['subject', `fb-choice-${FEEDBACK_SUBJECTS[0]}`, t.subject],
              ['subjectOther', 'fb-subject-other', t.subjectOther],
              ['message', 'fb-message', t.message],
              ['name', 'fb-name', t.name],
              ['email', 'fb-email', t.email],
            ]}
          />
        )}

        <Step num="01" title={t.subject} titleId="fb-subject-h">
          <Chips
            role="radiogroup"
            labelledBy="fb-subject-h"
            describedBy={err('subject') ? 'fb-subject-error' : undefined}
            invalid={Boolean(err('subject'))}
          >
            {FEEDBACK_SUBJECTS.map((value) => (
              <Chip
                key={value}
                id={`fb-choice-${value}`}
                type="radio"
                name="subject"
                value={value}
                label={t.subjects[value]}
                checked={subject === value}
                invalid={Boolean(err('subject'))}
                onChange={(on) => on && setSubject(value)}
              />
            ))}
          </Chips>
          {err('subject') && <FieldError id="fb-subject-error" message={err('subject')!} />}
          {showOther && (
            <Reveal>
              <Field id="fb-subject-other" label={t.subjectOther} error={err('subjectOther')}>
                <input
                  id="fb-subject-other"
                  name="subjectOther"
                  type="text"
                  required
                  className={inputClass}
                  value={subjectOther}
                  onChange={(e) => setSubjectOther(e.target.value)}
                  {...describe('fb-subject-other', err('subjectOther'))}
                />
              </Field>
            </Reveal>
          )}
        </Step>

        <Step num="02" title={t.message} labelFor="fb-message">
          <Field id="fb-message" error={err('message')}>
            <textarea
              id="fb-message"
              name="message"
              required
              rows={6}
              ref={messageRef}
              className={textareaClass}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              {...describe('fb-message', err('message'))}
            />
          </Field>
        </Step>

        <Step num="03" title={copy.steps.about} optionalText={copy.optional}>
          <Fields>
            <Field id="fb-name" label={t.name} error={err('name')}>
              <input
                id="fb-name"
                name="name"
                type="text"
                autoComplete="name"
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                {...describe('fb-name', err('name'))}
              />
            </Field>
            <Field id="fb-email" label={t.email} error={err('email')}>
              <input
                id="fb-email"
                name="email"
                type="email"
                autoComplete="email"
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                {...describe('fb-email', err('email'))}
              />
            </Field>
          </Fields>
        </Step>

        <Step num="04" title={copy.steps.send}>
          <Send>
            <SubmitButton label={t.submit} pending={pending} />
            <Pending text={pending ? copy.sending : null} />
          </Send>
        </Step>
      </FormRoot>
    </>
  )
}
