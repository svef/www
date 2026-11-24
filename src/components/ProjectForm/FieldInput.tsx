'use client'

import { useId } from 'react'
import type { Editability } from '@/lib/awards/editability'
import type { FieldDefinition } from '@/lib/awards/fields'
import type { Locale } from '@/lib/i18n'
import type { ProjectFormCopy } from './copy'
import styles from './ProjectForm.module.scss'

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
}

type Person = Record<string, unknown>
const str = (v: unknown) => (typeof v === 'string' ? v : '')

export function FieldInput(props: FieldInputProps) {
  const { field, locale, copy, locked, errors, forced } = props
  const seed = useId()
  const id = `f-${props.idSeed ?? field.key}-${seed.replace(/:/g, '')}`
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const disabled = props.readOnly || forced === true || locked !== undefined
  const described = [
    field.description || field.tooltip ? hintId : null,
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
            className={styles.input}
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
              className={styles.textarea}
              rows={5}
              value={str(props.value)}
              maxLength={field.maxLength}
              readOnly={disabled}
              onChange={(e) => props.onChange(e.target.value)}
            />
            {field.maxLength && (
              <p className={styles.counter}>{copy.characters(str(props.value).length, field.maxLength)}</p>
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
                  className={styles.input}
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
                    className={styles.small}
                    disabled={disabled}
                    onClick={() => props.onChange(rows.filter((_, j) => j !== i))}
                  >
                    {copy.remove}
                  </button>
                )}
              </li>
            ))}
            <li>
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
            <label>
              <span>{copy.startDate}</span>
              <input
                {...common}
                className={styles.input}
                type="date"
                value={range.start ?? ''}
                readOnly={disabled}
                onChange={(e) => props.onChange({ ...range, start: e.target.value })}
              />
            </label>
            <label>
              <span>{copy.endDate}</span>
              <input
                className={styles.input}
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
      case 'access_credentials': {
        const list = Array.isArray(props.value) ? (props.value as Person[]) : []
        const rows = list.length ? list : [{}]
        const set = (i: number, patch: Person) => {
          const next = rows.map((r) => ({ ...r }))
          next[i] = { ...next[i], ...patch }
          props.onChange(next)
        }
        return (
          <ul className={styles.rows} aria-describedby={described || undefined}>
            {rows.map((r, i) => (
              <li key={i} className={styles.group}>
                <label>
                  <span>{copy.loginValue}</span>
                  <textarea
                    id={i === 0 ? id : undefined}
                    className={styles.textarea}
                    rows={2}
                    value={str(r.value)}
                    readOnly={disabled}
                    onBlur={props.onBlur}
                    onChange={(e) => set(i, { value: e.target.value })}
                  />
                </label>
                <label>
                  <span>{copy.loginLabel}</span>
                  <input
                    className={styles.input}
                    type="text"
                    value={str(r.label)}
                    readOnly={disabled}
                    onBlur={props.onBlur}
                    onChange={(e) => set(i, { label: e.target.value })}
                  />
                </label>
                <label>
                  <span>{copy.loginNotes}</span>
                  <input
                    className={styles.input}
                    type="text"
                    value={str(r.notes)}
                    readOnly={disabled}
                    onBlur={props.onBlur}
                    onChange={(e) => set(i, { notes: e.target.value })}
                  />
                </label>
                {rows.length > 1 && (
                  <button
                    type="button"
                    className={styles.small}
                    disabled={disabled}
                    onClick={() => props.onChange(rows.filter((_, j) => j !== i))}
                  >
                    {copy.remove}
                  </button>
                )}
              </li>
            ))}
            <li>
              <button
                type="button"
                className={styles.small}
                disabled={disabled}
                onClick={() => props.onChange([...rows, {}])}
              >
                {copy.addLogin}
              </button>
            </li>
          </ul>
        )
      }
      case 'person_list': {
        const list = Array.isArray(props.value) ? (props.value as Person[]) : []
        const rows = list.length ? list : [{}]
        const items = Object.entries(field.item ?? {})
        const set = (i: number, patch: Person) => {
          const next = rows.map((r) => ({ ...r }))
          next[i] = { ...next[i], ...patch }
          props.onChange(next)
        }
        return (
          <ul className={styles.rows} aria-describedby={described || undefined}>
            {rows.map((p, i) => (
              <li key={i} className={styles.group}>
                {items.map(([name, def]) => (
                  <label key={name}>
                    <span>{def.label[locale]}</span>
                    <input
                      id={i === 0 && name === items[0][0] ? id : undefined}
                      className={styles.input}
                      type={def.type === 'email' ? 'email' : 'text'}
                      value={str(p[name])}
                      maxLength={def.maxLength}
                      readOnly={disabled}
                      onBlur={props.onBlur}
                      onChange={(e) => set(i, { [name]: e.target.value })}
                    />
                  </label>
                ))}
                {field.key === 'collaborators' && (
                  <label className={styles.check}>
                    <input
                      type="checkbox"
                      checked={p.canEdit === true}
                      disabled={disabled}
                      onChange={(e) => set(i, { canEdit: e.target.checked })}
                    />
                    <span>{copy.canEdit}</span>
                  </label>
                )}
                {rows.length > 1 && (
                  <button
                    type="button"
                    className={styles.small}
                    disabled={disabled}
                    onClick={() => props.onChange(rows.filter((_, j) => j !== i))}
                  >
                    {copy.remove}
                  </button>
                )}
              </li>
            ))}
            <li>
              <button
                type="button"
                className={styles.small}
                disabled={disabled}
                onClick={() => props.onChange([...rows, {}])}
              >
                {copy.addPerson}
              </button>
            </li>
          </ul>
        )
      }
      case 'image':
        return <p className={styles.later}>{copy.laterNote}</p>
    }
  })()

  const isToggle = field.type === 'boolean' || field.type === 'waiver'
  const multi = ['url_list', 'person_list', 'access_credentials', 'date_range'].includes(field.type)
  const whyLocked =
    locked &&
    (locked.reason === 'intake_closed' ? copy.whyLockedClosed : copy.whyLockedSubmitted)

  const Wrapper = multi ? 'fieldset' : 'div'
  return (
    <Wrapper className={styles.field} data-field={field.key} data-locked={locked ? '' : undefined}>
      {multi ? (
        <legend className={styles.label}>
          {label}
          {!field.required && <span className={styles.optional}> ({locale === 'en' ? 'optional' : 'valfrjálst'})</span>}
        </legend>
      ) : (
        !isToggle && (
          <label className={styles.label} htmlFor={id}>
            {label}
            {!field.required && (
              <span className={styles.optional}> ({locale === 'en' ? 'optional' : 'valfrjálst'})</span>
            )}
          </label>
        )
      )}
      {(field.description || field.tooltip) && (
        <p id={hintId} className={styles.hint}>
          {field.description?.[locale]}
          {field.tooltip && <> {field.tooltip[locale]}</>}
        </p>
      )}
      {control}
      {forced && <p className={styles.hint}>{copy.forcedOn}</p>}
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
