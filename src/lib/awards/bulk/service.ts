import { and, desc, eq, inArray, isNull } from 'drizzle-orm'
import { billingProfile, category, edition, entry, termsAcceptance, user } from '../db/schema'
import { AwardsError } from '../projects/errors'
import { acquireLock, getLiveLock, releaseLock } from '../projects/lock'
import type { AwardsDb } from '../projects/db-types'
import {
  DRAFT_TERMS_VERSION,
  getRole,
  loadContext,
  setProjectBillingProfile,
  type Clock,
} from '../projects/service'
import { submitEntries, type SubmitDeps } from '../projects/submit'
import { withdrawEntry } from '../projects/withdraw'
import {
  planBilling,
  planSubmit,
  planWithdraw,
  type BulkKind,
  type BulkPlan,
  type BulkSkipReason,
  type PlanContext,
  type PlanProject,
  type Skipped,
} from './plan'

/**
 * Bulk actions, server side: load the selected entries' projects, plan, and (for a run) do the
 * work project by project. Each project takes its edit lock for the duration of its own work
 * and gives it back; a project somebody else is editing is skipped, never forced. If the
 * person already holds the lock themselves (the form is open in another tab) it is used and
 * left alone.
 */

export type BulkRequest = {
  userId: string
  kind: BulkKind
  /** The selected entry ids. Ids the person has no access to are ignored. */
  entryIds: string[]
  /** `billing`: the chosen profile (must be the person's own). */
  billingProfileId?: string
} & Clock

type Loaded = { projects: PlanProject[]; ctx: PlanContext; profileFound: boolean }

async function load(db: AwardsDb, args: BulkRequest): Promise<Loaded> {
  const now = args.now ?? new Date()
  const ids = [...new Set(args.entryIds)]
  const rows = ids.length
    ? await db
        .select({ id: entry.id, projectId: entry.projectId })
        .from(entry)
        .where(and(inArray(entry.id, ids), isNull(entry.deletedAt)))
    : []
  const projectOf = new Map(rows.map((r) => [r.id, r.projectId]))
  const projectIds = [...new Set(rows.map((r) => r.projectId))]

  const [account] = await db
    .select({ emailVerified: user.emailVerified })
    .from(user)
    .where(eq(user.id, args.userId))

  const projects: PlanProject[] = []
  for (const projectId of projectIds) {
    const role = await getRole(db, args.userId, projectId)
    if (!role) continue
    const c = await loadContext(db, projectId)
    const lock = await getLiveLock(db, projectId, now, args.ttlMs)
    const termsVersion = c.edition.termsVersion ?? DRAFT_TERMS_VERSION
    const [accepted] = await db
      .select({ id: termsAcceptance.id })
      .from(termsAcceptance)
      .where(
        and(
          eq(termsAcceptance.projectId, projectId),
          eq(termsAcceptance.termsVersion, termsVersion),
          isNull(termsAcceptance.deletedAt),
        ),
      )
      .limit(1)
    const prices = new Map(
      (
        await db
          .select({ id: category.id, price: category.price })
          .from(category)
          .where(eq(category.editionId, c.edition.id))
      ).map((x) => [x.id, x.price]),
    )
    projects.push({
      id: projectId,
      title: typeof c.answers.title === 'string' ? c.answers.title : '',
      role,
      lockedBy: lock && lock.holderUserId !== args.userId ? lock.holderName : null,
      emailVerified: account?.emailVerified ?? false,
      billingProfileId: c.project.billingProfileId,
      termsAccepted: Boolean(accepted),
      answers: c.answers,
      entries: c.entries.map((e) => ({
        id: e.id,
        category: e.category,
        status: e.status,
        answers: e.answers,
        regular: prices.get(e.categoryId) ?? 0,
        price: e.price,
      })),
      selected: ids.filter((id) => projectOf.get(id) === projectId),
    })
  }

  const [ed] = await db
    .select()
    .from(edition)
    .where(isNull(edition.deletedAt))
    .orderBy(desc(edition.year))
    .limit(1)
  if (!ed) throw new AwardsError('no_edition', 'There is no awards edition yet.')

  let profileFound = false
  if (args.billingProfileId) {
    const [own] = await db
      .select({ id: billingProfile.id })
      .from(billingProfile)
      .where(
        and(
          eq(billingProfile.id, args.billingProfileId),
          eq(billingProfile.ownerUserId, args.userId),
          isNull(billingProfile.deletedAt),
        ),
      )
    profileFound = Boolean(own)
  }
  return {
    projects,
    profileFound,
    ctx: {
      now,
      intakeOpensAt: ed.intakeOpensAt,
      intakeClosesBefore: ed.intakeClosesBefore,
      earlyBird: { endsBefore: ed.earlyBirdEndsBefore, discountPercent: ed.earlyBirdDiscountPercent },
    },
  }
}

