'use client'

import { ArrowDown, ArrowUp } from '@phosphor-icons/react'
import { useEffect, useId, useRef, useState } from 'react'
import type { FieldDefinition } from '@/lib/awards/fields'
import type { InviteState } from '@/lib/awards/invitations/types'
import type { Locale } from '@/lib/i18n'
import type { ProjectFormCopy } from './copy'
import { areaClass, controlClass } from './FieldInput'
import styles from './ProjectForm.module.scss'
import { formatDate } from '@/lib/locale-format'

type Row = Record<string, unknown>
const str = (v: unknown) => (typeof v === 'string' ? v : '')

type ListProps = {
  /** The id the first control takes, so the field's label and errors can point at it. */
  id: string
  describedBy?: string
  value: unknown
  onChange: (value: unknown) => void
  onBlur: () => void
  disabled: boolean
  copy: ProjectFormCopy
  locale: Locale
}

/** The invitation side of the collaborators list; absent for owners. */
export type InviteProps = {
  invites: readonly InviteState[]
  notice: {
    kind: 'sent' | 'failed' | 'refused'
    personId?: string
    message?: string
  } | null
  onResend: (personId: string) => void
}

const dateOf = (iso: string | null, locale: Locale) =>
  iso
    ? formatDate(iso, locale)
    : ''

const sameEmail = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

/**
 * Owners and collaborators: rows of a few text inputs, added, removed and reordered with
 * buttons (no drag and drop, so a keyboard and a screen reader do everything a mouse does).
 * Each row is a fieldset named "Owner 2"; the buttons name the row they act on; a move is
 * announced in a polite live region, and focus stays on the button that was used.
 */
