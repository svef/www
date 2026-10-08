'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { submitFeedback } from '@/lib/forms/actions'
import { EMPTY_STATE } from '@/lib/forms/state'
import { FEEDBACK_SUBJECTS } from '@/lib/forms/options'
import type { Locale } from '@/lib/i18n'
import { useAutoGrow } from '@/lib/use-auto-grow'
import {
  Field,
  ErrorSummary,
  Honeypot,
  Pending,
  Success,
  describe,
  errorMessage,
  type FormsCopy,
} from '@/components/FormParts/FormParts'
import shared from '@/components/FormParts/FormParts.module.scss'
import styles from './FeedbackForm.module.scss'

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
    <form action={formAction} className={shared.form} noValidate>
      <input type="hidden" name="locale" value={locale} />
      <Honeypot />

      {Object.keys(errors).length > 0 && (
        <ErrorSummary
          copy={copy}
          errors={errors}
          summaryRef={summaryRef}
          labels={[
            ['subject', 'fb-subject', t.subject],
            ['subjectOther', 'fb-subject-other', t.subjectOther],
            ['message', 'fb-message', t.message],
            ['name', 'fb-name', t.name],
            ['email', 'fb-email', t.email],
          ]}
        />
      )}

      <Field id="fb-subject" label={t.subject} error={err('subject')}>
        <select
          id="fb-subject"
          name="subject"
          required
          className={shared.input}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          {...describe('fb-subject', err('subject'))}
        >
          <option value="">{t.subjectPlaceholder}</option>
          {FEEDBACK_SUBJECTS.map((value) => (
            <option key={value} value={value}>
              {t.subjects[value]}
            </option>
          ))}
        </select>
      </Field>

      {showOther && (
        <div className={styles.other}>
          <Field id="fb-subject-other" label={t.subjectOther} error={err('subjectOther')}>
            <input
              id="fb-subject-other"
              name="subjectOther"
              type="text"
              required
              className={shared.input}
              value={subjectOther}
              onChange={(e) => setSubjectOther(e.target.value)}
              {...describe('fb-subject-other', err('subjectOther'))}
            />
          </Field>
        </div>
      )}

      <Field id="fb-message" label={t.message} error={err('message')}>
        <textarea
          id="fb-message"
          name="message"
          required
          ref={messageRef}
          className={`${shared.input} ${shared.textarea}`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          {...describe('fb-message', err('message'))}
        />
      </Field>

      <p className={styles.contactHint}>
        {t.contactHint}
      </p>

      <Field id="fb-name" label={t.name} optionalText={copy.optional} error={err('name')}>
        <input
          id="fb-name"
          name="name"
          type="text"
          autoComplete="name"
          className={shared.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          {...describe('fb-name', err('name'))}
        />
      </Field>

      <Field id="fb-email" label={t.email} optionalText={copy.optional} error={err('email')}>
        <input
          id="fb-email"
          name="email"
          type="email"
          autoComplete="email"
          className={shared.input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          {...describe('fb-email', err('email'))}
        />
      </Field>

      <div className={shared.actions}>
        <button
          type="submit"
          className={shared.submit}
          aria-disabled={pending}
          onClick={(e) => {
            if (pending) e.preventDefault()
          }}
        >
          {t.submit}
        </button>
        <Pending text={pending ? copy.sending : null} />
      </div>
    </form>
  )
}
