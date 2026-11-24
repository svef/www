import { and, asc, desc, eq, gt, inArray, isNotNull, isNull, or, sql } from 'drizzle-orm'
import type { AwardsDb } from '../db/client'
import {
  billingProfile,
  category,
  credential,
  edition,
  entry,
  entryAnswer,
  entryFile,
  entryRequest,
  project,
  projectAnswer,
  projectEditLock,
  projectPerson,
  termsAcceptance,
  user,
} from '../db/schema'
import { priceFor } from '../pricing'
import { LOCK_TTL_MS } from '../projects/lock-rules'
import { isSubmittedLike, type EntryStatus } from '../types'
import { missingForDraft } from './missing'
import { rankProjects } from './rank'
import type {
  DashboardData,
  DashboardEntry,
  DashboardLock,
  DashboardProject,
  DashboardRequest,
} from './types'

/**
 * The dashboard's data: every project the user created or may edit (an accepted
 * editor), in the latest edition, each with its entries, and ranked so what needs action
 * comes first. Reads only, in a handful of batched queries (never one per project), and takes
 * `now` so the price a draft would get and the lock's liveness follow the caller's clock.
 */
export async function loadDashboard(
  db: AwardsDb,
  args: { userId: string; now: Date },
): Promise<DashboardData | null> {
  const { userId, now } = args
  const [ed] = await db
    .select()
    .from(edition)
    .where(isNull(edition.deletedAt))
    .orderBy(desc(edition.year))
    .limit(1)
  if (!ed) return null
  const pricing = {
    earlyBirdEndsBefore: ed.earlyBirdEndsBefore.toISOString(),
    earlyBirdDiscountPercent: ed.earlyBirdDiscountPercent,
    earlyBirdRounding: 'nearest-900' as const,
  }
  const editionOut = {
    year: ed.year,
    intakeOpensAt: ed.intakeOpensAt.toISOString(),
    earlyBirdEndsBefore: ed.earlyBirdEndsBefore.toISOString(),
    intakeClosesBefore: ed.intakeClosesBefore.toISOString(),
  }

  const editable = db
    .select({ id: projectPerson.projectId })
    .from(projectPerson)
    .where(
      and(
        eq(projectPerson.userId, userId),
        eq(projectPerson.canEdit, true),
        isNotNull(projectPerson.acceptedAt),
        isNull(projectPerson.deletedAt),
      ),
    )
  const projects = await db
    .select()
    .from(project)
    .where(
      and(
        eq(project.editionId, ed.id),
        isNull(project.deletedAt),
        or(eq(project.createdBy, userId), inArray(project.id, editable)),
      ),
    )
    .orderBy(desc(project.updatedAt))
  if (projects.length === 0) return { edition: editionOut, projects: [], now: now.toISOString() }
  const projectIds = projects.map((p) => p.id)

  const entries = await db
    .select({
      e: entry,
      slug: category.slug,
      name: category.name,
      regular: category.price,
      sort: category.sortOrder,
    })
    .from(entry)
    .innerJoin(category, eq(category.id, entry.categoryId))
    .where(and(inArray(entry.projectId, projectIds), isNull(entry.deletedAt)))
    .orderBy(asc(category.sortOrder), asc(entry.createdAt))
  const entryIds = entries.map((r) => r.e.id)

  const [answers, entryAnswers, people, credentials, images, terms, requests, locks, billing] =
    await Promise.all([
      db
        .select()
        .from(projectAnswer)
        .where(and(inArray(projectAnswer.projectId, projectIds), isNull(projectAnswer.deletedAt))),
      entryIds.length
        ? db
            .select()
            .from(entryAnswer)
            .where(and(inArray(entryAnswer.entryId, entryIds), isNull(entryAnswer.deletedAt)))
        : [],
      db
        .select()
        .from(projectPerson)
        .where(and(inArray(projectPerson.projectId, projectIds), isNull(projectPerson.deletedAt)))
        .orderBy(asc(projectPerson.sortOrder), asc(projectPerson.createdAt)),
      db
        .select({ projectId: credential.projectId, n: sql<number>`count(*)::int` })
        .from(credential)
        .where(and(inArray(credential.projectId, projectIds), isNull(credential.deletedAt)))
        .groupBy(credential.projectId),
      db
        .select({ projectId: entryFile.projectId })
        .from(entryFile)
        .where(
          and(
            inArray(entryFile.projectId, projectIds),
            eq(entryFile.fieldKey, 'image'),
            eq(entryFile.status, 'available'),
            isNull(entryFile.deletedAt),
          ),
        ),
      db
        .select({ projectId: termsAcceptance.projectId })
        .from(termsAcceptance)
        .where(and(inArray(termsAcceptance.projectId, projectIds), isNull(termsAcceptance.deletedAt))),
      entryIds.length
        ? db
            .select()
            .from(entryRequest)
            .where(
              and(
                inArray(entryRequest.entryId, entryIds),
                isNull(entryRequest.resolvedAt),
                isNull(entryRequest.deletedAt),
              ),
            )
            .orderBy(asc(entryRequest.deadlineAt))
        : [],
      db
        .select({ lock: projectEditLock, holderName: user.name })
        .from(projectEditLock)
        .innerJoin(user, eq(user.id, projectEditLock.holderUserId))
        .where(
          and(
            inArray(projectEditLock.projectId, projectIds),
            gt(projectEditLock.lastActivityAt, new Date(now.getTime() - LOCK_TTL_MS)),
          ),
        ),
      db
        .select()
        .from(billingProfile)
        .where(
          inArray(
            billingProfile.id,
            projects.flatMap((p) => (p.billingProfileId ? [p.billingProfileId] : [])),
          ),
        ),
    ])

  const billingById = new Map(billing.map((b) => [b.id, b]))
  const lockByProject = new Map(locks.map((l) => [l.lock.projectId, l]))
  const credCount = new Map(credentials.map((c) => [c.projectId, c.n]))
  const hasImage = new Set(images.map((i) => i.projectId))
  const accepted = new Set(terms.map((t) => t.projectId))

  const out: DashboardProject[] = projects.map((p) => {
    const projectAnswers: Record<string, unknown> = {}
    for (const a of answers) if (a.projectId === p.id) projectAnswers[a.fieldKey] = a.value
    for (const [key, kind] of [
      ['owners', 'owner'],
      ['collaborators', 'collaborator'],
    ] as const) {
      const rows = people.filter((r) => r.projectId === p.id && r.kind === kind)
      if (rows.length)
        projectAnswers[key] = rows.map((r) => {
          const item: Record<string, unknown> = { name: r.name }
          if (r.email) item.email = r.email
          if (kind === 'owner' && r.company) item.company = r.company
          if (kind === 'collaborator') {
            if (r.role) item.role = r.role
            if (r.canEdit) item.canEdit = true
          }
          return item
        })
    }

    const mine = entries.filter((r) => r.e.projectId === p.id)
    const live = mine.filter((r) => r.e.status !== 'withdrawn').map((r) => r.slug)

    const rows: DashboardEntry[] = mine.map((r) => {
      const e = r.e
      const status = e.status as EntryStatus
      const locked = e.priceAmount !== null && isSubmittedLike(status)
      const would = locked ? null : priceFor(now, pricing, r.regular)
      const discount = locked ? (e.discountPercent ?? 0) : null
      const reqs: DashboardRequest[] = requests
        .filter((q) => q.entryId === e.id)
        .map((q) => ({
          id: q.id,
          entryId: e.id,
          message: q.message,
          deadlineAt: q.deadlineAt.toISOString(),
        }))
      const entryOwn: Record<string, unknown> = {}
      for (const a of entryAnswers) if (a.entryId === e.id) entryOwn[a.fieldKey] = a.value
      return {
        id: e.id,
        categorySlug: r.slug,
        categoryName: r.name,
        status,
        price: locked ? (e.priceAmount as number) : (would as { priceAmount: number }).priceAmount,
        priceKind: locked ? 'locked' : 'if-submitted-now',
        priceRegular: r.regular,
        earlyBird: locked ? (discount ?? 0) > 0 : (would as { tier: string }).tier === 'early',
        earlyBirdSecured: locked && (discount ?? 0) > 0,
        missing:
          status === 'draft'
            ? missingForDraft({
                categories: live,
                entryCategory: r.slug,
                answers: projectAnswers,
                entryAnswers: entryOwn,
                hasImage: hasImage.has(p.id),
                termsAccepted: accepted.has(p.id),
                credentialCount: credCount.get(p.id) ?? 0,
              })
            : [],
        requests: reqs,
      }
    })

    const lockRow = lockByProject.get(p.id)
    const lock: DashboardLock | null = lockRow
      ? {
          holderUserId: lockRow.lock.holderUserId,
          holderName: lockRow.holderName,
          since: lockRow.lock.acquiredAt.toISOString(),
          heldByViewer: lockRow.lock.holderUserId === userId,
        }
      : null
    const b = p.billingProfileId ? billingById.get(p.billingProfileId) : undefined
    const title = projectAnswers.title
    return {
      id: p.id,
      title: typeof title === 'string' ? title : '',
      role: p.createdBy === userId ? 'creator' : 'editor',
      updatedAt: p.updatedAt.toISOString(),
      billing: b
        ? {
            id: b.id,
            companyName: b.companyName,
            kennitala: b.kennitala,
            ownedByViewer: b.ownerUserId === userId,
          }
        : null,
      entries: rows,
      lock,
    }
  })

  return {
    edition: editionOut,
    projects: rankProjects(out, { now, ...ed }),
    now: now.toISOString(),
  }
}
