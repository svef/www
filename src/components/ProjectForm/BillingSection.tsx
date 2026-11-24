'use client'

import { PencilSimple, Plus, Trash } from '@phosphor-icons/react'
import { useId, useState } from 'react'
import {
  BILLING_FIELDS,
  BILLING_LIMITS,
  formatKennitala,
  validateBillingInput,
  type BillingFieldKey,
  type BillingInput,
  type BillingProfileView,
} from '@/lib/awards/billing/rules'
import type { ActionResult } from '@/lib/awards/projects/errors'
import type { Locale } from '@/lib/i18n'
import styles from './Billing.module.scss'
import { getProjectFormCopy } from './copy'
import fieldStyles from './ProjectForm.module.scss'
import type { ProjectFormApi } from './useProjectForm'

/** The signed-in user's billing profiles, as server actions. Injected so tests and stories can fake them. */
export type BillingActions = {
  create(input: BillingInput): Promise<ActionResult<BillingProfileView>>
  update(id: string, input: BillingInput): Promise<ActionResult<BillingProfileView>>
  remove(id: string): Promise<ActionResult<null>>
}

type Draft = Record<BillingFieldKey, string>
const EMPTY: Draft = {
  companyName: '',
  kennitala: '',
  invoiceEmail: '',
  address: '',
  reference: '',
}
const draftOf = (p: BillingProfileView): Draft => ({
  companyName: p.companyName,
  kennitala: formatKennitala(p.kennitala),
  invoiceEmail: p.invoiceEmail,
  address: p.address,
  reference: p.reference ?? '',
})

/**
 * The billing section: choose one of your saved profiles, or add one. Profiles are yours
 * and reusable across projects; the project only points at one. A kennitala is checked
 * with the same checksum rule the server applies when it saves.
 */
