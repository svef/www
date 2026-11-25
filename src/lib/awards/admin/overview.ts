import { and, asc, count, desc, eq, isNull, sql } from 'drizzle-orm'
import type { AwardsDb } from '../db/client'
import { category, entry, entryEvent, project, userEvent } from '../db/schema'
import { ENTRY_STATUSES, type EntryStatus } from '../types'

/**
 * The admin overview (Stjórnborð → Staðan): entries counted by category and status, and the
 * most recent changes across every project and account. Grouped and limited in the database.
 */

export type StatusCounts = Record<EntryStatus, number>

export type CategoryCounts = {
  id: string
  name: { is: string; en: string }
  counts: StatusCounts
  total: number
}

export type EditionCounts = {
  categories: CategoryCounts[]
  totals: StatusCounts
  /** Every live entry, any status. */
  entries: number
  /** Live projects in the edition, including ones with no category yet. */
  projects: number
}

export const emptyCounts = (): StatusCounts =>
  Object.fromEntries(ENTRY_STATUSES.map((s) => [s, 0])) as StatusCounts

/**
 * Folds `(category, status, n)` rows into one row per category, in the given order, with
 * every status present (zero when nothing has it) and the edition's totals. Pure.
 */
export function foldCounts(
  categories: readonly { id: string; name: { is: string; en: string } }[],
  rows: readonly { categoryId: string; status: string; n: number }[],
): Pick<EditionCounts, 'categories' | 'totals' | 'entries'> {
  const byId = new Map(
    categories.map((c) => [c.id, { id: c.id, name: c.name, counts: emptyCounts(), total: 0 }]),
  )
  const totals = emptyCounts()
  let entries = 0
  for (const r of rows) {
    const row = byId.get(r.categoryId)
    if (!row || !Object.hasOwn(totals, r.status)) continue
    const s = r.status as EntryStatus
    row.counts[s] += r.n
    row.total += r.n
    totals[s] += r.n
    entries += r.n
  }
  return { categories: [...byId.values()], totals, entries }
}

export async function countEdition(db: AwardsDb, editionId: string): Promise<EditionCounts> {
  const categories = await db
    .select({ id: category.id, name: category.name })
    .from(category)
    .where(and(eq(category.editionId, editionId), isNull(category.deletedAt)))
    .orderBy(asc(category.sortOrder))
  const rows = await db
    .select({ categoryId: entry.categoryId, status: entry.status, n: count() })
    .from(entry)
    .innerJoin(project, eq(project.id, entry.projectId))
    .where(and(eq(project.editionId, editionId), isNull(project.deletedAt), isNull(entry.deletedAt)))
    .groupBy(entry.categoryId, entry.status)
  const [{ projects }] = await db
    .select({ projects: count() })
    .from(project)
    .where(and(eq(project.editionId, editionId), isNull(project.deletedAt)))
  return { ...foldCounts(categories, rows), projects }
}

export type ActivityItem = {
  id: string
  at: Date
  kind: 'entry' | 'user'
  type: string
  actorName: string | null
  /** The project's title (entry events) or the account's name (user events). */
  subject: string
  categoryName: { is: string; en: string } | null
  /** Where the item leads in the admin: an entry, or a user. */
  entryId: string | null
  userId: string | null
  data: unknown
}

/** The `limit` most recent events from both logs, newest first. */
export async function recentActivity(db: AwardsDb, limit = 12): Promise<ActivityItem[]> {
  // Written out in full SQL: these are correlated subqueries, and the outer row's columns must
  // be qualified (Drizzle leaves them bare in a single-table select).
  const actorOf = (table: 'entry_event' | 'user_event') =>
    sql<string | null>`(select "a"."name" from "user" as "a" where "a"."id" = ${sql.raw(`"${table}"."actor_user_id"`)})`
  const titleOf = sql<string | null>`(select "pa"."value" #>> '{}' from "project_answer" as "pa" where "pa"."project_id" = "entry_event"."project_id" and "pa"."field_key" = 'title' and "pa"."deleted_at" is null)`
  const categoryOf = sql<{ is: string; en: string } | null>`(select "c"."name" from "entry" as "e" join "category" as "c" on "c"."id" = "e"."category_id" where "e"."id" = "entry_event"."entry_id")`
  // The first entry of the project, for events that belong to the project as a whole.
  const anyEntry = sql<string | null>`coalesce("entry_event"."entry_id", (select "e"."id" from "entry" as "e" where "e"."project_id" = "entry_event"."project_id" and "e"."deleted_at" is null order by "e"."created_at" limit 1))`

  const entries = await db
    .select({
      id: entryEvent.id,
      at: entryEvent.createdAt,
      type: entryEvent.type,
      actorName: actorOf('entry_event'),
      title: titleOf,
      categoryName: categoryOf,
      entryId: anyEntry,
      data: entryEvent.data,
    })
    .from(entryEvent)
    .innerJoin(project, eq(project.id, entryEvent.projectId))
    .where(isNull(project.deletedAt))
    .orderBy(desc(entryEvent.createdAt))
    .limit(limit)
  const subjectName = sql<string>`(select "s"."name" from "user" as "s" where "s"."id" = "user_event"."user_id")`
  const users = await db
    .select({
      id: userEvent.id,
      at: userEvent.createdAt,
      type: userEvent.type,
      actorName: actorOf('user_event'),
      subject: subjectName,
      userId: userEvent.userId,
      data: userEvent.data,
    })
    .from(userEvent)
    .orderBy(desc(userEvent.createdAt))
    .limit(limit)

  const items: ActivityItem[] = [
    ...entries.map((e) => ({
      id: e.id,
      at: e.at,
      kind: 'entry' as const,
      type: e.type,
      actorName: e.actorName,
      subject: e.title ?? '',
      categoryName: e.categoryName,
      entryId: e.entryId,
      userId: null,
      data: e.data,
    })),
    ...users.map((u) => ({
      id: u.id,
      at: u.at,
      kind: 'user' as const,
      type: u.type,
      actorName: u.actorName,
      subject: u.subject ?? '',
      categoryName: null,
      entryId: null,
      userId: u.userId,
      data: u.data,
    })),
  ]
  return items.sort((a, b) => b.at.getTime() - a.at.getTime() || b.id.localeCompare(a.id)).slice(0, limit)
}
