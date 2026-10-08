import type { ReactNode, Ref } from 'react'
import type { Dictionary } from '@/lib/i18n'
import styles from './FormParts.module.scss'

export type FormsCopy = Dictionary['forms']
type ErrorKey = Exclude<keyof FormsCopy['errors'], 'summary'>

/** Looks an error key up in the dictionary; an unknown key reads as "invalid". */
export function errorMessage(copy: FormsCopy, key: string | undefined): string | undefined {
  if (!key) return undefined
  const known = copy.errors as Record<string, string>
  return key !== 'summary' && key in known ? known[key as ErrorKey] : copy.errors.invalid
}

/**
 * The anti-bot field. Kept out of sight with CSS positioning, not `display:none`,
 * so naive bots still see an ordinary text input. Hidden from assistive tech with
 * `aria-hidden` and out of the tab order with `tabIndex={-1}`.
 */
export function Honeypot() {
  return (
    <div className={styles.honeypot} aria-hidden="true">
      <label>
        Leave this field empty
        <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  )
}

export function ErrorSummary({
  copy,
  errors,
  labels,
  summaryRef,
}: {
  copy: FormsCopy
  errors: Record<string, string>
  /** Visible label per field name, in display order. */
  labels: Array<[field: string, id: string, label: string]>
  summaryRef: Ref<HTMLDivElement>
}) {
  const items = labels.filter(([field]) => errors[field])
  return (
    <div ref={summaryRef} className={styles.summary} role="alert" tabIndex={-1}>
      <p className={styles.summaryTitle}>{copy.errors.summary}</p>
      <ul>
        {items.map(([field, id, label]) => (
          <li key={field}>
            <a href={`#${id}`}>
              {label}: {errorMessage(copy, errors[field])}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Field({
  id,
  label,
  hint,
  hintId,
  optionalText,
  error,
  children,
}: {
  id: string
  label: string
  hint?: string
  hintId?: string
  /** Shown beside the label, e.g. "optional". */
  optionalText?: string
  error?: string
  children: ReactNode
}) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {optionalText && <span className={styles.optional}> ({optionalText})</span>}
      </label>
      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p id={`${id}-error`} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  )
}

/** `aria-describedby` / `aria-invalid` for a control with an optional hint and error. */
export function describe(id: string, error: string | undefined, hintId?: string) {
  const ids = [hintId, error ? `${id}-error` : undefined].filter(Boolean).join(' ')
  return {
    'aria-invalid': error ? (true as const) : undefined,
    'aria-describedby': ids || undefined,
  }
}

/**
 * Live region for the pending state. Always mounted, because a region that
 * appears together with its text is not reliably announced; the text is what
 * changes.
 */
export function Pending({ text }: { text: string | null }) {
  return (
    <span className={styles.pending} role="status">
      {text}
    </span>
  )
}

export function Success({
  title,
  body,
  successRef,
}: {
  title: string
  body: string
  successRef: Ref<HTMLDivElement>
}) {
  return (
    <div ref={successRef} className={styles.success} role="status" tabIndex={-1}>
      <h2 className={styles.successTitle}>{title}</h2>
      <p>{body}</p>
    </div>
  )
}
