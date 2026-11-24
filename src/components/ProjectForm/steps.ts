import type { SectionId } from './copy'
import { SECTIONS, sectionOfField } from './sections'

/**
 * The form shows one section (step) at a time; the step is in the URL hash so a reload,
 * back and forward, and a link to a field all land on the right one. A step's hash is its
 * section's id (`#section-people`); a field's is `#field-<key>`, which opens the step the
 * field lives in.
 */
export const STEP_IDS: readonly SectionId[] = SECTIONS.map((s) => s.id)

export const stepHash = (id: SectionId) => `#section-${id}`

const isStep = (id: string): id is SectionId =>
  (STEP_IDS as readonly string[]).includes(id)

/** What a hash asks for: a step, a field in a step, or nothing the form knows (`#main`). */
export function parseStepHash(
  hash: string,
): { step: SectionId; fieldKey?: string } | null {
  const id = decodeURIComponent(hash.replace(/^#/, ''))
  if (id.startsWith('section-')) {
    const step = id.slice('section-'.length)
    return isStep(step) ? { step } : null
  }
  if (id.startsWith('field-')) {
    const key = id.slice('field-'.length)
    // The billing section is one "field" of its own.
    if (key === 'billing') return { step: 'billing', fieldKey: key }
    const step = sectionOfField(key)
    return step ? { step, fieldKey: key } : null
  }
  return null
}

/** The step before and after, or null at either end. */
export function neighbours(id: SectionId): {
  prev: SectionId | null
  next: SectionId | null
} {
  const i = STEP_IDS.indexOf(id)
  return {
    prev: i > 0 ? STEP_IDS[i - 1] : null,
    next: i >= 0 && i < STEP_IDS.length - 1 ? STEP_IDS[i + 1] : null,
  }
}
