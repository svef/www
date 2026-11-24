import { and, asc, count, desc, eq, ilike, inArray, isNull, or, sql, type SQL } from 'drizzle-orm'
import type { AwardsDb } from '../db/client'
import {
  category,
  edition,
  entry,
  project,
  projectAnswer,
  projectPerson,
  user,
  userEvent,
} from '../db/schema'
import { ADMIN_ROLE } from '../auth/roles'
import { escapeLike } from '../staff/entry-list'
import type { EntryStatus } from '../types'

/**
 * The admin's user list and user page (Stjórnborð → Notendur). Searched, filtered, sorted
 * and paged in the database; every view is a URL (`parseUserSearch`).
 */

export const USER_PAGE_SIZE = 25
export const USER_SORT_KEYS = ['name', 'email', 'created', 'projects'] as const
export type UserSortKey = (typeof USER_SORT_KEYS)[number]
export const USER_ROLE_FILTERS = ['all', 'admin'] as const
export type UserRoleFilter = (typeof USER_ROLE_FILTERS)[number]

export type UserListParams = {
  q: string
  role: UserRoleFilter
  sort: UserSortKey
  dir: 'asc' | 'desc'
  page: number
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

/** Reads the list's query string; anything unrecognised falls back to the default (newest first). */
export function parseUserSearch(
  search: Record<string, string | string[] | undefined>,
): UserListParams {
  const sort = first(search.sort) ?? ''
  const role = first(search.role) ?? ''
  const page = Number(first(search.page))
  const known = (USER_SORT_KEYS as readonly string[]).includes(sort)
  return {
    q: (first(search.q) ?? '').trim().slice(0, 100),
    role: (USER_ROLE_FILTERS as readonly string[]).includes(role) ? (role as UserRoleFilter) : 'all',
    sort: known ? (sort as UserSortKey) : 'created',
    // Newest first is the useful default; a chosen column starts ascending unless told.
    dir: first(search.dir) === 'asc' ? 'asc' : first(search.dir) === 'desc' ? 'desc' : known ? 'asc' : 'desc',
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  }
}

export type UserRow = {
  id: string
  name: string
  email: string
  emailVerified: boolean
  createdAt: Date
  isAdmin: boolean
  /** Live projects the user created, in any edition. */
  projects: number
}

export type UserPage = {
  rows: UserRow[]
  total: number
  page: number
  pageSize: number
  pageCount: number
}

// Correlated subqueries name the outer row in full: in a single-table select Drizzle writes
// its columns unqualified, and an unqualified "id" inside the subquery would be the inner one.
const outerUserId = sql.raw('"user"."id"')
const isAdminSql = sql<boolean>`exists (select 1 from "user_role" where "user_role"."user_id" = ${outerUserId} and "user_role"."role" = ${ADMIN_ROLE} and "user_role"."deleted_at" is null)`
const projectCountSql = sql<number>`(select count(*)::int from "project" where "project"."created_by" = ${outerUserId} and "project"."deleted_at" is null)`

function orderBy(sort: UserSortKey, dir: 'asc' | 'desc'): SQL[] {
  const d = dir === 'desc' ? desc : asc
  const key =
    sort === 'name'
      ? d(sql`lower(${user.name})`)
      : sort === 'email'
        ? d(sql`lower(${user.email})`)
        : sort === 'projects'
          ? d(projectCountSql)
          : d(user.createdAt)
  return [key, asc(user.id)]
}

export async function listUsers(
  db: AwardsDb,
  params: Partial<UserListParams> & { pageSize?: number },
): Promise<UserPage> {
  const pageSize = Math.max(1, params.pageSize ?? USER_PAGE_SIZE)
  const q = params.q?.trim()
  const where = and(
    isNull(user.deletedAt),
    q ? or(ilike(user.name, `%${escapeLike(q)}%`), ilike(user.email, `%${escapeLike(q)}%`)) : undefined,
    params.role === 'admin' ? isAdminSql : undefined,
  )
  const [{ total }] = await db.select({ total: count() }).from(user).where(where)
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const page = Math.min(Math.max(1, params.page ?? 1), pageCount)
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      isAdmin: isAdminSql,
      projects: projectCountSql,
    })
    .from(user)
    .where(where)
    .orderBy(...orderBy(params.sort ?? 'created', params.dir ?? 'desc'))
    .limit(pageSize)
    .offset((page - 1) * pageSize)
  return {
    rows: rows.map((r) => ({ ...r, isAdmin: r.isAdmin === true, projects: Number(r.projects) })),
    total,
    page,
    pageSize,
    pageCount,
  }
}

