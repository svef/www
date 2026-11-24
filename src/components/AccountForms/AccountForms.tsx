'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { ButtonLink } from '@/components/ButtonLink/ButtonLink'
import {
  Field,
  Fields,
  FormHead,
  FormRoot,
  Pending,
  Send,
  Step,
  SubmitButton,
  describe,
  inputClass,
} from '@/components/FormParts/FormParts'
import { authClient } from '@/lib/awards/auth/client'
import type { Locale } from '@/lib/i18n'
import type { AccountCopy } from './copy'
import styles from './AccountForms.module.scss'

type Errors = Record<string, string>
type Common = AccountCopy['common']

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD = 10

/** Better Auth error → the copy to show. Unknown failures read as generic. */
function messageFor(
  error: { status?: number; code?: string } | null | undefined,
  common: Common,
): string {
  if (!error) return common.errors.generic
  if (error.status === 429) return common.errors.tooMany
  switch (error.code) {
    case 'INVALID_EMAIL_OR_PASSWORD':
    case 'INVALID_PASSWORD':
      return common.errors.credentials
    case 'USER_ALREADY_EXISTS':
    case 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL':
      return common.errors.exists
    case 'PASSWORD_TOO_SHORT':
      return common.errors.passwordShort
    case 'INVALID_EMAIL':
      return common.errors.email
    case 'INVALID_TOKEN':
      return common.errors.token
    default:
      return common.errors.generic
  }
}

/** Field errors plus a form-level one; the alert is focused when either appears. */
function useFormState() {
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const alertRef = useRef<HTMLDivElement>(null)

  const hasProblem = Object.keys(errors).length > 0 || formError !== null
  useEffect(() => {
    if (hasProblem) alertRef.current?.focus()
  }, [hasProblem, errors, formError])

  return { errors, setErrors, formError, setFormError, pending, setPending, alertRef }
}

function Alert({
  alertRef,
  errors,
  formError,
  fields,
  common,
}: {
  alertRef: React.Ref<HTMLDivElement>
  errors: Errors
  formError: string | null
  /** Field name → [input id, visible label], in display order. */
  fields: Array<[name: string, id: string, label: string]>
  common: Common
}) {
  const items = fields.filter(([name]) => errors[name])
  if (items.length === 0 && !formError) return null
  return (
    <div ref={alertRef} className={styles.alert} role="alert" tabIndex={-1}>
      <p>{common.errorSummary}</p>
      <ul>
        {items.map(([name, id, label]) => (
          <li key={name}>
            <a href={`#${id}`}>
              {label}: {errors[name]}
            </a>
          </li>
        ))}
        {formError && <li>{formError}</li>}
      </ul>
    </div>
  )
}

function TextField({
  id,
  name,
  label,
  type = 'text',
  autoComplete,
  hint,
  optionalText,
  error,
  inputMode,
  defaultValue,
}: {
  id: string
  name: string
  defaultValue?: string
  label: string
  type?: 'text' | 'email' | 'tel'
  autoComplete: string
  hint?: string
  optionalText?: string
  error?: string
  inputMode?: 'email' | 'tel'
}) {
  const hintId = hint ? `${id}-hint` : undefined
  return (
    <Field id={id} label={label} hint={hint} hintId={hintId} optionalText={optionalText} error={error} wide>
      <input
        id={id}
        name={name}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        className={inputClass}
        spellCheck={false}
        {...describe(id, error, hintId)}
      />
    </Field>
  )
}

function PasswordField({
  id,
  label,
  hint,
  autoComplete,
  error,
  common,
}: {
  id: string
  label: string
  hint?: string
  autoComplete: 'new-password' | 'current-password'
  error?: string
  common: Common
}) {
  const [shown, setShown] = useState(false)
  const hintId = hint ? `${id}-hint` : undefined
  return (
    <Field id={id} label={label} hint={hint} hintId={hintId} error={error} wide>
      <div className={styles.passwordWrap}>
        <input
          id={id}
          name="password"
          type={shown ? 'text' : 'password'}
          autoComplete={autoComplete}
          className={inputClass}
          {...describe(id, error, hintId)}
        />
        <button
          type="button"
          className={styles.toggle}
          aria-pressed={shown}
          aria-controls={id}
          onClick={() => setShown((v) => !v)}
        >
          {shown ? common.hidePassword : common.showPassword}
        </button>
      </div>
    </Field>
  )
}

