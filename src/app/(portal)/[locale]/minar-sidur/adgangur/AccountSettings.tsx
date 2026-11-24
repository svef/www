'use client'

import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import {
  Field,
  Fields,
  FormRoot,
  Pending,
  Send,
  Step,
  SubmitButton,
  describe,
  inputClass,
} from '@/components/FormParts/FormParts'
import { authClient } from '@/lib/awards/auth/client'
import type { AccountSettingsCopy } from './copy'
import { updateProfileAction } from './actions'
import styles from './account.module.scss'

type Errors = Record<string, string>

/** The alert above a form: a summary of what to fix, focused when it appears. */
function Problems({
  errors,
  formError,
  fields,
  copy,
}: {
  errors: Errors
  formError: string | null
  fields: [name: string, id: string, label: string][]
  copy: AccountSettingsCopy
}) {
  const ref = useRef<HTMLDivElement>(null)
  const items = fields.filter(([name]) => errors[name])
  const show = items.length > 0 || !!formError
  useEffect(() => {
    if (show) ref.current?.focus()
  }, [show, errors, formError])
  if (!show) return null
  return (
    <div ref={ref} className={styles.alert} role="alert" tabIndex={-1}>
      <p>{copy.errorSummary}</p>
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

/** Name, phone and email language: saved through a server action on the user's own row. */
export function ProfileForm({
  copy: c,
  initial,
}: {
  copy: AccountSettingsCopy
  initial: { name: string; phone: string; preferredLocale: 'is' | 'en' }
}) {
  const router = useRouter()
  const uid = useId().replaceAll(':', '')
  const ids = { name: `${uid}-name`, phone: `${uid}-phone`, lang: `${uid}-lang` }
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [saved, setSaved] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const data = new FormData(event.currentTarget)
    const input = {
      name: String(data.get('name') ?? ''),
      phone: String(data.get('phone') ?? ''),
      preferredLocale: String(data.get('preferredLocale') ?? ''),
    }
    setSaved(false)
    setFormError(null)
    if (!input.name.trim()) {
      setErrors({ name: c.errors.required })
      return
    }
    setPending(true)
    try {
      const result = await updateProfileAction(input)
      if (result.ok) {
        setErrors({})
        setSaved(true)
        router.refresh()
      } else if (result.signedOut) {
        setFormError(c.errors.session)
      } else {
        const out: Errors = {}
        for (const [k, v] of Object.entries(result.errors ?? {})) if (v) out[k] = c.errors[v]
        setErrors(out)
      }
    } catch {
      setFormError(c.errors.generic)
    } finally {
      setPending(false)
    }
  }

  return (
    <FormRoot labelledBy="account-profile" onSubmit={onSubmit} noValidate>
      <Problems
        errors={errors}
        formError={formError}
        fields={[
          ['name', ids.name, c.name],
          ['phone', ids.phone, c.phone],
        ]}
        copy={c}
      />
      <Step num="01" title={c.stepAbout}>
        <Fields>
          <Field id={ids.name} label={c.name} error={errors.name}>
            <input
              id={ids.name}
              name="name"
              autoComplete="name"
              defaultValue={initial.name}
              className={inputClass}
              maxLength={200}
              {...describe(ids.name, errors.name)}
            />
          </Field>
          <Field
            id={ids.phone}
            label={c.phone}
            optionalText={c.optional}
            hint={c.phoneHint}
            hintId={`${ids.phone}-hint`}
            error={errors.phone}
          >
            <input
              id={ids.phone}
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              defaultValue={initial.phone}
              className={inputClass}
              {...describe(ids.phone, errors.phone, `${ids.phone}-hint`)}
            />
          </Field>
          <Field id={ids.lang} label={c.language} hint={c.languageHint} hintId={`${ids.lang}-hint`} wide>
            <select
              id={ids.lang}
              name="preferredLocale"
              defaultValue={initial.preferredLocale}
              className={`${inputClass} ${styles.select}`}
              aria-describedby={`${ids.lang}-hint`}
            >
              <option value="is">{c.languages.is}</option>
              <option value="en">{c.languages.en}</option>
            </select>
          </Field>
        </Fields>
      </Step>
      <Step num="02" title={c.save}>
        <Send>
          <SubmitButton label={c.save} pending={pending} />
          <Pending text={pending ? c.saving : saved ? c.saved : null} />
        </Send>
      </Step>
    </FormRoot>
  )
}

function PasswordInput({
  id,
  name,
  label,
  hint,
  autoComplete,
  error,
  copy: c,
}: {
  id: string
  name: string
  label: string
  hint?: string
  autoComplete: 'current-password' | 'new-password'
  error?: string
  copy: AccountSettingsCopy
}) {
  const [shown, setShown] = useState(false)
  const hintId = hint ? `${id}-hint` : undefined
  return (
    <Field id={id} label={label} hint={hint} hintId={hintId} error={error} wide>
      <div className={styles.passwordWrap}>
        <input
          id={id}
          name={name}
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
          {shown ? c.hidePassword : c.showPassword}
        </button>
      </div>
    </Field>
  )
}

/**
 * Changing the password goes through Better Auth from the browser, so the new session cookie
 * it issues (other sessions are revoked) is set where it belongs.
 */
export function PasswordForm({ copy: c }: { copy: AccountSettingsCopy }) {
  const uid = useId().replaceAll(':', '')
  const ids = { current: `${uid}-current`, next: `${uid}-next` }
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const form = event.currentTarget
    const data = new FormData(form)
    const currentPassword = String(data.get('currentPassword') ?? '')
    const newPassword = String(data.get('newPassword') ?? '')
    const out: Errors = {}
    if (!currentPassword) out.currentPassword = c.errors.required
    if (!newPassword) out.newPassword = c.errors.required
    else if (newPassword.length < 10) out.newPassword = c.errors.passwordShort
    else if (newPassword === currentPassword) out.newPassword = c.errors.passwordSame
    setErrors(out)
    setFormError(null)
    setDone(false)
    if (Object.keys(out).length > 0) return

    setPending(true)
    const { error } = await authClient
      .changePassword({ currentPassword, newPassword, revokeOtherSessions: true })
      .catch(() => ({ error: { status: 0, code: undefined } as { status?: number; code?: string } }))
    setPending(false)
    if (!error) {
      form.reset()
      setDone(true)
      return
    }
    if (error.status === 429) setFormError(c.errors.tooMany)
    else if (error.status === 401) setFormError(c.errors.session)
    else if (error.code === 'INVALID_PASSWORD') setErrors({ currentPassword: c.errors.currentWrong })
    else if (error.code === 'PASSWORD_TOO_SHORT') setErrors({ newPassword: c.errors.passwordShort })
    else setFormError(c.errors.generic)
  }

  return (
    <FormRoot labelledBy="account-password" onSubmit={onSubmit} noValidate>
      <Problems
        errors={errors}
        formError={formError}
        fields={[
          ['currentPassword', ids.current, c.currentPassword],
          ['newPassword', ids.next, c.newPassword],
        ]}
        copy={c}
      />
      <Step num="01" title={c.stepPassword}>
        <Fields>
          <PasswordInput
            id={ids.current}
            name="currentPassword"
            label={c.currentPassword}
            autoComplete="current-password"
            error={errors.currentPassword}
            copy={c}
          />
          <PasswordInput
            id={ids.next}
            name="newPassword"
            label={c.newPassword}
            hint={c.newPasswordHint}
            autoComplete="new-password"
            error={errors.newPassword}
            copy={c}
          />
        </Fields>
      </Step>
      <Step num="02" title={c.changePassword}>
        <Send>
          <SubmitButton label={c.changePassword} pending={pending} />
          <Pending text={pending ? c.changing : done ? c.changed : null} />
        </Send>
      </Step>
    </FormRoot>
  )
}

export function SignOutButton({ copy: c, to }: { copy: AccountSettingsCopy; to: string }) {
  const [pending, setPending] = useState(false)
  return (
    <button
      type="button"
      className={`btn-grow ${styles.secondary}`}
      aria-disabled={pending}
      onClick={async () => {
        if (pending) return
        setPending(true)
        await authClient.signOut().catch(() => undefined)
        document.cookie = 'awards-test-user=; Max-Age=0; path=/'
        window.location.assign(to)
      }}
    >
      {c.signOut}
    </button>
  )
}
