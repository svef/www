'use client'

import { ArrowLeft, ArrowRight, Lock } from '@phosphor-icons/react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { GrowText } from '@/components/GrowText/GrowText'
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
import { Stepper, type StepItem } from './Stepper'
import { neighbours, parseStepHash, stepHash, STEP_IDS } from './steps'
import { focusTarget, focusWithin, GO_TO_EVENT, type GoToTarget } from './focus'
import {
  useProjectForm,
  type ProjectFormActions,
  type ProjectFormApi,
} from './useProjectForm'

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

/** Where focus goes once a step is on screen: its heading, a field in it, or nowhere (a reload). */
type FocusRequest = { kind: 'heading' } | { kind: 'target'; target: GoToTarget } | null

/**
 * The project form: a stepper across the top and one section at a time, autosave, and the
 * edit lock. The step is in the URL hash (see `steps.ts`). Presentation only; the state
 * lives in `useProjectForm`.
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

  // ---- Steps ----------------------------------------------------------------------------
  const [nav, setNav] = useState<{ step: SectionId; tick: number; focus: FocusRequest }>({
    step: 'categories',
    tick: 0,
    focus: null,
  })
  const [announcement, setAnnouncement] = useState('')
  const layoutRef = useRef<HTMLDivElement>(null)

  const go = useCallback(
    (step: SectionId, focus: FocusRequest, push: boolean) => {
      if (push && window.location.hash !== stepHash(step))
        window.history.pushState(null, '', stepHash(step))
      const n = STEP_IDS.indexOf(step) + 1
      setAnnouncement(
        focus ? copy.stepAnnounce(n, STEP_IDS.length, copy.sections[step].title) : '',
      )
      setNav((v) => ({ step, tick: v.tick + 1, focus }))
    },
    [copy],
  )

  // Once the step is on screen: bring the top of the form into view (if the page has been
  // scrolled past it) and focus the step's heading, or take the person to the field asked for.
  useLayoutEffect(() => {
    const f = nav.focus
    if (!f) return
    if (f.kind === 'heading') {
      const top = (layoutRef.current?.getBoundingClientRect().top ?? 0) + window.scrollY
      if (window.scrollY > top) window.scrollTo({ top })
      document.getElementById(`heading-${nav.step}`)?.focus({ preventScroll: true })
    } else {
      focusTarget(f.target)
    }
  }, [nav])

  // The hash decides the step: on load, on back and forward, and when a link changes it.
  useLayoutEffect(() => {
    const fromHash = (initial: boolean) => {
      const hit = parseStepHash(window.location.hash)
      if (!hit) return
      const focus: FocusRequest = hit.fieldKey
        ? { kind: 'target', target: { fieldKey: hit.fieldKey, section: hit.step } }
        : initial
          ? null
          : { kind: 'heading' }
      go(hit.step, focus, false)
    }
    fromHash(true)
    const onChange = () => fromHash(false)
    window.addEventListener('popstate', onChange)
    window.addEventListener('hashchange', onChange)
    return () => {
      window.removeEventListener('popstate', onChange)
      window.removeEventListener('hashchange', onChange)
    }
  }, [go])

  // A link to a field elsewhere in the form (the review's missing items, a request's fields).
  useEffect(() => {
    const onGoTo = (e: Event) => {
      const target = (e as CustomEvent<GoToTarget>).detail
      e.preventDefault()
      const el =
        (target.fieldKey && document.getElementById(`field-${target.fieldKey}`)) ||
        document.getElementById(`section-${target.section}`)
      const step = el?.closest<HTMLElement>('[data-step]')?.dataset.step as
        SectionId | undefined
      if (!step) {
        if (el) focusWithin(el)
        return
      }
      go(step, { kind: 'target', target }, true)
    }
    window.addEventListener(GO_TO_EVENT, onGoTo)
    return () => window.removeEventListener(GO_TO_EVENT, onGoTo)
  }, [go])

  const steps: StepItem[] = SECTIONS.map((s) => ({
    id: s.id,
    title: copy.sections[s.id].title,
    // The image is optional: it earns a check once there is one, and is never "incomplete".
    status: s.id === 'image' ? (image ? 'complete' : 'later') : form.statuses[s.id],
  }))

  const lockBadge =
    lockState.kind === 'other'
      ? copy.lockBadgeOther(lockState.lock.holderName)
      : lockState.kind === 'unreachable'
        ? copy.lockBadgeReadOnly
        : ''

  return (
    <div
      ref={layoutRef}
      className={styles.layout}
      data-lock={lockState.kind}
      data-save={form.saveState}
    >
      <Stepper
        steps={steps}
        current={nav.step}
        onGo={(id) => go(id, { kind: 'heading' }, true)}
        copy={copy}
        status={
          <>
            {lockBadge && (
              <p className={styles.lockBadge} data-lock-badge>
                <Lock aria-hidden="true" weight="bold" />
                <span>{lockBadge}</span>
              </p>
            )}
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
          </>
        }
      />

      <div className={styles.main}>
        <div className={styles.banner} role="status" data-kind={lockState.kind}>
          {lockState.kind === 'acquiring' && <p>{copy.lockAcquiring}</p>}
          {lockState.kind === 'other' && (
            <>
              <p className={styles.bannerTitle}>
                {copy.lockHeld(
                  lockState.lock.holderName,
                  time(lockState.lock.acquiredAt, locale),
                )}
              </p>
              {form.lostLock && <p>{copy.lockLost}</p>}
              <button type="button" className={styles.small} onClick={form.checkLockAgain}>
                {copy.lockTryAgain}
              </button>
            </>
          )}
          {lockState.kind === 'unreachable' && (
            <>
              <p className={styles.bannerTitle}>{copy.lockError}</p>
              <button
                type="button"
                className={styles.small}
                onClick={form.checkLockAgain}
              >
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

        <p className={styles.srOnly} role="status" aria-live="polite" data-step-announce>
          {announcement}
        </p>

        <form onSubmit={(e) => e.preventDefault()} noValidate className={styles.sections}>
          {SECTIONS.map((s, i) => {
            const { prev, next } = neighbours(s.id)
            return (
              // Every step stays mounted, hidden when it is not the current one, so what a
              // step holds in its own state (a half-typed email, an open note) survives a
              // switch, and a link to any field can find it.
              <section
                key={s.id}
                id={`section-${s.id}`}
                className={styles.section}
                aria-labelledby={`heading-${s.id}`}
                data-step={s.id}
                hidden={s.id !== nav.step}
              >
                <header className={styles.sectionHead}>
                  <p className={styles.stepNo}>{copy.stepOf(i + 1, SECTIONS.length)}</p>
                  <h2 id={`heading-${s.id}`} tabIndex={-1}>
                    {copy.sections[s.id].title}
                  </h2>
                  {copy.sections[s.id].intro && (
                    <p className={styles.intro}>{copy.sections[s.id].intro}</p>
                  )}
                </header>
                <div className={styles.body}>
                  <SectionBody
                    id={s.id}
                    form={form}
                    locale={locale}
                    renderProjectField={renderProjectField}
                    requestedKeys={requestedKeys}
                    billing={{ ...billing, profiles, onProfiles: setProfiles }}
                  />
                </div>
                {(prev || next) && (
                  <div className={styles.stepNav}>
                    {prev && (
                      <a
                        href={stepHash(prev)}
                        className={styles.prev}
                        data-step-prev
                        onClick={(e) => {
                          e.preventDefault()
                          go(prev, { kind: 'heading' }, true)
                        }}
                      >
                        <ArrowLeft aria-hidden="true" weight="bold" />
                        <span>
                          {copy.prevStep}
                          <span className={styles.srOnly}>: </span>
                          <span className={styles.stepNavName}>
                            {copy.sections[prev].title}
                          </span>
                        </span>
                      </a>
                    )}
                    {next && (
                      <a
                        href={stepHash(next)}
                        className={`btn-grow ${styles.next}`}
                        data-step-next
                        onClick={(e) => {
                          e.preventDefault()
                          go(next, { kind: 'heading' }, true)
                        }}
                      >
                        <span>
                          <GrowText>{copy.nextStep}</GrowText>
                          <span className={styles.srOnly}>: </span>
                          <span className={styles.stepNavName}>
                            {copy.sections[next].title}
                          </span>
                        </span>
                        <ArrowRight aria-hidden="true" weight="bold" />
                      </a>
                    )}
                  </div>
                )}
              </section>
            )
          })}
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