/** The panel a finished form is replaced with; focused so it is announced and reachable. */
function Done({ title, children }: { title: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => ref.current?.focus(), [])
  return (
    <div ref={ref} className={styles.panel} role="status" tabIndex={-1}>
      <h2>{title}</h2>
      {children}
    </div>
  )
}

const value = (data: FormData, key: string) => String(data.get(key) ?? '').trim()

// ── Sign up ─────────────────────────────────────────────────────────────────

export function SignUpForm({
  locale,
  copy,
  common,
  next,
  links,
  defaultEmail,
}: {
  locale: Locale
  /** Prefilled address (an invitation was sent to it). */
  defaultEmail?: string
  copy: AccountCopy['signUp']
  common: Common
  /** Where "Continue" leads once the account exists. */
  next: string
  links: { signIn: string; verified: string }
}) {
  const s = useFormState()
  const [created, setCreated] = useState<string | null>(null)
  const uid = useId().replaceAll(':', '')
  const ids = { name: `${uid}-name`, email: `${uid}-email`, phone: `${uid}-phone`, password: `${uid}-password` }

  if (created) {
    return (
      <Done title={copy.doneTitle}>
        <p>{copy.doneBody.replace('{email}', created)}</p>
        <div className={styles.actions}>
          <ButtonLink href={next}>{copy.doneContinue}</ButtonLink>
        </div>
      </Done>
    )
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const name = value(data, 'name')
    const email = value(data, 'email')
    const phone = value(data, 'phone')
    const password = String(data.get('password') ?? '')

    const errors: Errors = {}
    if (!name) errors.name = common.errors.required
    if (!email) errors.email = common.errors.required
    else if (!EMAIL.test(email)) errors.email = common.errors.email
    if (!password) errors.password = common.errors.required
    else if (password.length < MIN_PASSWORD) errors.password = common.errors.passwordShort
    s.setErrors(errors)
    s.setFormError(null)
    if (Object.keys(errors).length > 0) return

    s.setPending(true)
    const { error } = await authClient.signUp.email({
      name,
      email,
      password,
      phone: phone || undefined,
      preferredLocale: locale,
      callbackURL: links.verified,
    })
    s.setPending(false)
    if (error) {
      if (error.code === 'USER_ALREADY_EXISTS' || error.code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL') {
        s.setErrors({ email: common.errors.exists })
      } else if (error.code === 'PASSWORD_TOO_SHORT') {
        s.setErrors({ password: common.errors.passwordShort })
      } else {
        s.setFormError(messageFor(error, common))
      }
      return
    }
    setCreated(email)
  }

  return (
    <>
      <FormHead id="account-heading" title={copy.heading} />
      <FormRoot labelledBy="account-heading" onSubmit={onSubmit} noValidate>
        <Step num="01" title={copy.heading}>
          <Alert
            alertRef={s.alertRef}
            errors={s.errors}
            formError={s.formError}
            fields={[
              ['name', ids.name, copy.name],
              ['email', ids.email, copy.email],
              ['password', ids.password, copy.password],
            ]}
            common={common}
          />
          <Fields>
            <TextField id={ids.name} name="name" label={copy.name} autoComplete="name" error={s.errors.name} />
            <TextField
              id={ids.email}
              name="email"
              type="email"
              inputMode="email"
              label={copy.email}
              autoComplete="email"
              defaultValue={defaultEmail}
              error={s.errors.email}
            />
            <TextField
              id={ids.phone}
              name="phone"
              type="tel"
              inputMode="tel"
              label={copy.phone}
              optionalText={common.optional}
              hint={copy.phoneHint}
              autoComplete="tel"
              error={s.errors.phone}
            />
            <PasswordField
              id={ids.password}
              label={copy.password}
              hint={copy.passwordHint}
              autoComplete="new-password"
              error={s.errors.password}
              common={common}
            />
          </Fields>
        </Step>
        <Step num="02" title={copy.submit}>
          <Send>
            <SubmitButton label={copy.submit} pending={s.pending} />
            <Pending text={s.pending ? common.sending : null} />
          </Send>
          <p className={styles.links}>
            <span>{copy.haveAccount}</span> <Link href={links.signIn}>{copy.signInLink}</Link>
          </p>
        </Step>
      </FormRoot>
    </>
  )
}

// ── Sign in ─────────────────────────────────────────────────────────────────