export function PersonList({
  field,
  invite,
  ...p
}: ListProps & {
  field: FieldDefinition & { key: 'owners' | 'collaborators' }
  invite?: InviteProps
}) {
  const { copy, locale, disabled } = p
  const list = Array.isArray(p.value) ? (p.value as Row[]) : []
  // An owner is required, so one empty row is always there to fill in.
  const minRows = field.required ? Math.max(1, field.minItems ?? 1) : 0
  const rows: Row[] =
    list.length >= minRows
      ? list
      : [...list, ...Array.from({ length: minRows - list.length }, (): Row => ({}))]
  const items = Object.entries(field.item ?? {})
  const rowLabel = copy.rowLabel[field.key]
  const [announcement, setAnnouncement] = useState('')
  // Rows whose email has been left: the "email needed" note turns red for those.
  const [emailLeft, setEmailLeft] = useState<ReadonlySet<number>>(new Set())
  // An editor's email is kept here while it is being typed and saved when the field is left:
  // saving it sends an invitation, and a half-typed address must not get one.
  const [emailDrafts, setEmailDrafts] = useState<Readonly<Record<number, string>>>({})
  const focusAfter = useRef<{ row: number; control: string } | null>(null)
  const root = useRef<HTMLUListElement>(null)

  useEffect(() => {
    const target = focusAfter.current
    if (!target) return
    focusAfter.current = null
    const el = root.current?.querySelector<HTMLElement>(
      `[data-row="${target.row}"] [data-control="${target.control}"]:not(:disabled)`,
    )
    el?.focus()
  })

  const set = (i: number, patch: Row) => {
    const next = rows.map((r) => ({ ...r }))
    next[i] = { ...next[i], ...patch }
    p.onChange(next)
  }
  const move = (i: number, delta: -1 | 1) => {
    const j = i + delta
    const next = rows.map((r) => ({ ...r }))
    ;[next[i], next[j]] = [next[j], next[i]]
    focusAfter.current = { row: j, control: delta < 0 ? 'up' : 'down' }
    // At the edge the same button is disabled: fall back to its partner.
    if (j === 0 && delta < 0) focusAfter.current.control = 'down'
    if (j === rows.length - 1 && delta > 0) focusAfter.current.control = 'up'
    setAnnouncement(copy.moved(str(next[j].name) || rowLabel(j + 1), j + 1, rows.length))
    p.onChange(next)
  }
  const remove = (i: number) => {
    focusAfter.current = { row: Math.max(0, i - 1), control: 'remove' }
    p.onChange(rows.filter((_, j) => j !== i))
  }
  const add = () => {
    focusAfter.current = { row: rows.length, control: 'first' }
    p.onChange([...rows, {}])
  }

  const noticed = invite?.notice?.personId
  const noticedRow = rows.find((_, j) => invite?.invites[j]?.personId === noticed)
  const noticeWho = str(noticedRow?.name).trim() || str(noticedRow?.email).trim()

  return (
    <>
      <ul className={styles.rows} ref={root} aria-describedby={p.describedBy}>
        {rows.map((person, i) => {
          const label = rowLabel(i + 1)
          const needsEmail =
            field.key === 'collaborators' &&
            person.canEdit === true &&
            !(emailDrafts[i] ?? str(person.email)).trim()
          const emailHint = `${p.id}-${i}-email-hint`
          const inviteHint = `${p.id}-invite-hint`
          const email = (emailDrafts[i] ?? str(person.email)).trim()
          const state = invite?.invites[i]
          // What the server knows, unless the row was changed since (a new email is a new invitation).
          const known = state && state.state !== 'none' && sameEmail(state.email, email) ? state : null
          const who = str(person.name).trim() || email
          return (
            <li key={i} data-row={i}>
              <fieldset className={styles.group}>
                <legend className={styles.rowLegend}>{label}</legend>
                <div className={styles.rowFields}>
                  {items.map(([name, def], k) => (
                    <label key={name} className={styles.rowField}>
                      <span>{def.label[locale]}</span>
                      <input
                        id={i === 0 && k === 0 ? p.id : undefined}
                        data-control={k === 0 ? 'first' : undefined}
                        className={controlClass}
                        type={def.type === 'email' ? 'email' : 'text'}
                        value={
                          name === 'email'
                            ? (emailDrafts[i] ?? str(person[name]))
                            : str(person[name])
                        }
                        maxLength={def.maxLength}
                        readOnly={disabled}
                        autoComplete="off"
                        aria-describedby={
                          name === 'email' && needsEmail ? emailHint : undefined
                        }
                        onBlur={() => {
                          if (name === 'email') {
                            setEmailLeft((s) => new Set(s).add(i))
                            const draft = emailDrafts[i]
                            if (draft !== undefined) {
                              setEmailDrafts(({ [i]: _, ...rest }) => rest)
                              set(i, { email: draft })
                            }
                          }
                          p.onBlur()
                        }}
                        onChange={(e) => {
                          const holdBack =
                            name === 'email' &&
                            field.key === 'collaborators' &&
                            person.canEdit === true
                          if (holdBack)
                            setEmailDrafts((d) => ({ ...d, [i]: e.target.value }))
                          else set(i, { [name]: e.target.value })
                        }}
                      />
                    </label>
                  ))}
                </div>
                {field.key === 'collaborators' && (
                  <>
                    <label className={styles.check}>
                      <input
                        type="checkbox"
                        checked={person.canEdit === true}
                        disabled={disabled}
                        aria-describedby={inviteHint}
                        onChange={(e) => {
                          const draft = emailDrafts[i]
                          if (draft !== undefined) setEmailDrafts(({ [i]: _, ...rest }) => rest)
                          set(i, {
                            canEdit: e.target.checked,
                            ...(draft !== undefined ? { email: draft } : {}),
                          })
                        }}
                      />
                      <span>{copy.canEdit}</span>
                    </label>
                    {needsEmail && (
                      <p id={emailHint} className={emailLeft.has(i) ? styles.error : styles.hint}>
                        {copy.emailForEdit}
                      </p>
                    )}
                    {person.canEdit === true && email && (
                      <div className={styles.invite} data-invite={known?.state ?? 'pending'}>
                        <p className={styles.hint}>
                          {known?.state === 'accepted'
                            ? copy.inviteAccepted(dateOf(known.acceptedAt, locale))
                            : known?.state === 'expired'
                              ? copy.inviteExpired(dateOf(known.invitedAt, locale))
                              : known?.state === 'invited'
                                ? copy.inviteInvited(dateOf(known.invitedAt, locale))
                                : copy.inviteWillSend}
                        </p>
                        {known && known.state !== 'accepted' && invite && (
                          <button
                            type="button"
                            className={styles.small}
                            data-control="resend"
                            disabled={disabled}
                            aria-label={copy.inviteResendFor(who)}
                            onClick={() => invite.onResend(known.personId)}
                          >
                            {copy.inviteResend}
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
                <div className={styles.rowActions}>
                  {rows.length > 1 && (
                    <>
                      <button
                        type="button"
                        className={styles.small}
                        data-control="up"
                        disabled={disabled || i === 0}
                        aria-label={copy.moveUp(label)}
                        onClick={() => move(i, -1)}
                      >
                        <ArrowUp aria-hidden="true" weight="bold" />
                      </button>
                      <button
                        type="button"
                        className={styles.small}
                        data-control="down"
                        disabled={disabled || i === rows.length - 1}
                        aria-label={copy.moveDown(label)}
                        onClick={() => move(i, 1)}
                      >
                        <ArrowDown aria-hidden="true" weight="bold" />
                      </button>
                    </>
                  )}
                  {rows.length > minRows && (
                    <button
                      type="button"
                      className={`${styles.small} ${styles.danger}`}
                      data-control="remove"
                      disabled={disabled}
                      aria-label={copy.removeRow(label)}
                      onClick={() => remove(i)}
                    >
                      {copy.remove}
                    </button>
                  )}
                </div>
              </fieldset>
            </li>
          )
        })}
      </ul>
      <div className={styles.addRow}>
        <button type="button" className={styles.small} disabled={disabled} onClick={add}>
          {copy.addRow[field.key]}
        </button>
      </div>
      {field.key === 'collaborators' && (
        <p id={`${p.id}-invite-hint`} className={styles.hint}>
          {copy.canEditHint}
        </p>
      )}
      <p className={styles.srOnly} role="status" aria-live="polite">
        {announcement}
      </p>
      {invite?.notice && (
        <p
          className={invite.notice.kind === 'sent' ? styles.hint : styles.error}
          role={invite.notice.kind === 'sent' ? 'status' : 'alert'}
        >
          {invite.notice.kind === 'sent'
            ? copy.inviteSentNotice(noticeWho)
            : invite.notice.kind === 'failed'
              ? copy.inviteFailedNotice
              : (invite.notice.message ?? copy.inviteFailedNotice)}
        </p>
      )}
    </>
  )
}

/**
 * Login details: any number of credentials, each a label, the account or instructions,
 * and notes. The values are encrypted when saved; the inputs ask the browser not to
 * remember them. A value that was already saved shows masked, as a read-only password
 * field, until "Show" is pressed, so it is not on screen by default.
 */
export function CredentialList({ field, ...p }: ListProps & { field: FieldDefinition }) {
  const { copy, disabled } = p
  const list = Array.isArray(p.value) ? (p.value as Row[]) : []
  const rows: Row[] = list.length ? list : [{}]
  const root = useRef<HTMLUListElement>(null)
  const focusLast = useRef(false)
  const baseId = useId()
  // Masked per row; rows saved with a value start masked, new rows start shown.
  const [masked, setMasked] = useState<boolean[]>(() => rows.map((r) => str(r.value) !== ''))
  const setRowMasked = (i: number, m: boolean) =>
    setMasked((all) => {
      const next = [...all]
      next[i] = m
      return next
    })
  useEffect(() => {
    if (!focusLast.current) return
    focusLast.current = false
    const all = root.current?.querySelectorAll<HTMLElement>('[data-control="first"]')
    all?.[all.length - 1]?.focus()
  })
  const set = (i: number, patch: Row) => {
    const next = rows.map((r) => ({ ...r }))
    next[i] = { ...next[i], ...patch }
    p.onChange(next)
  }
  return (
    <>
      <ul className={styles.rows} ref={root} aria-describedby={p.describedBy}>
        {rows.map((r, i) => {
          const label = `${field.label[p.locale]} ${i + 1}`
          return (
            <li key={i}>
              <fieldset className={styles.group}>
                <legend className={styles.rowLegend}>{label}</legend>
                <div className={styles.rowFields}>
                  <label className={styles.rowField}>
                    <span>{copy.loginLabel}</span>
                    <input
                      data-control="first"
                      className={controlClass}
                      type="text"
                      autoComplete="off"
                      value={str(r.label)}
                      readOnly={disabled}
                      onBlur={p.onBlur}
                      onChange={(e) => set(i, { label: e.target.value })}
                    />
                  </label>
                  {(() => {
                    const valueId = i === 0 && p.id ? p.id : `${baseId}-value-${i}`
                    const isMasked = Boolean(masked[i]) && str(r.value) !== ''
                    return (
                      <div className={`${styles.rowField} ${styles.wide}`}>
                        <div className={styles.labelRow}>
                          <label htmlFor={valueId}>{copy.loginValue}</label>
                          {str(r.value) !== '' && (
                            <button
                              type="button"
                              className={styles.small}
                              aria-controls={valueId}
                              aria-label={
                                isMasked
                                  ? copy.loginShowLabel(label)
                                  : copy.loginHideLabel(label)
                              }
                              onClick={() => setRowMasked(i, !isMasked)}
                            >
                              {isMasked ? copy.loginShow : copy.loginHide}
                            </button>
                          )}
                        </div>
                        {isMasked ? (
                          <input
                            id={valueId}
                            className={controlClass}
                            type="password"
                            autoComplete="off"
                            value={str(r.value)}
                            readOnly
                            data-masked
                          />
                        ) : (
                          <textarea
                            id={valueId}
                            className={areaClass}
                            rows={3}
                            autoComplete="off"
                            spellCheck={false}
                            value={str(r.value)}
                            readOnly={disabled}
                            onBlur={p.onBlur}
                            onChange={(e) => set(i, { value: e.target.value })}
                          />
                        )}
                      </div>
                    )
                  })()}
                  <label className={styles.rowField}>
                    <span>{copy.loginNotes}</span>
                    <input
                      className={controlClass}
                      type="text"
                      autoComplete="off"
                      value={str(r.notes)}
                      readOnly={disabled}
                      onBlur={p.onBlur}
                      onChange={(e) => set(i, { notes: e.target.value })}
                    />
                  </label>
                </div>
                {rows.length > 1 && (
                  <div className={styles.rowActions}>
                    <button
                      type="button"
                      className={`${styles.small} ${styles.danger}`}
                      disabled={disabled}
                      aria-label={copy.removeRow(label)}
                      onClick={() => {
                        setMasked((all) => all.filter((_, j) => j !== i))
                        p.onChange(rows.filter((_, j) => j !== i))
                      }}
                    >
                      {copy.remove}
                    </button>
                  </div>
                )}
              </fieldset>
            </li>
          )
        })}
      </ul>
      <div className={styles.addRow}>
        <button
          type="button"
          className={styles.small}
          disabled={disabled}
          onClick={() => {
            focusLast.current = true
            p.onChange([...rows, {}])
          }}
        >
          {copy.addLogin}
        </button>
      </div>
      <p className={styles.hint}>{copy.loginEncrypted}</p>
    </>
  )
}
