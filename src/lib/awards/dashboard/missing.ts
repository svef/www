import { ENTRY_FIELDS, FIELD_DEFINITIONS } from '../fields'
import { validateEntryAnswers, validateProjectAnswers } from '../validation'
import type { MissingItem } from './types'

const LABELS = new Map(FIELD_DEFINITIONS.map((f) => [f.key, f.label]))

/**
 * What stops a draft entry from being submitted: the fields that fail submit-mode validation
 * (`validation.ts`, the same check the submit action will run), one item per field.
 *
 * `image` and `termsAccepted` are not stored as answers (an upload and an acceptance record),
 * so the caller says whether they exist and they are presented to the validator as set.
 * `loginInformation` is stored encrypted, and validation only needs its shape, so a credential
 * count stands in for the values.
 */
export function missingForDraft(input: {
  /** Slugs of the project's non-withdrawn entries. */
  categories: readonly string[]
  /** This entry's category. */
  entryCategory: string
  answers: Readonly<Record<string, unknown>>
  entryAnswers: Readonly<Record<string, unknown>>
  hasImage: boolean
  termsAccepted: boolean
  credentialCount: number
}): MissingItem[] {
  const answers: Record<string, unknown> = { ...input.answers }
  if (input.hasImage) answers.image = { fileId: 'uploaded' }
  if (input.termsAccepted) answers.termsAccepted = true
  if (input.credentialCount > 0)
    answers.loginInformation = Array.from({ length: input.credentialCount }, () => ({ value: '•' }))

  const keys: string[] = []
  const project = validateProjectAnswers(input.categories, answers, 'submit')
  if (!project.ok) for (const e of project.errors) keys.push(e.fieldKey)
  const entryFields = new Set(ENTRY_FIELDS.map((f) => f.key))
  const entry = validateEntryAnswers([input.entryCategory], input.entryAnswers, 'submit')
  if (!entry.ok) for (const e of entry.errors) if (entryFields.has(e.fieldKey)) keys.push(e.fieldKey)

  const seen = new Set<string>()
  const items: MissingItem[] = []
  for (const key of keys) {
    const label = LABELS.get(key)
    if (!label || seen.has(key)) continue
    seen.add(key)
    items.push({ fieldKey: key, label })
  }
  return items
}
