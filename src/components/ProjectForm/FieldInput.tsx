'use client'

import { Lock } from '@phosphor-icons/react'
import { useId } from 'react'
import { inputClass, textareaClass } from '@/components/FormParts/FormParts'
import type { Editability } from '@/lib/awards/editability'
import type { FieldDefinition } from '@/lib/awards/fields'
import type { Locale } from '@/lib/i18n'
import type { ProjectFormCopy } from './copy'
import { ImageUpload, type ImageBinding } from './ImageUpload'
import { InfoTip } from './InfoTip'
import { CredentialList, PersonList, type InviteProps } from './lists'
import styles from './ProjectForm.module.scss'

/** FormParts' underlined input and boxed textarea, plus the form's read-only look. */
export const controlClass = `${inputClass} ${styles.control}`
export const areaClass = `${textareaClass} ${styles.control}`

/**
 * One field, rendered generically from its definition: label, hint, control, error.
 * The state is the caller's (`value`/`onChange`); this knows nothing about saving or
 * locks, only whether it may be edited (`readOnly`) and why not (`locked`). A later
 * step replaces individual sections' rendering with richer controls; the contract
 * (value in, value out) stays.
 */
export type FieldInputProps = {
  field: FieldDefinition
  /** Overrides the field's own id seed, e.g. per-category entry fields. */
  idSeed?: string
  value: unknown
  onChange: (value: unknown) => void
  onBlur: () => void
  locale: Locale
  copy: ProjectFormCopy
  /** Nothing can be typed: someone else holds the lock, or the field is locked. */
  readOnly: boolean
  /** Set when the field itself is locked (not just the project), with the reason. */
  locked?: Extract<Editability, { editable: false }>
  /** Shown red; the caller decides when (after blur or a submit attempt). */
  errors: readonly string[]
  /** The value is forced by the categories; the toggle can't be changed. */
  forced?: boolean
  /** An open staff request asks for this field to be updated: highlighted. */
  requested?: boolean
  /** The collaborators list only: invitation states and "Resend invitation". */
  invite?: InviteProps
  /** The image field only: the upload actions and the current image. */
  imageUpload?: ImageBinding
}

const str = (v: unknown) => (typeof v === 'string' ? v : '')