export function BillingSection({
  form,
  locale,
  profiles,
  onProfiles,
  actions,
}: {
  form: ProjectFormApi
  locale: Locale
  profiles: BillingProfileView[]
  onProfiles: (next: BillingProfileView[]) => void
  actions: BillingActions
}) {
  const copy = getProjectFormCopy(locale)
  const seed = useId().replace(/:/g, '')
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [touched, setTouched] = useState<ReadonlySet<BillingFieldKey>>(new Set())
  const [serverErrors, setServerErrors] = useState<Partial<Record<BillingFieldKey, string>>>({})
  const [failure, setFailure] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [listError, setListError] = useState('')

  const chosenId = form.billingProfileId
  const foreign = form.view.billing && !profiles.some((p) => p.id === form.view.billing?.id)
  const result = validateBillingInput(draft)
  const shown = (field: BillingFieldKey) => {
    if (serverErrors[field]) return serverErrors[field]
    if (!touched.has(field) || result.ok) return undefined
    return result.errors.find((e) => e.field === field)?.message[locale]
  }

  const open = (id: string | 'new', p?: BillingProfileView) => {
    setEditing(id)
    setDraft(p ? draftOf(p) : EMPTY)
    setTouched(new Set())
    setServerErrors({})
    setFailure('')
  }
  const close = () => setEditing(null)

  async function save() {
    setTouched(new Set(BILLING_FIELDS))
    if (!result.ok) return
    setBusy(true)
    setFailure('')
    setServerErrors({})
    const input = result.data
    const r =
      editing === 'new' ? await actions.create(input) : await actions.update(editing!, input)
    setBusy(false)
    if (!r.ok) {
      const byField: Partial<Record<BillingFieldKey, string>> = {}
      for (const e of r.error.fieldErrors ?? [])
        if ((BILLING_FIELDS as readonly string[]).includes(e.fieldKey))
          byField[e.fieldKey as BillingFieldKey] = e.message[locale]
      setServerErrors(byField)
      setFailure(Object.keys(byField).length ? '' : copy.billingFailed)
      return
    }
    const saved = r.value
    onProfiles(
      editing === 'new'
        ? [...profiles, saved]
        : profiles.map((p) => (p.id === saved.id ? saved : p)),
    )
    setEditing(null)
    // A profile you just added is the one you meant to use.
    if (editing === 'new') void form.changeBilling(saved.id)
  }

  async function remove(p: BillingProfileView) {
    setListError('')
    const r = await actions.remove(p.id)
    setConfirming(null)
    if (!r.ok) {
      setListError(r.error.code === 'billing_in_use' ? copy.billingInUse : copy.billingFailed)
      return
    }
    onProfiles(profiles.filter((x) => x.id !== p.id))
  }

  const inputFor = (
    field: BillingFieldKey,
    props: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => {
    const id = `${seed}-${field}`
    const err = shown(field)
    const hint = field === 'kennitala' ? `${id}-hint` : undefined
    return (
      <div className={styles.fieldRow} key={field}>
        <label htmlFor={id} className={fieldStyles.label}>
          {copy.billingFields[field]}
        </label>
        {hint && (
          <p id={hint} className={fieldStyles.hint}>
            {copy.billingKennitala}
          </p>
        )}
        <input
          id={id}
          className={fieldStyles.input}
          value={draft[field]}
          maxLength={
            field === 'kennitala' ? 11 : BILLING_LIMITS[field as keyof typeof BILLING_LIMITS]
          }
          aria-invalid={err ? true : undefined}
          aria-describedby={
            [hint, err ? `${id}-error` : null].filter(Boolean).join(' ') || undefined
          }
          autoComplete="off"
          onChange={(e) => setDraft({ ...draft, [field]: e.target.value })}
          onBlur={() => setTouched(new Set(touched).add(field))}
          {...props}
        />
        {err && (
          <p id={`${id}-error`} className={fieldStyles.error}>
            {err}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className={styles.billing} id="field-billing" data-field="billing">
      <fieldset className={styles.profiles} disabled={form.readOnly}>
        <legend className={fieldStyles.label}>{copy.billingProfiles}</legend>
        {profiles.length === 0 && !foreign && (
          <p className={fieldStyles.hint}>{copy.billingNone}</p>
        )}
        <ul className={styles.list}>
          {foreign && form.view.billing && (
            <li className={styles.profile} data-profile={form.view.billing.id} data-selected="">
              <label className={styles.pick}>
                <input type="radio" name="billing" checked disabled readOnly />
                <span>
                  <strong>{form.view.billing.companyName}</strong>
                  <span className={styles.meta}>
                    kt. {formatKennitala(form.view.billing.kennitala)} · {copy.billingOther}
                  </span>
                </span>
              </label>
            </li>
          )}
          {profiles.map((p) => (
            <li
              key={p.id}
              className={styles.profile}
              data-profile={p.id}
              data-selected={chosenId === p.id ? '' : undefined}
            >
              <label className={styles.pick}>
                <input
                  type="radio"
                  name="billing"
                  checked={chosenId === p.id}
                  onChange={() => void form.changeBilling(p.id)}
                />
                <span>
                  <strong>{p.companyName}</strong>
                  <span className={styles.meta}>
                    kt. {formatKennitala(p.kennitala)} · {p.invoiceEmail}
                  </span>
                  <span className={styles.meta}>
                    {p.address}
                    {p.reference ? ` · ${p.reference}` : ''}
                  </span>
                </span>
              </label>
              <div className={styles.actions}>
                {confirming === p.id ? (
                  <>
                    <span role="alert">{copy.billingDeleteConfirm(p.companyName)}</span>
                    <button
                      type="button"
                      className={fieldStyles.small}
                      onClick={() => void remove(p)}
                    >
                      {copy.billingDeleteYes}
                    </button>
                    <button
                      type="button"
                      className={fieldStyles.small}
                      onClick={() => setConfirming(null)}
                    >
                      {copy.billingCancel}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className={fieldStyles.small}
                      aria-label={`${copy.billingEdit}: ${p.companyName}`}
                      onClick={() => open(p.id, p)}
                    >
                      <PencilSimple aria-hidden="true" weight="bold" /> {copy.billingEdit}
                    </button>
                    <button
                      type="button"
                      className={fieldStyles.small}
                      aria-label={`${copy.billingDelete}: ${p.companyName}`}
                      onClick={() => {
                        setListError('')
                        setConfirming(p.id)
                      }}
                    >
                      <Trash aria-hidden="true" weight="bold" /> {copy.billingDelete}
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
        {listError && (
          <p className={fieldStyles.error} role="alert">
            {listError}
          </p>
        )}
        {form.billingError && (
          <p className={fieldStyles.error} role="alert">
            {copy.billingChosenError}
          </p>
        )}
        {editing === null && (
          <div>
            <button type="button" className={fieldStyles.small} onClick={() => open('new')}>
              <Plus aria-hidden="true" weight="bold" /> {copy.billingAdd}
            </button>
          </div>
        )}
      </fieldset>

      {editing !== null && (
        // Not a <form>: the whole project form is one, and forms don't nest.
        <div
          className={styles.editor}
          role="group"
          aria-labelledby={`${seed}-editor`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
              e.preventDefault()
              void save()
            }
          }}
        >
          <h3 id={`${seed}-editor`} className={styles.editorTitle}>
            {editing === 'new' ? copy.billingAdd : copy.billingEdit}
          </h3>
          {inputFor('companyName')}
          {inputFor('kennitala', { inputMode: 'numeric' })}
          {inputFor('invoiceEmail', { type: 'email' })}
          {inputFor('address')}
          {inputFor('reference')}
          {failure && (
            <p className={fieldStyles.error} role="alert">
              {failure}
            </p>
          )}
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primary}
              disabled={busy}
              onClick={() => void save()}
            >
              {copy.billingSave}
            </button>
            <button type="button" className={fieldStyles.small} onClick={close}>
              {copy.billingCancel}
            </button>
          </div>
        </div>
      )}

      <p className={fieldStyles.hint}>{copy.billingNote}</p>
    </div>
  )
}