function makePlan(kind: BulkKind, loaded: Loaded, profileId?: string): BulkPlan {
  if (kind === 'submit') return planSubmit(loaded.projects, loaded.ctx)
  if (kind === 'withdraw') return planWithdraw(loaded.projects, loaded.ctx)
  return planBilling(loaded.projects, loaded.ctx, {
    profileId: profileId ?? '',
    profileFound: loaded.profileFound,
  })
}

/** What the action would do right now. Read-only; this is what the confirmation shows. */
export async function planBulk(db: AwardsDb, args: BulkRequest): Promise<BulkPlan> {
  return makePlan(args.kind, await load(db, args), args.billingProfileId)
}

export type DoneItem = {
  projectId: string
  projectTitle: string
  /** Null for a project-level action (billing). */
  entryId: string | null
  category: string | null
  /** Submit: the price that was locked. */
  amount?: number
  early?: boolean
}

export type BulkResult = {
  kind: BulkKind
  done: DoneItem[]
  skipped: Skipped[]
  /** Submit: the locked total of what was submitted. */
  total: number
  /** Submit: receipt emails per project. */
  receipts: { sent: number; failed: number }
}

const REASON_OF_CODE: Partial<Record<string, BulkSkipReason>> = {
  lock_required: 'locked',
  intake_closed: 'closed',
  intake_not_open: 'not_open',
  email_unverified: 'email_unverified',
  billing_required: 'no_billing',
  terms_required: 'terms_not_accepted',
  forbidden: 'no_access',
  not_found: 'no_access',
  not_withdrawable: 'not_submitted',
}

/**
 * Runs `work` for one project under its edit lock. Returns null when the project is being
 * edited by someone else (the caller records the skip); the lock taken here is released
 * afterwards, one that was already the person's own is kept.
 */
async function underLock<T>(
  db: AwardsDb,
  args: { projectId: string; userId: string; now: Date; ttlMs?: number },
  work: () => Promise<T>,
): Promise<{ locked: true; holder: string } | { locked: false; value: T }> {
  const got = await acquireLock(db, args)
  if (!got.ok) return { locked: true, holder: got.lock.holderName }
  try {
    return { locked: false, value: await work() }
  } finally {
    if (got.outcome !== 'renewed')
      await releaseLock(db, args).catch((e) => console.error('[awards] bulk lock release failed', e))
  }
}

function failure(e: unknown): BulkSkipReason {
  if (e instanceof AwardsError) return REASON_OF_CODE[e.code] ?? 'unexpected'
  console.error('[awards] bulk action failed', e)
  return 'unexpected'
}

