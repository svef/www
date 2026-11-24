'use client'

import { Plus } from '@phosphor-icons/react'
import { useState } from 'react'
import { getCategory } from '@/lib/awards/categories'
import { ENTRY_FIELDS, getField } from '@/lib/awards/fields'
import type { Locale } from '@/lib/i18n'
import { getProjectFormCopy } from './copy'
import { FieldInput } from './FieldInput'
import styles from './ProjectForm.module.scss'
import { SECTIONS } from './sections'
import type { ProjectFormApi } from './useProjectForm'

const QUESTION_KEYS = SECTIONS.find((s) => s.id === 'questions')!.fields

/** The questions a category asks: the fields whose `when` names it. */
export function questionsFor(slug: string): string[] {
  return QUESTION_KEYS.filter((k) => {
    const when = getField(k).when
    return Boolean(when && 'categories' in when && when.categories.any?.includes(slug))
  })
}

/**
 * The third section: for each chosen category, the questions only it asks, then the
 * optional "Why this category?" note, collapsed until someone wants it. One shared
 * description is the default; the note is for when a jury needs to hear something
 * different.
 */
export function QuestionsSection({
  form,
  locale,
  renderField,
  requestedKeys,
}: {
  form: ProjectFormApi
  locale: Locale
  renderField: (key: string) => React.ReactNode
  /** Fields an open staff request asks to have updated. */
  requestedKeys?: ReadonlySet<string>
}) {
  const copy = getProjectFormCopy(locale)
  const { view } = form
  const live = view.entries.filter(
    (e) => e.status !== 'withdrawn' && form.categories.includes(e.category),
  )
  const anyQuestions = form.categories.some((c) => questionsFor(c).length > 0)
  const pitch = ENTRY_FIELDS.find((f) => f.key === 'categoryPitch')!

  if (form.categories.length === 0) return <p className={styles.hint}>{copy.chooseCategories}</p>

  return (
    <>
      {!anyQuestions && <p className={styles.hint}>{copy.noQuestions}</p>}
      {form.categories.map((slug) => {
        const name = getCategory(slug)?.name[locale] ?? slug
        const keys = questionsFor(slug)
        const entry = live.find((e) => e.category === slug)
        if (!keys.length && !entry) return null
        return (
          <section
            key={slug}
            className={styles.categoryBlock}
            data-category={slug}
            aria-label={name}
          >
            <h3 className={styles.categoryTitle}>{name}</h3>
            {keys.map(renderField)}
            {entry && (
              <Pitch
                key={entry.id}
                slug={slug}
                name={name}
                form={form}
                locale={locale}
                field={pitch}
                state={view.entryEditability[slug]?.categoryPitch}
                requested={requestedKeys?.has('categoryPitch')}
              />
            )}
          </section>
        )
      })}
    </>
  )
}

function Pitch({
  slug,
  name,
  form,
  locale,
  field,
  state,
  requested,
}: {
  slug: string
  name: string
  form: ProjectFormApi
  locale: Locale
  field: (typeof ENTRY_FIELDS)[number]
  state: ProjectFormApi['view']['entryEditability'][string][string] | undefined
  requested?: boolean
}) {
  const copy = getProjectFormCopy(locale)
  const value = form.entryAnswers[slug]?.categoryPitch
  const id = `${slug}:categoryPitch`
  // Open from the start when there is already a note; then the person decides, so
  // clearing the text never folds the box away under the cursor.
  // A request that asks for the note opens it too, or the field it points to would be hidden.
  const [open, setOpen] = useState((typeof value === 'string' && value !== '') || Boolean(requested))
  return (
    <details
      className={styles.pitch}
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
      data-entry={slug}
    >
      <summary>
        <span className={styles.pitchPlus} aria-hidden="true">
          <Plus weight="bold" />
        </span>
        <span>{copy.pitchAdd(name)}</span>
      </summary>
      <FieldInput
        field={{
          ...field,
          label: { is: copy.pitchTitle(name), en: copy.pitchTitle(name) },
        }}
        idSeed={id.replace(':', '-')}
        value={value}
        onChange={(v) => form.setEntryAnswer(slug, 'categoryPitch', v)}
        onBlur={() => form.markTouched(id)}
        locale={locale}
        copy={copy}
        readOnly={form.readOnly}
        locked={state && !state.editable ? state : undefined}
        errors={(form.serverErrors[id] ?? []).map((x) => x.message[locale])}
        requested={requested}
      />
    </details>
  )
}
