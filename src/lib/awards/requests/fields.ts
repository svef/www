import { and, eq, isNull } from 'drizzle-orm'
import type { Queryable } from '../projects/db-types'
import { category, entry, entryAnswer, project, projectAnswer } from '../db/schema'
import { ENTRY_FIELDS, PROJECT_FIELDS, type FieldDefinition } from '../fields'
import { resolveAnswers } from '../visibility'

/** Never unlocked by a request: it is a one-off acceptance, not an answer to correct. */
const NOT_REQUESTABLE = new Set(['termsAccepted'])

/**
 * The fields a request on this entry may unlock: every field visible for the entry's project
 * (its categories and answers decide that), including login details, minus the terms waiver.
 * Staff pick from this list and the server validates the pick against it.
 */
export async function requestableFields(
  q: Queryable,
  entryId: string,
): Promise<FieldDefinition[]> {
  const [row] = await q
    .select({ projectId: entry.projectId, slug: category.slug })
    .from(entry)
    .innerJoin(category, eq(category.id, entry.categoryId))
    .innerJoin(project, eq(project.id, entry.projectId))
    .where(and(eq(entry.id, entryId), isNull(entry.deletedAt), isNull(project.deletedAt)))
  if (!row) return []

  const answers: Record<string, unknown> = {}
  for (const a of await q
    .select()
    .from(projectAnswer)
    .where(and(eq(projectAnswer.projectId, row.projectId), isNull(projectAnswer.deletedAt))))
    answers[a.fieldKey] = a.value
  for (const a of await q
    .select()
    .from(entryAnswer)
    .where(and(eq(entryAnswer.entryId, entryId), isNull(entryAnswer.deletedAt))))
    answers[a.fieldKey] = a.value

  const siblings = await q
    .select({ slug: category.slug, status: entry.status })
    .from(entry)
    .innerJoin(category, eq(category.id, entry.categoryId))
    .where(and(eq(entry.projectId, row.projectId), isNull(entry.deletedAt)))
  const slugs = siblings.filter((s) => s.status !== 'withdrawn').map((s) => s.slug)
  if (!slugs.includes(row.slug)) slugs.push(row.slug)

  const { visible } = resolveAnswers([...PROJECT_FIELDS, ...ENTRY_FIELDS], slugs, answers)
  return visible.filter((f) => !NOT_REQUESTABLE.has(f.key))
}
