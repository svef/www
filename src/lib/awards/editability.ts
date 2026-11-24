import type { FieldDefinition } from './fields'
import { isSubmittedLike, toMs, type DateInput, type EntryStatus } from './types'

export type UnlockRequest = {
  fieldKeys: readonly string[]
  /** Exclusive: the request unlocks while now < deadlineAt. */
  deadlineAt: DateInput
  resolvedAt?: DateInput | null
}

export type EditabilityContext = {
  /** Server clock. */
  now: DateInput
  intakeClosesBefore: DateInput
  /** The project's entries (category slug + status); withdrawn entries may be included. */
  entries: readonly { category: string; status: EntryStatus }[]
  /** Requests on any of the project's entries. */
  requests?: readonly UnlockRequest[]
  /** For `scope: entry` fields: the category of the entry being edited. */
  entryCategory?: string
}

export type Editability =
  | {
      editable: true
      reason: 'open_request' | 'editable_after_submit' | 'not_submitted' | 'new_category'
    }
  | { editable: false; reason: 'intake_closed' | 'locked_after_submit' }

export function hasOpenRequestFor(
  fieldKey: string,
  requests: readonly UnlockRequest[] | undefined,
  now: DateInput,
): boolean {
  const t = toMs(now)
  return (requests ?? []).some(
    (r) => r.fieldKeys.includes(fieldKey) && !r.resolvedAt && t < toMs(r.deadlineAt),
  )
}

/**
 * Whether a field can be edited now (spec §5, option "b"). Order:
 *  1. an open request that unlocks the key wins, even after close;
 *  2. from `intakeClosesBefore` on (inclusive) everything else is read-only;
 *  3. `editableAfterSubmit` fields are editable;
 *  4. otherwise editable only while nothing it applies to is submitted: for an entry-scoped field
 *     the entry itself; for a category-specific field (`when.categories.any`) every entry in
 *     those categories (so a newly added category's questions stay open until it is submitted);
 *     for other project fields, the whole project. Withdrawn entries count as not submitted.
 */
export function fieldEditability(
  field: FieldDefinition,
  ctx: EditabilityContext,
): Editability {
  if (hasOpenRequestFor(field.key, ctx.requests, ctx.now))
    return { editable: true, reason: 'open_request' }
  if (toMs(ctx.now) >= toMs(ctx.intakeClosesBefore))
    return { editable: false, reason: 'intake_closed' }
  if (field.editableAfterSubmit)
    return { editable: true, reason: 'editable_after_submit' }

  let relevant = ctx.entries
  let categorySpecific = false
  if (field.scope === 'entry') {
    relevant = ctx.entries.filter((e) => e.category === ctx.entryCategory)
    categorySpecific = true
  } else if (field.when && 'categories' in field.when && field.when.categories.any) {
    const any = field.when.categories.any
    relevant = ctx.entries.filter((e) => any.includes(e.category))
    categorySpecific = true
  }
  const anySubmitted = relevant.some((e) => isSubmittedLike(e.status))
  if (!anySubmitted) {
    const projectSubmitted = ctx.entries.some((e) => isSubmittedLike(e.status))
    return {
      editable: true,
      reason: categorySpecific && projectSubmitted ? 'new_category' : 'not_submitted',
    }
  }
  return { editable: false, reason: 'locked_after_submit' }
}

export function isFieldEditable(
  field: FieldDefinition,
  ctx: EditabilityContext,
): boolean {
  return fieldEditability(field, ctx).editable
}