export type UserProjectEntry = {
  entryId: string
  categoryName: { is: string; en: string }
  status: EntryStatus
}

export type UserProject = {
  projectId: string
  title: string
  year: number
  entries: UserProjectEntry[]
}

export type UserMembership = UserProject & {
  kind: 'owner' | 'collaborator'
  /** The credit role the creator wrote for them (designer, developer…). */
  creditRole: string | null
  canEdit: boolean
  acceptedAt: Date | null
}

export type UserEventRow = {
  id: string
  type: string
  data: unknown
  createdAt: Date
  actorName: string | null
}

export type UserDetail = {
  id: string
  name: string
  email: string
  phone: string | null
  emailVerified: boolean
  preferredLocale: string | null
  createdAt: Date
  isAdmin: boolean
  projects: UserProject[]
  memberships: UserMembership[]
  events: UserEventRow[]
}

/** Live projects (by id) with their title, edition year and live entries. */
async function projectsWithEntries(db: AwardsDb, ids: string[]): Promise<Map<string, UserProject>> {
  const out = new Map<string, UserProject>()
  if (ids.length === 0) return out
  const rows = await db
    .select({
      projectId: project.id,
      createdAt: project.createdAt,
      year: edition.year,
      title: sql<string | null>`(${projectAnswer.value} #>> '{}')`,
    })
    .from(project)
    .innerJoin(edition, eq(edition.id, project.editionId))
    .leftJoin(
      projectAnswer,
      and(
        eq(projectAnswer.projectId, project.id),
        eq(projectAnswer.fieldKey, 'title'),
        isNull(projectAnswer.deletedAt),
      ),
    )
    .where(and(inArray(project.id, ids), isNull(project.deletedAt)))
    .orderBy(desc(edition.year), desc(project.createdAt))
  for (const r of rows)
    out.set(r.projectId, { projectId: r.projectId, title: r.title ?? '', year: r.year, entries: [] })
  const entries = await db
    .select({
      entryId: entry.id,
      projectId: entry.projectId,
      status: entry.status,
      categoryName: category.name,
    })
    .from(entry)
    .innerJoin(category, eq(category.id, entry.categoryId))
    .where(and(inArray(entry.projectId, ids), isNull(entry.deletedAt)))
    .orderBy(asc(category.sortOrder))
  for (const e of entries)
    out.get(e.projectId)?.entries.push({
      entryId: e.entryId,
      categoryName: e.categoryName,
      status: e.status as EntryStatus,
    })
  return out
}

export async function getUserDetail(db: AwardsDb, userId: string): Promise<UserDetail | null> {
  const [u] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      emailVerified: user.emailVerified,
      preferredLocale: user.preferredLocale,
      createdAt: user.createdAt,
      isAdmin: isAdminSql,
    })
    .from(user)
    .where(and(eq(user.id, userId), isNull(user.deletedAt)))
  if (!u) return null

  const created = await db
    .select({ id: project.id })
    .from(project)
    .where(and(eq(project.createdBy, userId), isNull(project.deletedAt)))
  const people = await db
    .select({
      projectId: projectPerson.projectId,
      kind: projectPerson.kind,
      role: projectPerson.role,
      canEdit: projectPerson.canEdit,
      acceptedAt: projectPerson.acceptedAt,
    })
    .from(projectPerson)
    .where(and(eq(projectPerson.userId, userId), isNull(projectPerson.deletedAt)))
  const all = await projectsWithEntries(db, [
    ...new Set([...created.map((p) => p.id), ...people.map((p) => p.projectId)]),
  ])
  const createdIds = new Set(created.map((p) => p.id))

  const actor = sql<string | null>`(select "actor"."name" from "user" as "actor" where "actor"."id" = "user_event"."actor_user_id")`
  const events = await db
    .select({
      id: userEvent.id,
      type: userEvent.type,
      data: userEvent.data,
      createdAt: userEvent.createdAt,
      actorName: actor,
    })
    .from(userEvent)
    .where(eq(userEvent.userId, userId))
    .orderBy(desc(userEvent.createdAt))
    .limit(50)

  return {
    ...u,
    isAdmin: u.isAdmin === true,
    projects: [...all.values()].filter((p) => createdIds.has(p.projectId)),
    memberships: people.flatMap((p) => {
      const proj = all.get(p.projectId)
      return proj
        ? [
            {
              ...proj,
              kind: p.kind as 'owner' | 'collaborator',
              creditRole: p.role,
              canEdit: p.canEdit,
              acceptedAt: p.acceptedAt,
            },
          ]
        : []
    }),
    events,
  }
}
