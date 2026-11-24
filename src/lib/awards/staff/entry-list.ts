import { and, asc, count, desc, eq, ilike, inArray, isNull, sql, type SQL } from 'drizzle-orm'
import type { AwardsDb } from '../db/client'
import { billingProfile, category, entry, project, projectAnswer } from '../db/schema'
import { ENTRY_STATUSES, SUBMITTED_LIKE_STATUSES, type EntryStatus } from '../types'

/**
 * The staff area's entries list: filtered by category, status and a search on the
 * project title, sorted, and paginated in the database. Plain query; the page only
 * renders what comes back.
 */

export const PAGE_SIZE = 25
export const SORT_KEYS = ['title', 'category', 'company', 'submitted', 'status'] as const
export type SortKey = (typeof SORT_KEYS)[number]
export type SortDir = 'asc' | 'desc'

/**
 * `submitted` (the default) is every entry that was submitted and not withdrawn, the set
 * the eligibility work and the export are about. `all` adds drafts and withdrawn ones;
 * any single status shows just that.
 */
export type StatusFilter = 'submitted' | 'all' | EntryStatus
export const STATUS_FILTERS: readonly StatusFilter[] = ['submitted', 'all', ...ENTRY_STATUSES]

export type ListParams = {
  editionId: string
  categoryId?: string
  status?: StatusFilter
  /** Matched anywhere in the project title, case-insensitively. */
  search?: string
  sort?: SortKey
  dir?: SortDir
  /** 1-based. */
  page?: number
  pageSize?: number
}

export type StaffEntryRow = {
  entryId: string
  projectId: string
  status: EntryStatus
  projectTitle: string
  categoryName: string
  submittedAt: Date | null
  company: string | null
}

export type StaffEntryPage = {
  rows: StaffEntryRow[]
  total: number
  page: number
  pageSize: number
  pageCount: number
}

/** `%`, `_` and the escape character itself are literal in a search box. */
export function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (c) => `\\${c}`)
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

/** Reads the list's query string; anything unrecognised falls back to the default. */
export function parseListSearch(search: Record<string, string | string[] | undefined>): {
  categoryId?: string
  status: StatusFilter
  q: string
  sort: SortKey
  dir: SortDir
  page: number
} {
  const status = first(search.status) ?? ''
  const sort = first(search.sort) ?? ''
  const page = Number(first(search.page))
  return {
    categoryId: first(search.category) || undefined,
    status: (STATUS_FILTERS as readonly string[]).includes(status)
      ? (status as StatusFilter)
      : 'submitted',
    q: (first(search.q) ?? '').trim().slice(0, 100),
    sort: (SORT_KEYS as readonly string[]).includes(sort) ? (sort as SortKey) : 'submitted',
    dir: first(search.dir) === 'desc' ? 'desc' : 'asc',
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  }
}

const titleText = sql<string>`(${projectAnswer.value} #>> '{}')`

function statusCondition(status: StatusFilter): SQL | undefined {
  if (status === 'all') return undefined
  if (status === 'submitted') return inArray(entry.status, [...SUBMITTED_LIKE_STATUSES])
  return eq(entry.status, status)
}

function orderBy(sort: SortKey, dir: SortDir): SQL[] {
  const d = dir === 'desc' ? desc : asc
  // The category's own name is JSON; sort on the Icelandic text. Ties break on the entry id
  // so a page boundary never repeats or skips a row.
  const key: SQL =
    sort === 'title'
      ? d(sql`lower(${titleText})`)
      : sort === 'category'
        ? d(sql`${category.name} ->> 'is'`)
        : sort === 'company'
          ? d(sql`lower(${billingProfile.companyName})`)
          : sort === 'status'
            ? d(entry.status)
            : d(entry.submittedAt)
  return [key, asc(entry.id)]
}

export async function listStaffEntries(db: AwardsDb, params: ListParams): Promise<StaffEntryPage> {
  const pageSize = Math.max(1, params.pageSize ?? PAGE_SIZE)
  const search = params.search?.trim()
  const where = and(
    eq(project.editionId, params.editionId),
    isNull(project.deletedAt),
    isNull(entry.deletedAt),
    params.categoryId ? eq(entry.categoryId, params.categoryId) : undefined,
    statusCondition(params.status ?? 'submitted'),
    search ? ilike(titleText, `%${escapeLike(search)}%`) : undefined,
  )
  const [{ total }] = await db
    .select({ total: count() })
    .from(entry)
    .innerJoin(project, eq(project.id, entry.projectId))
    .leftJoin(
      projectAnswer,
      and(
        eq(projectAnswer.projectId, project.id),
        eq(projectAnswer.fieldKey, 'title'),
        isNull(projectAnswer.deletedAt),
      ),
    )
    .where(where)

  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  // A page past the end (a stale link, a filter that shrank the list) shows the last one.
  const page = Math.min(Math.max(1, params.page ?? 1), pageCount)

  const rows = await db
    .select({
      entryId: entry.id,
      projectId: entry.projectId,
      status: entry.status,
      submittedAt: entry.submittedAt,
      title: titleText,
      categoryName: category.name,
      company: billingProfile.companyName,
    })
    .from(entry)
    .innerJoin(project, eq(project.id, entry.projectId))
    .innerJoin(category, eq(category.id, entry.categoryId))
    .leftJoin(billingProfile, eq(billingProfile.id, project.billingProfileId))
    .leftJoin(
      projectAnswer,
      and(
        eq(projectAnswer.projectId, project.id),
        eq(projectAnswer.fieldKey, 'title'),
        isNull(projectAnswer.deletedAt),
      ),
    )
    .where(where)
    .orderBy(...orderBy(params.sort ?? 'submitted', params.dir ?? 'asc'))
    .limit(pageSize)
    .offset((page - 1) * pageSize)

  return {
    rows: rows.map((r) => ({
      entryId: r.entryId,
      projectId: r.projectId,
      status: r.status as EntryStatus,
      projectTitle: r.title ?? '',
      categoryName: r.categoryName.is,
      submittedAt: r.submittedAt,
      company: r.company ?? null,
    })),
    total,
    page,
    pageSize,
    pageCount,
  }
}
