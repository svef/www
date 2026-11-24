import { and, asc, eq, isNull } from 'drizzle-orm'
import { category, edition, entry, entryRequest, project, projectAnswer } from '../db/schema'
import type { Queryable } from '../projects/db-types'
import { requestStatus, type RequestStatus } from './rules'
import { listRequestsForEntry, type RequestView } from './service'

export { listRequestsForEntry }

/**
 * An entrant's requests for one project, across its entries, with the category of each.
 * The caller has already proved the viewer is the creator or an accepted editor.
 */
export async function listRequestsForProject(
  q: Queryable,
  projectId: string,
  now: Date,
): Promise<RequestView[]> {
  const entries = await q
    .select({ id: entry.id, slug: category.slug })
    .from(entry)
    .innerJoin(category, eq(category.id, entry.categoryId))
    .where(and(eq(entry.projectId, projectId), isNull(entry.deletedAt)))
  const views: RequestView[] = []
  for (const e of entries) views.push(...(await listRequestsForEntry(q, e.id, now)))
  return views
    .map((v) => ({ ...v, category: entries.find((e) => e.id === v.entryId)?.slug ?? '' }))
    .sort((a, b) => a.deadlineAt.getTime() - b.deadlineAt.getTime())
}

export type StaffRequestRow = {
  requestId: string
  entryId: string
  projectTitle: string
  categoryName: { is: string; en: string }
  message: string
  deadlineAt: Date
  status: Exclude<RequestStatus, 'resolved'>
}

/**
 * Every unresolved request in an edition for the staff-wide view, overdue first and then by
 * the nearest deadline. `status` narrows to one.
 */
export async function listStaffRequests(
  q: Queryable,
  input: { editionId: string; now: Date; status?: 'open' | 'overdue' },
): Promise<StaffRequestRow[]> {
  const rows = await q
    .select({
      requestId: entryRequest.id,
      entryId: entry.id,
      message: entryRequest.message,
      deadlineAt: entryRequest.deadlineAt,
      resolvedAt: entryRequest.resolvedAt,
      title: projectAnswer.value,
      categoryName: category.name,
    })
    .from(entryRequest)
    .innerJoin(entry, eq(entry.id, entryRequest.entryId))
    .innerJoin(project, eq(project.id, entry.projectId))
    .innerJoin(edition, eq(edition.id, project.editionId))
    .innerJoin(category, eq(category.id, entry.categoryId))
    .leftJoin(
      projectAnswer,
      and(
        eq(projectAnswer.projectId, project.id),
        eq(projectAnswer.fieldKey, 'title'),
        isNull(projectAnswer.deletedAt),
      ),
    )
    .where(
      and(
        eq(project.editionId, input.editionId),
        isNull(entryRequest.resolvedAt),
        isNull(entryRequest.deletedAt),
        isNull(entry.deletedAt),
        isNull(project.deletedAt),
      ),
    )
    .orderBy(asc(entryRequest.deadlineAt))
  const out: StaffRequestRow[] = rows
    .map((r) => ({
      requestId: r.requestId,
      entryId: r.entryId,
      projectTitle: typeof r.title === 'string' ? r.title : '',
      categoryName: r.categoryName,
      message: r.message,
      deadlineAt: r.deadlineAt,
      status: requestStatus(r, input.now) as 'open' | 'overdue',
    }))
    .filter((r) => !input.status || r.status === input.status)
  return out
}