export function SignInForm({
  copy,
  common,
  next,
  links,
}: {
  copy: AccountCopy['signIn']
  common: Common
  next: string
  links: { forgot: string; signUp: string }
}) {
  const s = useFormState()
  const uid = useId().replaceAll(':', '')
  const ids = { email: `${uid}-email`, password: `${uid}-password` }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const email = value(data, 'email')
    const password = String(data.get('password') ?? '')

    const errors: Errors = {}
    if (!email) errors.email = common.errors.required
    else if (!EMAIL.test(email)) errors.email = common.errors.email
    if (!password) errors.password = common.errors.required
    s.setErrors(errors)
    s.setFormError(null)
    if (Object.keys(errors).length > 0) return

    s.setPending(true)
    const { error } = await authClient.signIn.email({ email, password })
    if (error) {
      s.setPending(false)
      s.setFormError(messageFor(error, common))
      return
    }
    // A full navigation, so server components render with the new session.
    window.location.assign(next)
  }

  return (
    <>
      <FormHead id="account-heading" title={copy.heading} />
      <FormRoot labelledBy="account-heading" onSubmit={onSubmit} noValidate>
        <Step num="01" title={copy.heading}>
          <Alert
            alertRef={s.alertRef}
            errors={s.errors}
            formError={s.formError}
            fields={[
              ['email', ids.email, copy.email],
              ['password', ids.password, copy.password],
            ]}
            common={common}
          />
          <Fields>
            <TextField
              id={ids.email}
              name="email"
              type="email"
              inputMode="email"
              label={copy.email}
              autoComplete="email"
              error={s.errors.email}
            />
            <PasswordField
              id={ids.password}
              label={copy.password}
              autoComplete="current-password"
              error={s.errors.password}
              common={common}
            />
          </Fields>
        </Step>
        <Step num="02" title={copy.submit}>
          <Send>
            <SubmitButton label={copy.submit} pending={s.pending} />
            <Pending text={s.pending ? common.sending : null} />
          </Send>
          <p className={styles.links}>
            <Link href={links.forgot}>{copy.forgot}</Link>
            <span>
              {copy.noAccount} <Link href={links.signUp}>{copy.signUpLink}</Link>
            </span>
          </p>
        </Step>
      </FormRoot>
    </>
  )
}

// ── Forgot password ─────────────────────────────────────────────────────────

export function ForgotPasswordForm({
  copy,
  common,
  links,
}: {
  copy: AccountCopy['forgot']
  common: Common
  /** `reset` is where the email's link lands; `signIn` is the way back. */
  links: { reset: string; signIn: string }
}) {
  const s = useFormState()
  const [sent, setSent] = useState(false)
  const uid = useId().replaceAll(':', '')
  const emailId = `${uid}-email`

  if (sent) {
    return (
      <Done title={copy.doneTitle}>
        <p>{copy.doneBody}</p>
        <p className={styles.links}>
          <Link href={links.signIn}>{copy.back}</Link>
        </p>
      </Done>
    )
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const email = value(new FormData(event.currentTarget), 'email')
    const errors: Errors = {}
    if (!email) errors.email = common.errors.required
    else if (!EMAIL.test(email)) errors.email = common.errors.email
    s.setErrors(errors)
    s.setFormError(null)
    if (Object.keys(errors).length > 0) return

    s.setPending(true)
    const { error } = await authClient.requestPasswordReset({ email, redirectTo: links.reset })
    s.setPending(false)
    // The server answers the same whether or not the address has an account.
    if (error) s.setFormError(messageFor(error, common))
    else setSent(true)
  }

  return (
    <>
      <FormHead id="account-heading" title={copy.heading} />
      <FormRoot labelledBy="account-heading" onSubmit={onSubmit} noValidate>
        <Step num="01" title={copy.heading}>
          <Alert
            alertRef={s.alertRef}
            errors={s.errors}
            formError={s.formError}
            fields={[['email', emailId, copy.email]]}
            common={common}
          />
          <Fields>
            <TextField
              id={emailId}
              name="email"
              type="email"
              inputMode="email"
              label={copy.email}
              autoComplete="email"
              error={s.errors.email}
            />
          </Fields>
        </Step>
        <Step num="02" title={copy.submit}>
          <Send>
            <SubmitButton label={copy.submit} pending={s.pending} />
            <Pending text={s.pending ? common.sending : null} />
          </Send>
          <p className={styles.links}>
            <Link href={links.signIn}>{copy.back}</Link>
          </p>
        </Step>
      </FormRoot>
    </>
  )
}

