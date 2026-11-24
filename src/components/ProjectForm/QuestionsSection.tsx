'use client'

import { Plus } from '@phosphor-icons/react'
import { useState } from 'react'
import { getCategory } from '@/lib/awards/categories'
import { ENTRY_FIELDS, getField } from '@/lib/awards/fields'
import { Step } from '@/components/FormParts/FormParts'
import type { Locale } from '@/lib/i18n'
import { getProjectFormCopy } from './copy'
import { FieldInput } from './FieldInput'
import styles from './ProjectForm.module.scss'
import { blockNum, SECTIONS } from './sections'
import { BlockFields } from './Blocks'
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
 * The third section: a numbered block per chosen category, titled with its name, holding
 * the questions it asks (a question two chosen categories ask is shown once, in the first
 * block), then the optional "Why this category?" note, collapsed until someone wants it. One shared
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

  // One block per chosen category with something to ask; a question asked by more than one
  // of them is shown once, in the first block that needs it.
  const asked = new Set<string>()
  const blocks = form.categories
    .map((slug) => {
      const keys = questionsFor(slug).filter((k) => !asked.has(k))
      keys.forEach((k) => asked.add(k))
      return { slug, keys, entry: live.find((e) => e.category === slug) }
    })
    .filter((b) => b.keys.length > 0 || b.entry)

  if (form.categories.length === 0)
    return <p className={styles.hint}>{copy.chooseCategories}</p>

  return (
    <>
      {!anyQuestions && <p className={styles.hint}>{copy.noQuestions}</p>}
      {blocks.map(({ slug, keys, entry }, i) => {
        const name = getCategory(slug)?.name[locale] ?? slug
        return (
          <div key={slug} data-category={slug}>
            <Step num={blockNum(i + 1)} title={name}>
              <div className={styles.blockBody}>
                {keys.length > 0 && <BlockFields keys={keys} render={renderField} />}
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
              </div>
            </Step>
          </div>
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
  const [open, setOpen] = useState(
    (typeof value === 'string' && value !== '') || Boolean(requested),
  )
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
