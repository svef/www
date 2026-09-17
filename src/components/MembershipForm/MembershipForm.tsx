'use client'

import { useId, useRef, useState, type FormEvent } from 'react'
import { Button } from '@/components/Button/Button'
import styles from './MembershipForm.module.scss'

export type MembershipType = 'individual' | 'company'

export interface MembershipFormLabels {
  title: string
  note: string
  emailOnly: string
  name: string
  email: string
  company: string
  companyHint: string
  type: string
  typeIndividual: string
  typeCompany: string
  submit: string
  errors: {
    summary: string
    name: string
    email: string
    emailInvalid: string
    company: string
  }
  opened: string
  fallback: string
  mailSubject: string
}

export interface MembershipFormProps {
  labels: MembershipFormLabels
  /**
   * Where an application goes. `site-settings.contactEmail` in the CMS is the
   * source of truth; the page passes it in so this component stays free of
   * Payload and unit-testable.
   */
  contactEmail: string
  /** Anchor the tier CTAs jump to. */
  id?: string
}

type Values = { name: string; email: string; company: string; type: MembershipType }
type FieldErrors = Partial<Record<'name' | 'email' | 'company', string>>

const EMPTY: Values = { name: '', email: '', company: '', type: 'individual' }

/**
 * A minimal check, on purpose: it catches a typo, not an undeliverable address.
 * Anything stricter rejects addresses that are perfectly valid, and the only
 * real test of an address is sending to it.
 */
const LOOKS_LIKE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validate(values: Values, labels: MembershipFormLabels): FieldErrors {
  const errors: FieldErrors = {}
  if (!values.name.trim()) errors.name = labels.errors.name
  if (!values.email.trim()) errors.email = labels.errors.email
  else if (!LOOKS_LIKE_EMAIL.test(values.email.trim())) errors.email = labels.errors.emailInvalid
  // Only a company application needs a company name; an individual may work
  // somewhere worth mentioning, or nowhere.
  if (values.type === 'company' && !values.company.trim()) errors.company = labels.errors.company
  return errors
}

/** The application as an email the visitor sends from their own account. */
export function buildMailto(
  values: Values,
  labels: MembershipFormLabels,
  contactEmail: string,
): string {
  const typeLabel = values.type === 'company' ? labels.typeCompany : labels.typeIndividual
  const body = [
    `${labels.name}: ${values.name.trim()}`,
    `${labels.email}: ${values.email.trim()}`,
    `${labels.company}: ${values.company.trim()}`,
    `${labels.type}: ${typeLabel}`,
  ].join('\n')
  return `mailto:${contactEmail}?subject=${encodeURIComponent(
    labels.mailSubject,
  )}&body=${encodeURIComponent(body)}`
}

/**
 * The membership application, as an email the visitor sends.
 *
 * There is no server-side submission yet — email delivery is svef/www#32 and
 * nothing is provisioned behind it. So this form does not pretend: pressing
 * "Senda umsókn" validates the fields and hands the finished application to the
 * visitor's own mail client, and the status line says, in as many words, that
 * it has not reached SVEF until they send it. Nothing here ever tells someone
 * their application was received. `ContactForm` does exactly that and is the
 * bug this deliberately does not copy.
 *
 * The consequence worth stating: the visitor is the sender, so a missing mail
 * client is visible to them (nothing opens) and the fallback link is there for
 * it — rather than invisible, which is what a form that swallows a submission
 * produces. When #32 lands, `onSubmit` posts to the server action and the
 * `emailOnly` line and the fallback link come out; the markup, labels and
 * validation stay as they are.
 *
 * `'use client'` stops here and not at the page: /skraning is prerendered and
 * revalidated, and only this panel is interactive.
 */