// ── Reset password ──────────────────────────────────────────────────────────

export function ResetPasswordForm({
  token,
  copy,
  common,
  links,
}: {
  token: string
  copy: AccountCopy['reset']
  common: Common
  links: { signIn: string }
}) {
  const s = useFormState()
  const [done, setDone] = useState(false)
  const uid = useId().replaceAll(':', '')
  const passwordId = `${uid}-password`

  if (done) {
    return (
      <Done title={copy.doneTitle}>
        <p>{copy.doneBody}</p>
        <div className={styles.actions}>
          <ButtonLink href={links.signIn}>{copy.signInLink}</ButtonLink>
        </div>
      </Done>
    )
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const password = String(new FormData(event.currentTarget).get('password') ?? '')
    const errors: Errors = {}
    if (!password) errors.password = common.errors.required
    else if (password.length < MIN_PASSWORD) errors.password = common.errors.passwordShort
    s.setErrors(errors)
    s.setFormError(null)
    if (Object.keys(errors).length > 0) return

    s.setPending(true)
    const { error } = await authClient.resetPassword({ newPassword: password, token })
    s.setPending(false)
    if (error) s.setFormError(messageFor(error, common))
    else setDone(true)
  }

  return (
    <>
      <FormHead id="account-heading" title={copy.heading} />
      <FormRoot labelledBy="account-heading" onSubmit={onSubmit} noValidate>
        <Step num="01" title={copy.heading}>
          <Alert
            alertRef={s.alertRef}
            errors={s.errors}
            formError={s.formError}
            fields={[['password', passwordId, copy.password]]}
            common={common}
          />
          <Fields>
            <PasswordField
              id={passwordId}
              label={copy.password}
              hint={copy.passwordHint}
              autoComplete="new-password"
              error={s.errors.password}
              common={common}
            />
          </Fields>
        </Step>
        <Step num="02" title={copy.submit}>
          <Send>
            <SubmitButton label={copy.submit} pending={s.pending} />
            <Pending text={s.pending ? common.sending : null} />
          </Send>
        </Step>
      </FormRoot>
    </>
  )
}

// ── Signed in ───────────────────────────────────────────────────────────────

/** "Send the confirmation email again": a button with a live confirmation. */
export function ResendVerification({
  email,
  callbackURL,
  label,
  doneLabel,
  common,
}: {
  email: string
  callbackURL: string
  label: string
  doneLabel: string
  common: Common
}) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')

  async function resend() {
    setState('sending')
    const { error } = await authClient.sendVerificationEmail({ email, callbackURL })
    setState(error ? 'failed' : 'sent')
  }

  return (
    <div>
      <button type="button" className={styles.linkButton} onClick={resend} aria-disabled={state === 'sending'}>
        {label}
      </button>
      <p role="status">
        {state === 'sending' && common.sending}
        {state === 'sent' && doneLabel}
        {state === 'failed' && common.errors.generic}
      </p>
    </div>
  )
}

export function SignedInPanel({
  name,
  email,
  emailVerified,
  copy,
  common,
  links,
  signOutTo,
}: {
  name: string
  email: string
  emailVerified: boolean
  copy: AccountCopy['signedIn']
  common: Common
  links: { dashboard: string; verified: string }
  /** Where to land after signing out. */
  signOutTo: string
}) {
  const [pending, setPending] = useState(false)

  async function signOut() {
    setPending(true)
    await authClient.signOut()
    window.location.assign(signOutTo)
  }

  return (
    <div className={styles.panel}>
      <h2>{copy.heading}</h2>
      <p>{copy.as.replace('{name}', name).replace('{email}', email)}</p>
      <p>{emailVerified ? copy.verified : copy.unverified}</p>
      {!emailVerified && (
        <ResendVerification
          email={email}
          callbackURL={links.verified}
          label={copy.resend}
          doneLabel={copy.resent}
          common={common}
        />
      )}
      <div className={styles.actions}>
        <ButtonLink href={links.dashboard}>{copy.continue}</ButtonLink>
        <button type="button" className={styles.linkButton} onClick={signOut} aria-disabled={pending}>
          {copy.signOut}
        </button>
      </div>
    </div>
  )
}
