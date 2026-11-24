'use client'

import { Check } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import type { BillingProfileView } from '@/lib/awards/billing/rules'
import { getField, PROJECT_FIELDS } from '@/lib/awards/fields'
import { forcedValue, resolveAnswers } from '@/lib/awards/visibility'
import type { ProjectImage } from '@/lib/awards/files/types'
import type { ProjectView } from '@/lib/awards/projects/types'
import type { Locale } from '@/lib/i18n'
import { BillingSection, type BillingActions } from './BillingSection'
import { CategoriesSection } from './CategoriesSection'
import { getProjectFormCopy, type SectionId } from './copy'
import { FieldInput } from './FieldInput'
import type { ImageActions } from './ImageUpload'
import styles from './ProjectForm.module.scss'
import { QuestionsSection } from './QuestionsSection'
import { RequestBanners, type RequestActions, type RequestBannerData } from './RequestBanners'
import { ReviewSection } from './ReviewSection'
import { SECTIONS } from './sections'
import { useProjectForm, type ProjectFormActions, type ProjectFormApi } from './useProjectForm'

export type BillingProps = {
  /** The signed-in user's saved billing profiles, as loaded with the page. */
  initialProfiles: BillingProfileView[]
  actions: BillingActions
}

const time = (iso: string, locale: Locale) =>
  new Intl.DateTimeFormat(locale === 'is' ? 'is-IS' : 'en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC', // Iceland is UTC all year
  }).format(new Date(iso))

/**
 * The project form: one page, a sticky outline with a check per section, autosave,
 * and the edit lock. Presentation only; the state lives in `useProjectForm`.
 */
