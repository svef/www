'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { submitTalkProposal } from '@/lib/forms/actions'
import { EMPTY_STATE } from '@/lib/forms/state'
import { TALK_TOPICS } from '@/lib/forms/options'
import type { Locale } from '@/lib/i18n'
import { useAutoGrow } from '@/lib/use-auto-grow'
import {
  Chip,
  Chips,
  ErrorSummary,
  Field,
  Fields,
  FormHead,
  FormRoot,
  Honeypot,
  Pending,
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
    <>
      <FormHead id="tp-heading" title={t.heading} intro={t.intro} />
      <FormRoot labelledBy="tp-heading" action={formAction} noValidate>
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

        <Step num="01" title={copy.steps.about}>
          <Fields>
            <Field id="tp-name" label={t.name} error={err('name')}>
              <input
                id="tp-name"
                name="name"
                type="text"
                required
                autoComplete="name"
                className={inputClass}
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
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                {...describe('tp-email', err('email'))}
              />
            </Field>
          </Fields>
        </Step>

        <Step
          num="02"
          title={t.topicsLegend}
          titleId="tp-topics-h"
          hint={t.topicsHint}
          hintId="tp-topics-hint"
        >
          <Chips role="group" labelledBy="tp-topics-h" describedBy="tp-topics-hint">
            {TALK_TOPICS.map((value) => (
              <Chip
                key={value}
                id={`tp-topic-${value}`}
                type="checkbox"
                name="topics"
                value={value}
                label={t.topics[value]}
                checked={topics.includes(value)}
                onChange={(on) =>
                  setTopics((prev) => (on ? [...prev, value] : prev.filter((v) => v !== value)))
                }
              />
            ))}
          </Chips>
        </Step>

        <Step num="03" title={copy.steps.talk}>
          <Fields>
            <Field id="tp-title" label={t.proposedTitle} error={err('title')} wide>
              <input
                id="tp-title"
                name="title"
                type="text"
                required
                className={inputClass}
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
              wide
            >
              <textarea
                id="tp-summary"
                name="summary"
                required
                rows={5}
                ref={summaryFieldRef}
                className={textareaClass}
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
              wide
            >
              <textarea
                id="tp-notes"
                name="notes"
                rows={4}
                ref={notesRef}
                className={textareaClass}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                {...describe('tp-notes', err('notes'), 'tp-notes-hint')}
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