export function FieldInput(props: FieldInputProps) {
  const { field, locale, copy, locked, errors, forced } = props
  const seed = useId()
  const id = `f-${props.idSeed ?? field.key}-${seed.replace(/:/g, '')}`
  const hintId = `${id}-hint`
  const tipId = `${id}-tip`
  const forcedId = `${id}-forced`
  const errorId = `${id}-error`
  const disabled = props.readOnly || forced === true || locked !== undefined
  const described = [
    field.description ? hintId : null,
    field.tooltip ? tipId : null,
    forced ? forcedId : null,
    errors.length ? errorId : null,
  ]
    .filter(Boolean)
    .join(' ')

  const common = {
    id,
    'aria-describedby': described || undefined,
    'aria-invalid': errors.length ? true : undefined,
    onBlur: props.onBlur,
  }
  const label = field.label[locale]

  const control = (() => {
    switch (field.type) {
      case 'short_text':
      case 'url':
        return (
          <input
            {...common}
            className={controlClass}
            type={field.type === 'url' ? 'url' : 'text'}
            value={str(props.value)}
            maxLength={field.maxLength}
            readOnly={disabled}
            onChange={(e) => props.onChange(e.target.value)}
          />
        )
      case 'long_text':
        return (
          <>
            <textarea
              {...common}
              className={areaClass}
              rows={5}
              value={str(props.value)}
              maxLength={field.maxLength}
              readOnly={disabled}
              onChange={(e) => props.onChange(e.target.value)}
            />
            {field.maxLength && (
              <p className={styles.counter}>
                {copy.characters(str(props.value).length, field.maxLength)}
              </p>
            )}
          </>
        )
      case 'boolean':
      case 'waiver':
        return (
          <label className={styles.check}>
            <input
              {...common}
              type="checkbox"
              checked={props.value === true}
              disabled={disabled}
              onChange={(e) => props.onChange(e.target.checked)}
            />
            <span>{label}</span>
          </label>
        )
      case 'url_list': {
        const list = Array.isArray(props.value) ? (props.value as string[]) : []
        const rows = list.length ? list : ['']
        return (
          <ul className={styles.rows} aria-describedby={described || undefined}>
            {rows.map((v, i) => (
              <li key={i} className={styles.row}>
                <input
                  id={i === 0 ? id : `${id}-${i}`}
                  className={controlClass}
                  type="url"
                  aria-label={`${label} ${i + 1}`}
                  value={v}
                  readOnly={disabled}
                  onBlur={props.onBlur}
                  onChange={(e) => {
                    const next = [...rows]
                    next[i] = e.target.value
                    props.onChange(next)
                  }}
                />
                {rows.length > 1 && (
                  <button
                    type="button"
                    className={`${styles.small} ${styles.danger}`}
                    disabled={disabled}
                    onClick={() => props.onChange(rows.filter((_, j) => j !== i))}
                  >
                    {copy.remove}
                  </button>
                )}
              </li>
            ))}
            <li className={styles.addRow}>
              <button
                type="button"
                className={styles.small}
                disabled={disabled}
                onClick={() => props.onChange([...rows, ''])}
              >
                {copy.addLink}
              </button>
            </li>
          </ul>
        )
      }
      case 'date_range': {
        const range = (props.value ?? {}) as { start?: string; end?: string }
        return (
          <div className={styles.dates}>
            <label className={styles.rowField}>
              <span>{copy.startDate}</span>
              <input
                {...common}
                className={controlClass}
                type="date"
                value={range.start ?? ''}
                readOnly={disabled}
                onChange={(e) => props.onChange({ ...range, start: e.target.value })}
              />
            </label>
            <label className={styles.rowField}>
              <span>{copy.endDate}</span>
              <input
                className={controlClass}
                type="date"
                value={range.end ?? ''}
                readOnly={disabled}
                onBlur={props.onBlur}
                onChange={(e) => props.onChange({ ...range, end: e.target.value })}
              />
            </label>
          </div>
        )
      }
      case 'access_credentials':
        return (
          <CredentialList
            field={field}
            id={id}
            describedBy={described || undefined}
            value={props.value}
            onChange={props.onChange}
            onBlur={props.onBlur}
            disabled={disabled}
            copy={copy}
            locale={locale}
          />
        )
      case 'person_list':
        return (
          <PersonList
            field={field as FieldDefinition & { key: 'owners' | 'collaborators' }}
            invite={field.key === 'collaborators' ? props.invite : undefined}
            id={id}
            describedBy={described || undefined}
            value={props.value}
            onChange={props.onChange}
            onBlur={props.onBlur}
            disabled={disabled}
            copy={copy}
            locale={locale}
          />
        )
      case 'image':
        return props.imageUpload ? (
          <ImageUpload
            field={field}
            idBase={id}
            copy={copy}
            locale={locale}
            describedBy={described || undefined}
            disabled={disabled}
            binding={props.imageUpload}
          />
        ) : null
    }
  })()

  const isToggle = field.type === 'boolean' || field.type === 'waiver'
  const multi = ['url_list', 'person_list', 'access_credentials', 'date_range'].includes(field.type)
  const whyLocked =
    locked && (locked.reason === 'intake_closed' ? copy.whyLockedClosed : copy.whyLockedSubmitted)

  const Wrapper = multi ? 'fieldset' : 'div'
  const optional = !field.required && (
    <span className={styles.optional}> ({locale === 'en' ? 'optional' : 'valfrjálst'})</span>
  )
  const tip = field.tooltip && (
    <InfoTip id={tipId} label={copy.moreInfo}>
      {field.tooltip[locale]}
    </InfoTip>
  )
  return (
    <Wrapper
      id={`field-${field.key}`}
      className={styles.field}
      data-field={field.key}
      data-locked={locked ? '' : undefined}
      data-requested={props.requested ? '' : undefined}
    >
      {multi ? (
        <legend className={styles.label}>
          {label}
          {optional}
          {tip}
        </legend>
      ) : (
        !isToggle && (
          <span className={styles.labelRow}>
            <label className={styles.label} htmlFor={id}>
              {label}
              {optional}
            </label>
            {tip}
          </span>
        )
      )}
      {field.description && (
        <p id={hintId} className={styles.hint}>
          {field.description[locale]}
        </p>
      )}
      {isToggle && tip}
      {control}
      {forced && (
        <p id={forcedId} className={styles.forced}>
          <Lock aria-hidden="true" weight="bold" /> {copy.forcedOn}
        </p>
      )}
      {errors.length > 0 && (
        <p id={errorId} className={styles.error}>
          {errors.join(' ')}
        </p>
      )}
      {whyLocked && (
        <details className={styles.why}>
          <summary>{copy.whyLocked}</summary>
          <p>{whyLocked}</p>
        </details>
      )}
    </Wrapper>
  )
}