export function MembershipForm({ labels, contactEmail, id }: MembershipFormProps) {
  const [values, setValues] = useState<Values>(EMPTY)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [opened, setOpened] = useState(false)
  const [mailto, setMailto] = useState<string | null>(null)

  const base = useId()
  const ids = {
    name: `${base}-name`,
    email: `${base}-email`,
    company: `${base}-company`,
    type: `${base}-type`,
    heading: `${base}-heading`,
  }
  // Three separate refs rather than one object of them: the first field with a
  // problem takes focus after a failed submit, so an invalid form is not a
  // scroll hunt for a keyboard or screen-reader user.
  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const companyRef = useRef<HTMLInputElement>(null)

  // Clearing the field's error as it is corrected, rather than only on the next
  // submit, keeps the message from outliving the problem.
  //
  // The key is *removed*, not set to `undefined`. `Object.keys` counts a key
  // whose value is `undefined`, so leaving one behind kept the live region
  // announcing "something is missing" over a form with nothing missing — a
  // screen-reader user told the form is broken when it is not. `hasErrors`
  // below reads the values rather than the keys for the same reason.
  const set = (patch: Partial<Values>, cleared?: keyof FieldErrors) => {
    setValues((v) => ({ ...v, ...patch }))
    if (cleared) {
      setErrors(({ [cleared]: _removed, ...rest }) => rest)
    }
    setOpened(false)
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    // Handled here rather than by the browser: there is nothing to POST to, and
    // a bare `action` would navigate away and lose what was typed.
    event.preventDefault()
    const found = validate(values, labels)
    setErrors(found)
    if (Object.values(found).some(Boolean)) {
      setOpened(false)
      setMailto(null)
      // In the order the fields are read, not the order they were checked.
      if (found.name) nameRef.current?.focus()
      else if (found.email) emailRef.current?.focus()
      else if (found.company) companyRef.current?.focus()
      return
    }
    const href = buildMailto(values, labels, contactEmail)
    setMailto(href)
    setOpened(true)
    window.location.href = href
  }

  const hasErrors = Object.values(errors).some(Boolean)

  const describedBy = (field: 'name' | 'email' | 'company', extra?: string) =>
    [errors[field] ? `${ids[field]}-error` : null, extra].filter(Boolean).join(' ') || undefined

  return (
    <div className={styles.panel} id={id}>
      <h2 className={styles.title} id={ids.heading}>
        {labels.title}
      </h2>
      <p className={styles.note}>{labels.note}</p>
      <p className={styles.emailOnly}>{labels.emailOnly}</p>

      <form className={styles.form} onSubmit={onSubmit} noValidate aria-labelledby={ids.heading}>
        <div className={styles.grid}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor={ids.name}>
              {labels.name}
            </label>
            <input
              className={styles.input}
              id={ids.name}
              name="name"
              type="text"
              autoComplete="name"
              ref={nameRef}
              value={values.name}
              onChange={(e) => set({ name: e.target.value }, 'name')}
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={describedBy('name')}
            />
            {errors.name && (
              <p className={styles.error} id={`${ids.name}-error`}>
                {errors.name}
              </p>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor={ids.email}>
              {labels.email}
            </label>
            <input
              className={styles.input}
              id={ids.email}
              name="email"
              type="email"
              autoComplete="email"
              ref={emailRef}
              value={values.email}
              onChange={(e) => set({ email: e.target.value }, 'email')}
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={describedBy('email')}
            />
            {errors.email && (
              <p className={styles.error} id={`${ids.email}-error`}>
                {errors.email}
              </p>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor={ids.company}>
              {labels.company}
            </label>
            <input
              className={styles.input}
              id={ids.company}
              name="company"
              type="text"
              autoComplete="organization"
              ref={companyRef}
              value={values.company}
              onChange={(e) => set({ company: e.target.value }, 'company')}
              aria-invalid={errors.company ? true : undefined}
              aria-describedby={describedBy(
                'company',
                values.type === 'individual' ? `${ids.company}-hint` : undefined,
              )}
            />
            {/* The field is only optional for an individual application, so the
                hint goes away the moment the answer changes. */}
            {values.type === 'individual' && (
              <p className={styles.hint} id={`${ids.company}-hint`}>
                {labels.companyHint}
              </p>
            )}
            {errors.company && (
              <p className={styles.error} id={`${ids.company}-error`}>
                {errors.company}
              </p>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor={ids.type}>
              {labels.type}
            </label>
            <select
              className={styles.input}
              id={ids.type}
              name="type"
              value={values.type}
              onChange={(e) => set({ type: e.target.value as MembershipType })}
            >
              <option value="individual">{labels.typeIndividual}</option>
              <option value="company">{labels.typeCompany}</option>
            </select>
          </div>
        </div>

        <Button type="submit" className={styles.submit}>
          {labels.submit}
        </Button>

        {/* One live region for both outcomes, so a screen reader hears the
            result of a submit wherever it landed. */}
        <div className={styles.status} aria-live="polite">
          {hasErrors && <p className={styles.error}>{labels.errors.summary}</p>}
          {opened && (
            <p className={styles.opened}>
              {labels.opened}{' '}
              {mailto && (
                <a className={styles.fallback} href={mailto}>
                  {labels.fallback}
                </a>
              )}
            </p>
          )}
        </div>
      </form>
    </div>
  )
}
