import { and, asc, count, desc, eq, exists, ilike, inArray, isNull, not, or, sql, type SQL } from 'drizzle-orm'
import type { AwardsDb } from '../db/client'
import { billingProfile, category, entry, entryEvent, project, projectAnswer, user } from '../db/schema'
import { ENTRY_STATUSES, SUBMITTED_LIKE_STATUSES, type EntryStatus } from '../types'

/**
 * The admin's entries list (Stjórnborð → Verkefni): filtered by category, status and
 * billing, searched on the project title, the payer and the creator, sorted, and paginated
 * in the database, so it holds up at hundreds of entries. Plain query; the page only renders
 * what comes back, and every view is a URL (`parseListSearch`).
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

/**
 * Billing and invoicing, as far as the database knows it: whether the project has a billing
 * profile, and whether the entry has been in an invoicing export (an `invoicing_exported`
 * event). `any` is no filter.
 */
export const BILLING_FILTERS = ['any', 'missing', 'present', 'exported', 'not_exported'] as const
export type BillingFilter = (typeof BILLING_FILTERS)[number]

export type ListParams = {
  editionId: string
  categoryId?: string
  status?: StatusFilter
  billing?: BillingFilter
  /** Matched anywhere in the project title, the payer's name or the creator's name or email, case-insensitively. */
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
  creatorName: string
  creatorEmail: string
  /** Has been in at least one invoicing export. */
  exported: boolean
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
  billing: BillingFilter
  q: string
  sort: SortKey
  dir: SortDir
  page: number
} {
  const status = first(search.status) ?? ''
  const billing = first(search.billing) ?? ''
  const sort = first(search.sort) ?? ''
  const page = Number(first(search.page))
  return {
    categoryId: first(search.category) || undefined,
    status: (STATUS_FILTERS as readonly string[]).includes(status)
      ? (status as StatusFilter)
      : 'submitted',
    billing: (BILLING_FILTERS as readonly string[]).includes(billing)
      ? (billing as BillingFilter)
      : 'any',
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

// Qualified in full: it is used inside correlated subqueries.
const exportedEntry = sql`"entry_event"."entry_id" = "entry"."id" and "entry_event"."type" = 'invoicing_exported'`

function billingCondition(db: AwardsDb, billing: BillingFilter): SQL | undefined {
  const wasExported = exists(db.select({ one: sql`1` }).from(entryEvent).where(exportedEntry))
  switch (billing) {
    case 'missing':
      return isNull(project.billingProfileId)
    case 'present':
      return sql`${project.billingProfileId} is not null`
    case 'exported':
      return wasExported
    case 'not_exported':
      return not(wasExported)
    default:
      return undefined
  }
}

function searchCondition(search: string | undefined): SQL | undefined {
  if (!search) return undefined
  const like = `%${escapeLike(search)}%`
  return or(
    ilike(titleText, like),
    ilike(billingProfile.companyName, like),
    ilike(user.name, like),
    ilike(user.email, like),
  )
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
  const where = and(
    eq(project.editionId, params.editionId),
    isNull(project.deletedAt),
    isNull(entry.deletedAt),
    params.categoryId ? eq(entry.categoryId, params.categoryId) : undefined,
    statusCondition(params.status ?? 'submitted'),
    billingCondition(db, params.billing ?? 'any'),
    searchCondition(params.search?.trim()),
  )
  const [{ total }] = await db
    .select({ total: count() })
    .from(entry)
    .innerJoin(project, eq(project.id, entry.projectId))
    .innerJoin(user, eq(user.id, project.createdBy))
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
      creatorName: user.name,
      creatorEmail: user.email,
      exported: sql<boolean>`exists (select 1 from "entry_event" where ${exportedEntry})`,
    })
    .from(entry)
    .innerJoin(project, eq(project.id, entry.projectId))
    .innerJoin(user, eq(user.id, project.createdBy))
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
      creatorName: r.creatorName,
      creatorEmail: r.creatorEmail,
      exported: r.exported === true,
    })),
    total,
    page,
    pageSize,
    pageCount,
  }
}
