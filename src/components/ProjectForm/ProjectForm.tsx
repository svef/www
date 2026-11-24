'use client'

import { Check } from '@phosphor-icons/react'
import { useMemo } from 'react'
import clsx from 'clsx'
import { CATEGORIES, CATEGORY_GROUPS } from '@/lib/awards/categories'
import { ENTRY_FIELDS, getField, PROJECT_FIELDS } from '@/lib/awards/fields'
import { blockedOptions } from '@/lib/awards/selection'
import { forcedValue, resolveAnswers } from '@/lib/awards/visibility'
import type { ProjectView } from '@/lib/awards/projects/types'
import type { Locale } from '@/lib/i18n'
import { getProjectFormCopy, type SectionId } from './copy'
import { FieldInput } from './FieldInput'
import styles from './ProjectForm.module.scss'
import { SECTIONS } from './sections'
import { useProjectForm, type ProjectFormActions } from './useProjectForm'

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
}: {
  initial: ProjectView
  locale: Locale
  actions: ProjectFormActions
}) {
  const copy = getProjectFormCopy(locale)
  const form = useProjectForm(initial, actions)
  const { view, lockState } = form

  const resolved = useMemo(
    () => resolveAnswers(PROJECT_FIELDS, form.categories, form.answers),
    [form.categories, form.answers],
  )
  const visible = useMemo(() => new Set(resolved.visible.map((f) => f.key)), [resolved])

  const messagesFor = (key: string): string[] => {
    const shown = form.touched.has(key) ? (form.errors[key] ?? []) : []
    const server = form.serverErrors[key] ?? []
    return [...shown, ...server].map((e) => e.message[locale]).filter((m, i, a) => a.indexOf(m) === i)
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
    const forced = forcedValue(field, { categories: form.categories, answers: resolved.answers }).forced
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
      />
    )
  }

  return (
    <div className={styles.layout} data-lock={lockState.kind} data-save={form.saveState}>
      <nav className={styles.outline} aria-label={copy.outline}>
        <ol>
          {SECTIONS.map((s, i) => {
            const status = form.statuses[s.id]
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
                  {status === 'incomplete' && <span className={styles.srOnly}>({copy.incomplete})</span>}
                </a>
              </li>
            )
          })}
        </ol>
        <p className={styles.saveState} role="status" aria-live="polite" data-state={form.saveState}>
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
              <p>{copy.lockHeld(lockState.lock.holderName, time(lockState.lock.acquiredAt, locale))}</p>
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

        <form onSubmit={(e) => e.preventDefault()} noValidate className={styles.sections}>
          {SECTIONS.map((s) => (
            <section
              key={s.id}
              id={`section-${s.id}`}
              className={styles.section}
              aria-labelledby={`heading-${s.id}`}
            >
              <h2 id={`heading-${s.id}`}>{copy.sections[s.id].title}</h2>
              {copy.sections[s.id].intro && <p className={styles.intro}>{copy.sections[s.id].intro}</p>}
              <SectionBody
                id={s.id}
                form={form}
                locale={locale}
                renderProjectField={renderProjectField}
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
}: {
  id: SectionId
  form: ReturnType<typeof useProjectForm>
  locale: Locale
  renderProjectField: (key: string) => React.ReactNode
}) {
  const copy = getProjectFormCopy(locale)
  const section = SECTIONS.find((s) => s.id === id)!
  const { view } = form

  if (id === 'categories') return <Categories form={form} locale={locale} />

  if (id === 'billing') return <p className={styles.later}>{copy.laterNote}</p>

  if (id === 'questions') {
    const shown = section.fields.map(renderProjectField).filter(Boolean)
    const pitches = view.entries.filter((e) => e.status !== 'withdrawn')
    return (
      <>
        {form.categories.length === 0 && <p className={styles.hint}>{copy.chooseCategories}</p>}
        {form.categories.length > 0 && shown.length === 0 && (
          <p className={styles.hint}>{copy.noQuestions}</p>
        )}
        {shown}
        {pitches.map((e) => {
          const pitch = ENTRY_FIELDS.find((f) => f.key === 'categoryPitch')!
          const name = CATEGORIES.find((c) => c.slug === e.category)?.name[locale] ?? e.category
          const state = view.entryEditability[e.category]?.categoryPitch
          const value = form.entryAnswers[e.category]?.categoryPitch
          const id = `${e.category}:categoryPitch`
          return (
            <details
              key={e.id}
              className={styles.pitch}
              open={typeof value === 'string' && value !== ''}
              data-entry={e.category}
            >
              <summary>{copy.pitchAdd(name)}</summary>
              <FieldInput
                field={{ ...pitch, label: { is: copy.pitchTitle(name), en: copy.pitchTitle(name) } }}
                idSeed={id.replace(':', '-')}
                value={value}
                onChange={(v) => form.setEntryAnswer(e.category, 'categoryPitch', v)}
                onBlur={() => form.markTouched(id)}
                locale={locale}
                copy={copy}
                readOnly={form.readOnly}
                locked={state && !state.editable ? state : undefined}
                errors={(form.serverErrors[id] ?? []).map((x) => x.message[locale])}
              />
            </details>
          )
        })}
      </>
    )
  }

  const rendered = section.fields.map(renderProjectField)
  return <>{rendered}</>
}

function Categories({
  form,
  locale,
}: {
  form: ReturnType<typeof useProjectForm>
  locale: Locale
}) {
  const copy = getProjectFormCopy(locale)
  const { view } = form
  const selected = form.categories
  const blocked = useMemo(() => blockedOptions(selected), [selected])
  const statusOf = (slug: string) => view.entries.find((e) => e.category === slug)?.status
  const toggle = (slug: string, on: boolean) =>
    void form.changeCategories(on ? [...selected, slug] : selected.filter((s) => s !== slug))
  // A submitted entry can't be dropped here: leaving it means withdrawing it.
  const pinned = (slug: string) => {
    const s = statusOf(slug)
    return s !== undefined && s !== 'draft' && s !== 'withdrawn'
  }

  const standalone = CATEGORIES.filter((c) => !c.group)
  return (
    <fieldset className={styles.categories} disabled={form.readOnly}>
      <legend className={styles.srOnly}>{copy.sections.categories.title}</legend>
      <ul className={styles.cards}>
        {CATEGORY_GROUPS.map((g) => {
          const tiers = CATEGORIES.filter((c) => c.group === g.slug)
          const chosen = tiers.find((t) => selected.includes(t.slug))
          return (
            <li key={g.slug} className={styles.card} data-choice={g.slug}>
              <fieldset>
                <legend>{g.name[locale]}</legend>
                <ul className={styles.tiers}>
                  {tiers.map((t) => (
                    <li key={t.slug}>
                      <label>
                        <input
                          type="radio"
                          name={`tier-${g.slug}`}
                          checked={chosen?.slug === t.slug}
                          disabled={pinned(chosen?.slug ?? '') && chosen?.slug !== t.slug}
                          onChange={() =>
                            void form.changeCategories([
                              ...selected.filter((s) => !tiers.some((x) => x.slug === s)),
                              t.slug,
                            ])
                          }
                        />{' '}
                        {t.tierLabel?.[locale] ?? t.name[locale]}
                      </label>
                    </li>
                  ))}
                </ul>
                {chosen && !pinned(chosen.slug) && (
                  <button
                    type="button"
                    className={styles.small}
                    onClick={() => toggle(chosen.slug, false)}
                  >
                    {copy.remove}
                  </button>
                )}
              </fieldset>
            </li>
          )
        })}
        {standalone.map((c) => {
          const why = blocked[c.slug]
          const checked = selected.includes(c.slug)
          const hint = `hint-${c.slug}`
          return (
            <li key={c.slug} className={clsx(styles.card, why && styles.blocked)} data-choice={c.slug}>
              <label>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={Boolean(why) || (checked && pinned(c.slug))}
                  aria-describedby={why ? hint : undefined}
                  onChange={(e) => toggle(c.slug, e.target.checked)}
                />{' '}
                {c.name[locale]}
              </label>
              {checked && statusOf(c.slug) && statusOf(c.slug) !== 'draft' && (
                <span className={styles.status}> · {copy.status[statusOf(c.slug)!]}</span>
              )}
              {c.blurb && <p className={styles.hint}>{c.blurb[locale]}</p>}
              {why && (
                <p id={hint} className={styles.hint}>
                  {why.message[locale] || copy.blockedBecause}
                </p>
              )}
            </li>
          )
        })}
      </ul>
      {form.categoryError && (
        <p className={styles.error} role="alert">
          {form.categoryError.message || copy.categoryError}
        </p>
      )}
    </fieldset>
  )
}