export function ProjectForm({
  initial,
  locale,
  actions,
  billing,
  images,
  requests,
}: {
  initial: ProjectView
  locale: Locale
  actions: ProjectFormActions
  billing: BillingProps
  /** The server calls behind the image upload. */
  images: ImageActions
  /** Staff requests on this project's entries (svef/www#169), with the actions to answer them. */
  requests?: { items: RequestBannerData[]; actions: RequestActions; onChanged: () => void }
}) {
  const copy = getProjectFormCopy(locale)
  const form = useProjectForm(initial, actions)
  const [profiles, setProfiles] = useState(billing.initialProfiles)
  const { view, lockState } = form
  const [image, setImage] = useState<ProjectImage | null>(initial.image ?? null)

  const resolved = useMemo(
    () => resolveAnswers(PROJECT_FIELDS, form.categories, form.answers),
    [form.categories, form.answers],
  )
  const visible = useMemo(() => new Set(resolved.visible.map((f) => f.key)), [resolved])

  // Fields an open (not overdue, not resolved) request asks for: highlighted in the form.
  const requestedKeys = useMemo(
    () =>
      new Set(
        (requests?.items ?? [])
          .filter((r) => r.status === 'open')
          .flatMap((r) => r.fields.map((f) => f.key)),
      ),
    [requests?.items],
  )

  const messagesFor = (key: string): string[] => {
    const touched = form.touched.has(key)
    const shown = touched ? (form.errors[key] ?? []) : []
    // An editor with no email is explained next to the row itself (a neutral note that
    // turns red once the email has been left), not repeated here in red.
    const server = form.serverErrors[key] ?? []
    return [...shown, ...server]
      .filter((e) => e.code !== 'emailRequiredForEditor')
      .map((e) => e.message[locale])
      .filter((m, i, a) => a.indexOf(m) === i)
  }

  const saveText =
    form.saveState === 'saving'
      ? copy.saving
      : form.saveState === 'saved'
        ? copy.saved
        : form.saveState === 'error'
          ? lockState.kind === 'other'
            ? copy.notSavedLock
            : copy.notSaved
          : ''
  const saveNote = form.saveState === 'saved' && form.invalidUnsaved ? copy.notSavedCheck : ''

  const renderProjectField = (key: string) => {
    if (!visible.has(key)) return null
    const field = getField(key)
    const e = view.editability[key]
    const forced = forcedValue(field, {
      categories: form.categories,
      answers: resolved.answers,
    }).forced
    return (
      <FieldInput
        key={key}
        field={field}
        value={form.answers[key]}
        onChange={(v) => form.setAnswer(key, v)}
        onBlur={() => form.markTouched(key)}
        locale={locale}
        copy={copy}
        readOnly={form.readOnly}
        locked={e && !e.editable ? e : undefined}
        errors={messagesFor(key)}
        forced={forced}
        requested={requestedKeys.has(key)}
        imageUpload={key === 'image' ? { actions: images, image, onChange: setImage } : undefined}
        invite={
          key === 'collaborators'
            ? {
                invites: form.invites,
                notice: form.inviteNotice,
                onResend: (personId) => void form.resendInvite(personId),
              }
            : undefined
        }
      />
    )
  }

  return (
    <div className={styles.layout} data-lock={lockState.kind} data-save={form.saveState}>
      <nav className={styles.outline} aria-label={copy.outline}>
        <ol>
          {SECTIONS.map((s, i) => {
            // The image is optional: it earns a check once there is one, and is never "incomplete".
            const status = s.id === 'image' ? (image ? 'complete' : 'later') : form.statuses[s.id]
            return (
              <li key={s.id}>
                <a href={`#section-${s.id}`} data-status={status}>
                  <span className={styles.num} aria-hidden="true">
                    {i + 1}
                  </span>
                  <span>{copy.sections[s.id].title}</span>
                  {status === 'complete' && (
                    <>
                      <Check aria-hidden="true" weight="bold" className={styles.tick} />
                      <span className={styles.srOnly}>({copy.complete})</span>
                    </>
                  )}
                  {status === 'incomplete' && (
                    <span className={styles.srOnly}>({copy.incomplete})</span>
                  )}
                </a>
              </li>
            )
          })}
        </ol>
        <p
          className={styles.saveState}
          role="status"
          aria-live="polite"
          data-state={form.saveState}
        >
          {saveText}
          {form.saveState === 'error' && lockState.kind !== 'other' && (
            <>
              {' '}
              <button type="button" className={styles.link} onClick={form.retrySave}>
                {copy.retry}
              </button>
            </>
          )}
          {saveNote && <span className={styles.saveNote}> {saveNote}</span>}
        </p>
      </nav>

      <div className={styles.main}>
        <div className={styles.banner} role="status" data-kind={lockState.kind}>
          {lockState.kind === 'acquiring' && <p>{copy.lockAcquiring}</p>}
          {lockState.kind === 'other' && (
            <>
              <p>
                {copy.lockHeld(lockState.lock.holderName, time(lockState.lock.acquiredAt, locale))}
              </p>
              {form.lostLock && <p>{copy.lockLost}</p>}
              <button type="button" className={styles.small} onClick={form.checkLockAgain}>
                {copy.lockTryAgain}
              </button>
            </>
          )}
          {lockState.kind === 'unreachable' && (
            <>
              <p>{copy.lockError}</p>
              <button type="button" className={styles.small} onClick={form.checkLockAgain}>
                {copy.lockTryAgain}
              </button>
            </>
          )}
          {lockState.kind === 'held' && form.recovered && <p>{copy.lockRecovered}</p>}
        </div>

        {requests && (
          <RequestBanners
            requests={requests.items}
            locale={locale}
            actions={requests.actions}
            onChanged={async () => {
              // The form's own view first (which fields are editable now), then the page's data.
              await form.refresh()
              requests.onChanged()
            }}
          />
        )}

        <form onSubmit={(e) => e.preventDefault()} noValidate className={styles.sections}>
          {SECTIONS.map((s) => (
            <section
              key={s.id}
              id={`section-${s.id}`}
              className={styles.section}
              aria-labelledby={`heading-${s.id}`}
            >
              <h2 id={`heading-${s.id}`}>{copy.sections[s.id].title}</h2>
              {copy.sections[s.id].intro && (
                <p className={styles.intro}>{copy.sections[s.id].intro}</p>
              )}
              <SectionBody
                id={s.id}
                form={form}
                locale={locale}
                renderProjectField={renderProjectField}
                requestedKeys={requestedKeys}
                billing={{ ...billing, profiles, onProfiles: setProfiles }}
              />
            </section>
          ))}
        </form>
      </div>
    </div>
  )
}

function SectionBody({
  id,
  form,
  locale,
  renderProjectField,
  requestedKeys,
  billing,
}: {
  id: SectionId
  form: ProjectFormApi
  locale: Locale
  renderProjectField: (key: string) => React.ReactNode
  requestedKeys: ReadonlySet<string>
  billing: BillingProps & {
    profiles: BillingProfileView[]
    onProfiles: (p: BillingProfileView[]) => void
  }
}) {
  const section = SECTIONS.find((s) => s.id === id)!
  switch (id) {
    case 'categories':
      return <CategoriesSection form={form} locale={locale} />
    case 'questions':
      return <QuestionsSection
          form={form}
          locale={locale}
          renderField={renderProjectField}
          requestedKeys={requestedKeys}
        />
    case 'billing':
      return (
        <BillingSection
          form={form}
          locale={locale}
          profiles={billing.profiles}
          onProfiles={billing.onProfiles}
          actions={billing.actions}
        />
      )
    case 'review':
      return <ReviewSection form={form} locale={locale} />
    default:
      return <>{section.fields.map(renderProjectField)}</>
  }
}