/** Plans, then does what the plan allows, project by project. The plan's skips are part of the result. */
export async function runBulk(
  db: AwardsDb,
  args: BulkRequest,
  deps: SubmitDeps = {},
): Promise<BulkResult> {
  const { userId } = args
  const loaded = await load(db, args)
  const now = loaded.ctx.now
  const plan = makePlan(args.kind, loaded, args.billingProfileId)
  const result: BulkResult = {
    kind: args.kind,
    done: [],
    skipped: [...plan.skipped],
    total: 0,
    receipts: { sent: 0, failed: 0 },
  }
  const byProject = <T extends { projectId: string }>(items: T[]) => {
    const m = new Map<string, T[]>()
    for (const i of items) m.set(i.projectId, [...(m.get(i.projectId) ?? []), i])
    return m
  }
  const lockArgs = (projectId: string) => ({ projectId, userId, now, ttlMs: args.ttlMs })

  if (plan.kind === 'submit') {
    for (const [projectId, items] of byProject(plan.items)) {
      const title = items[0].projectTitle
      const skipAll = (reason: BulkSkipReason, detail?: string) => {
        for (const i of items)
          result.skipped.push({
            projectId,
            projectTitle: title,
            entryId: i.entryId,
            category: i.category,
            reason,
            ...(detail ? { detail } : {}),
          })
      }
      try {
        const r = await underLock(db, lockArgs(projectId), () =>
          submitEntries(
            db,
            { userId, projectId, entryIds: items.map((i) => i.entryId), acceptTerms: false, now, ttlMs: args.ttlMs },
            deps,
          ),
        )
        if (r.locked) {
          skipAll('locked', r.holder)
          continue
        }
        for (const s of r.value.submitted) {
          result.done.push({
            projectId,
            projectTitle: title,
            entryId: s.entryId,
            category: s.category,
            amount: s.price.amount,
            early: s.early,
          })
          result.total += s.price.amount
        }
        for (const s of r.value.skipped)
          result.skipped.push({
            projectId,
            projectTitle: title,
            entryId: s.entryId,
            category: s.category,
            reason: s.reason,
          })
        for (const category of r.value.alreadySubmitted) {
          const i = items.find((x) => x.category === category)
          if (i) {
            result.skipped.push({
              projectId,
              projectTitle: title,
              entryId: i.entryId,
              category,
              reason: 'not_submittable',
            })
          }
        }
        if (r.value.receipt === 'sent') result.receipts.sent += 1
        if (r.value.receipt === 'failed') result.receipts.failed += 1
      } catch (e) {
        skipAll(failure(e))
      }
    }
  } else if (plan.kind === 'withdraw') {
    for (const [projectId, items] of byProject(plan.items)) {
      const title = items[0].projectTitle
      try {
        const r = await underLock(db, lockArgs(projectId), async () => {
          const out: { item: (typeof items)[number]; error?: BulkSkipReason }[] = []
          for (const i of items) {
            try {
              await withdrawEntry(db, { userId, projectId, entryId: i.entryId, now, ttlMs: args.ttlMs })
              out.push({ item: i })
            } catch (e) {
              out.push({ item: i, error: failure(e) })
            }
          }
          return out
        })
        if (r.locked) {
          for (const i of items)
            result.skipped.push({
              projectId,
              projectTitle: title,
              entryId: i.entryId,
              category: i.category,
              reason: 'locked',
              detail: r.holder,
            })
          continue
        }
        for (const o of r.value) {
          const base = { projectId, projectTitle: title, entryId: o.item.entryId, category: o.item.category }
          if (o.error) result.skipped.push({ ...base, reason: o.error })
          else result.done.push(base)
        }
      } catch (e) {
        for (const i of items)
          result.skipped.push({
            projectId,
            projectTitle: title,
            entryId: i.entryId,
            category: i.category,
            reason: failure(e),
          })
      }
    }
  } else {
    for (const i of plan.items) {
      const base = { projectId: i.projectId, projectTitle: i.projectTitle }
      try {
        const r = await underLock(db, lockArgs(i.projectId), () =>
          setProjectBillingProfile(db, {
            userId,
            projectId: i.projectId,
            billingProfileId: args.billingProfileId ?? null,
            now,
            ttlMs: args.ttlMs,
          }),
        )
        if (r.locked)
          result.skipped.push({ ...base, entryId: null, category: null, reason: 'locked', detail: r.holder })
        else result.done.push({ ...base, entryId: null, category: null })
      } catch (e) {
        result.skipped.push({ ...base, entryId: null, category: null, reason: failure(e) })
      }
    }
  }
  return result
}
