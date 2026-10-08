'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { submitTalkProposal } from '@/lib/forms/actions'
import { EMPTY_STATE } from '@/lib/forms/state'
import { TALK_TOPICS } from '@/lib/forms/options'
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
import styles from './TalkProposalForm.module.scss'

export function TalkProposalForm({ locale, copy }: { locale: Locale; copy: FormsCopy }) {
  const t = copy.talk
  const [state, formAction, pending] = useActionState(submitTalkProposal, EMPTY_STATE)

  // Controlled so a failed submit keeps what was typed (React resets forms
  // after an action completes).
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [topics, setTopics] = useState<string[]>([])
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [notes, setNotes] = useState('')

  const summaryFieldRef = useAutoGrow(summary)
  const notesRef = useAutoGrow(notes)
  const summaryRef = useRef<HTMLDivElement>(null)
  const successRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (state.status === 'error') summaryRef.current?.focus()
    if (state.status === 'success') successRef.current?.focus()
  }, [state])

  if (state.status === 'success') {
    return <Success title={t.successTitle} body={t.successBody} successRef={successRef} />
  }

  const errors = state.status === 'error' ? (state.errors ?? {}) : {}
  const err = (field: string) => errorMessage(copy, errors[field])

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
            ['name', 'tp-name', t.name],
            ['email', 'tp-email', t.email],
            ['title', 'tp-title', t.proposedTitle],
            ['summary', 'tp-summary', t.summary],
            ['notes', 'tp-notes', t.notes],
          ]}
        />
      )}

      <Field id="tp-name" label={t.name} error={err('name')}>
        <input
          id="tp-name"
          name="name"
          type="text"
          required
          autoComplete="name"
          className={shared.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          {...describe('tp-name', err('name'))}
        />
      </Field>

      <Field id="tp-email" label={t.email} error={err('email')}>
        <input
          id="tp-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className={shared.input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          {...describe('tp-email', err('email'))}
        />
      </Field>

      <fieldset className={styles.topics} aria-describedby="tp-topics-hint">
        <legend className={styles.legend}>{t.topicsLegend}</legend>
        <p id="tp-topics-hint" className={styles.topicsHint}>
          {t.topicsHint}
        </p>
        <div className={styles.topicList}>
          {TALK_TOPICS.map((value) => {
            const id = `tp-topic-${value}`
            return (
              <div key={value} className={styles.topic}>
                <input
                  id={id}
                  type="checkbox"
                  name="topics"
                  value={value}
                  className={styles.checkbox}
                  checked={topics.includes(value)}
                  onChange={(e) =>
                    setTopics((prev) =>
                      e.target.checked ? [...prev, value] : prev.filter((v) => v !== value),
                    )
                  }
                />
                <label htmlFor={id}>{t.topics[value]}</label>
              </div>
            )
          })}
        </div>
      </fieldset>

      <Field id="tp-title" label={t.proposedTitle} error={err('title')}>
        <input
          id="tp-title"
          name="title"
          type="text"
          required
          className={shared.input}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          {...describe('tp-title', err('title'))}
        />
      </Field>

      <Field
        id="tp-summary"
        label={t.summary}
        hint={t.summaryHint}
        hintId="tp-summary-hint"
        error={err('summary')}
      >
        <textarea
          id="tp-summary"
          name="summary"
          required
          ref={summaryFieldRef}
          className={`${shared.input} ${shared.textarea}`}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          {...describe('tp-summary', err('summary'), 'tp-summary-hint')}
        />
      </Field>

      <Field
        id="tp-notes"
        label={t.notes}
        optionalText={copy.optional}
        hint={t.notesHint}
        hintId="tp-notes-hint"
        error={err('notes')}
      >
        <textarea
          id="tp-notes"
          name="notes"
          ref={notesRef}
          className={`${shared.input} ${shared.textarea}`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          {...describe('tp-notes', err('notes'), 'tp-notes-hint')}
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
