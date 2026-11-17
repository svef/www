import type { FormEventHandler, ReactNode, Ref } from 'react'
import type { Dictionary } from '@/lib/i18n'
import { GrowText } from '@/components/GrowText/GrowText'
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

/** The form's heading (an `h2`, under the page's `h1`) with its standfirst. */
export function FormHead({
  id,
  title,
  intro,
  children,
}: {
  id: string
  title: string
  intro?: string
  /** Anything beside the heading, e.g. the contact page's address and socials. */
  children?: ReactNode
}) {
  return (
    <div className={styles.head}>
      {children ?? (
        <>
          <h2 id={id}>{title}</h2>
          {intro && <p>{intro}</p>}
        </>
      )}
    </div>
  )
}

/** The `<form>` itself: the steps are its children. */
export function FormRoot({
  labelledBy,
  label,
  action,
  onSubmit,
  noValidate,
  children,
}: {
  labelledBy?: string
  label?: string
  action?: (formData: FormData) => void
  onSubmit?: FormEventHandler<HTMLFormElement>
  /** The server validates and reports errors; the browser's own bubbles stay out of the way. */
  noValidate?: boolean
  children: ReactNode
}) {
  return (
    <form
      className={styles.form}
      aria-labelledby={labelledBy}
      aria-label={label}
      action={action}
      onSubmit={onSubmit}
      noValidate={noValidate}
    >
      {children}
    </form>
  )
}

/**
 * One numbered step of a form. The title is the step's `h3`; pass `labelFor` to make it
 * the label of the single control the step holds (the message box), or `titleId` to name a
 * group of chips with it.
 */
export function Step({
  num,
  title,
  titleId,
  labelFor,
  optionalText,
  hint,
  hintId,
  children,
}: {
  num: string
  title: string
  titleId?: string
  labelFor?: string
  optionalText?: string
  hint?: string
  hintId?: string
  children: ReactNode
}) {
  return (
    <div className={styles.step}>
      <span className={styles.num} aria-hidden="true">
        {num}
      </span>
      <h3 className={styles.stepTitle} id={titleId}>
        {labelFor ? <label htmlFor={labelFor}>{title}</label> : title}
        {optionalText && <span className={styles.stepOptional}> ({optionalText})</span>}
      </h3>
      {hint && (
        <p id={hintId} className={`${styles.hint} ${styles.stepHint}`}>
          {hint}
        </p>
      )}
      {children}
    </div>
  )
}

/** The two-column grid a step's short fields sit in. */
export function Fields({ children }: { children: ReactNode }) {
  return <div className={styles.fields}>{children}</div>
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
  wide,
  children,
}: {
  id: string
  /** Left out when the step's title is the label (see `Step`'s `labelFor`). */
  label?: string
  hint?: string
  hintId?: string
  /** Shown beside the label, e.g. "optional". */
  optionalText?: string
  error?: string
  /** Spans both columns of a `Fields` grid. */
  wide?: boolean
  children: ReactNode
}) {
  return (
    <div className={wide ? `${styles.field} ${styles.wide}` : styles.field}>
      {label && (
        <label htmlFor={id} className={styles.label}>
          {label}
          {optionalText && <span className={styles.optional}> ({optionalText})</span>}
        </label>
      )}
      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {children}
      {error && <FieldError id={`${id}-error`} message={error} />}
    </div>
  )
}

export function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <p id={id} className={styles.error}>
      {message}
    </p>
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

/** Class names for the controls, so each form wires its own state to them. */
export const inputClass = styles.input
export const textareaClass = `${styles.input} ${styles.textarea}`

/**
 * A group of chips: radios (`radiogroup`) or checkboxes (`group`), named by the step's
 * title and described by its hint and error.
 */
export function Chips({
  role,
  labelledBy,
  describedBy,
  invalid,
  children,
}: {
  role: 'radiogroup' | 'group'
  labelledBy: string
  describedBy?: string
  invalid?: boolean
  children: ReactNode
}) {
  return (
    <div
      className={styles.chips}
      role={role}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-invalid={invalid ? true : undefined}
    >
      {children}
    </div>
  )
}

export function Chip({
  id,
  type,
  name,
  value,
  label,
  checked,
  invalid,
  onChange,
}: {
  id: string
  type: 'radio' | 'checkbox'
  name: string
  value: string
  label: string
  checked: boolean
  invalid?: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className={styles.chip}>
      <input
        id={id}
        type={type}
        name={name}
        value={value}
        className={styles.chipInput}
        checked={checked}
        aria-invalid={invalid ? true : undefined}
        onChange={(e) => onChange(e.target.checked)}
      />
      <label htmlFor={id} className={styles.chipLabel}>
        <span className={styles.chipText} data-text={label}>
          {label}
        </span>
      </label>
    </div>
  )
}

/** Indented under a chip group, for a field that only matters once a chip is chosen. */
export function Reveal({ children }: { children: ReactNode }) {
  return <div className={styles.other}>{children}</div>
}

/** The submit step's body: the button and the live region beside it. */
export function Send({ children }: { children: ReactNode }) {
  return (
    <div className={styles.send}>
      <div className={styles.actions}>{children}</div>
    </div>
  )
}

export function SubmitButton({ label, pending }: { label: string; pending: boolean }) {
  return (
    <button
      type="submit"
      className={`btn-grow ${styles.submit}`}
      aria-disabled={pending}
      onClick={(e) => {
        if (pending) e.preventDefault()
      }}
    >
      <GrowText>{label}</GrowText>
    </button>
  )
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
  body?: string
  successRef: Ref<HTMLDivElement>
}) {
  return (
    <div ref={successRef} className={styles.success} role="status" tabIndex={-1}>
      <h2 className={styles.successTitle}>{title}</h2>
      {body && <p>{body}</p>}
    </div>
  )
}
