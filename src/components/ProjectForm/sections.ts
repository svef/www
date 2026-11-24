import { FIELD_DEFINITIONS } from '@/lib/awards/fields'
import { resolveAnswers } from '@/lib/awards/visibility'
import { validateProjectAnswers } from '@/lib/awards/validation'
import { PROJECT_FIELDS } from '@/lib/awards/fields'
import type { SectionId } from './copy'

/**
 * Which fields each section of the form holds. The sections are scaffolding: this
 * table says where a field goes, and each section's real UI can replace the generic
 * rendering later without touching the state logic.
 */
export type SectionDef = {
  id: SectionId
  /** Project-scope field keys, in display order. */
  fields: readonly string[]
  /** Entry-scope field keys, rendered once per chosen category. */
  entryFields?: readonly string[]
  /** Built in a later step: no completeness check yet. */
  later?: boolean
}

export const SECTIONS: readonly SectionDef[] = [
  { id: 'categories', fields: [] },
  {
    id: 'project',
    fields: ['title', 'description', 'links', 'appLinks', 'requiresLogin', 'loginInformation'],
  },
  {
    id: 'questions',
    fields: [
      'technicalAchievement',
      'aiRole',
      'school',
      'programme',
      'campaignPeriod',
      'campaignArchive',
    ],
    entryFields: ['categoryPitch'],
  },
  { id: 'people', fields: ['owners', 'collaborators', 'publicCredit'] },
  { id: 'image', fields: ['image'], later: true },
  { id: 'billing', fields: [], later: true },
  { id: 'review', fields: ['termsAccepted'], later: true },
]

// A field the table forgot would never render: fail loudly in tests instead.
export const UNPLACED_FIELDS = FIELD_DEFINITIONS.filter(
  (f) => !SECTIONS.some((s) => s.fields.includes(f.key) || s.entryFields?.includes(f.key)),
).map((f) => f.key)

export type SectionStatus = 'complete' | 'incomplete' | 'later'

/**
 * The check mark per section: complete when the section's visible fields all pass the
 * submit-time rules (so "complete" means "would not block submitting"). Categories are
 * complete once one is chosen; a section with no visible fields is complete once a
 * category is. Sections built later show no check.
 */
export function sectionStatuses(
  categories: readonly string[],
  answers: Readonly<Record<string, unknown>>,
): Record<SectionId, SectionStatus> {
  const result = validateProjectAnswers(categories, answers, 'submit')
  const failing = new Set(result.ok ? [] : result.errors.map((e) => e.fieldKey))
  const visible = new Set(resolveAnswers(PROJECT_FIELDS, categories, answers).visible.map((f) => f.key))
  const out = {} as Record<SectionId, SectionStatus>
  for (const s of SECTIONS) {
    if (s.later) out[s.id] = 'later'
    else if (s.id === 'categories') out[s.id] = categories.length ? 'complete' : 'incomplete'
    else {
      const shown = s.fields.filter((k) => visible.has(k))
      out[s.id] =
        categories.length > 0 && shown.every((k) => !failing.has(k)) ? 'complete' : 'incomplete'
    }
  }
  return out
}

/** Submit-mode errors by field key, for showing after a field has been left. */
export function fieldErrorsByKey(
  categories: readonly string[],
  answers: Readonly<Record<string, unknown>>,
) {
  const result = validateProjectAnswers(categories, answers, 'submit')
  const out: Record<string, { code: string; message: { is: string; en: string } }[]> = {}
  if (!result.ok)
    for (const e of result.errors) (out[e.fieldKey] ??= []).push({ code: e.code, message: e.message })
  return out
}
