import { getCategory } from '../categories'
import { priceFor } from '../pricing'
import { can } from '../status'
import { selectionViolations } from '../selection'
import { validateEntryAnswers, validateProjectAnswers } from '../validation'
import type { EntryStatus } from '../types'

/**
 * Bulk actions on the dashboard, as pure planners: given what was selected and the
 * state of each project, say what would happen and what would be skipped and why. Nothing
 * here reads the database or the clock; `loadPlanInput` (service.ts) gathers the state and
 * the server passes its own `now`. The same plan is shown in the confirmation and used to
 * decide what to run, and the run still goes through the real services, which re-check
 * everything (the plan is a preview, never the authority).
 *
 * Rules that apply to all three actions:
 *  - Bulk actions never force an edit lock: a project someone else is editing is skipped.
 *  - A person only acts on projects they can edit; withdraw is the creator's alone.
 */

export type BulkKind = 'submit' | 'withdraw' | 'billing'

export type BulkSkipReason =
  | 'no_access'
  | 'locked'
  | 'closed'
  | 'not_open'
  | 'email_unverified'
  | 'no_billing'
  | 'terms_not_accepted'
  | 'project_incomplete'
  | 'entry_incomplete'
  | 'category_conflict'
  | 'not_submittable'
  | 'not_creator'
  | 'not_submitted'
  | 'unchanged'
  | 'profile_not_found'
  | 'unexpected'

export type PlanEntry = {
  id: string
  category: string
  status: EntryStatus
  /** Entry-scope answers (the pitch). */
  answers: Record<string, unknown>
  /** The category's regular price (whole ISK). */
  regular: number
  /** The locked price; null unless submitted. */
  price: { regular: number; discountPercent: number; amount: number } | null
}

export type PlanProject = {
  id: string
  title: string
  /** The acting person's role; null when they have no access (the entry is skipped). */
  role: 'creator' | 'editor' | null
  /** Name of the person holding a live edit lock that is not the actor's, else null. */
  lockedBy: string | null
  emailVerified: boolean
  billingProfileId: string | null
  /** The terms in force are accepted for this project. */
  termsAccepted: boolean
  /** Project-scope answers. */
  answers: Record<string, unknown>
  /** Every live entry of the project (the selection is a subset). */
  entries: PlanEntry[]
  /** The selected entry ids that belong to this project, in selection order. */
  selected: string[]
}

export type PlanContext = {
  now: Date
  intakeOpensAt: Date
  intakeClosesBefore: Date
  earlyBird: { endsBefore: Date; discountPercent: number }
}

export type Skipped = {
  projectId: string
  projectTitle: string
  entryId: string | null
  category: string | null
  reason: BulkSkipReason
  /** `locked`: who is editing. */
  detail?: string
}

export type SubmitItem = {
  projectId: string
  projectTitle: string
  entryId: string
  category: string
  /** The price that would be locked now (whole ISK). */
  amount: number
  regular: number
  early: boolean
  /** A withdrawn entry being submitted again. */
  resubmit: boolean
}

export type WithdrawItem = {
  projectId: string
  projectTitle: string
  entryId: string
  category: string
  /** The locked price that would be cleared. */
  lockedAmount: number
  /** The locked price is an early-bird price, which withdrawing gives up. */
  hadEarlyBird: boolean
  /** What the entry costs at the regular price (the price once the early bird is over). */
  regular: number
}

export type BillingItem = { projectId: string; projectTitle: string }

export type SubmitPlan = { kind: 'submit'; items: SubmitItem[]; skipped: Skipped[]; total: number }
export type WithdrawPlan = {
  kind: 'withdraw'
  items: WithdrawItem[]
  skipped: Skipped[]
  /** Whether any item gives up an early-bird price. */
  givesUpEarlyBird: boolean
}
export type BillingPlan = { kind: 'billing'; items: BillingItem[]; skipped: Skipped[] }
export type BulkPlan = SubmitPlan | WithdrawPlan | BillingPlan

const skip = (
  p: PlanProject,
  reason: BulkSkipReason,
  e?: Pick<PlanEntry, 'id' | 'category'> | null,
  detail?: string,
): Skipped => ({
  projectId: p.id,
  projectTitle: p.title,
  entryId: e?.id ?? null,
  category: e?.category ?? null,
  reason,
  ...(detail ? { detail } : {}),
})

/** Where the intake window stands: the dates are the server's, never the browser's. */
function windowOf(ctx: PlanContext): 'not_open' | 'open' | 'closed' {
  const now = ctx.now.getTime()
  if (now < ctx.intakeOpensAt.getTime()) return 'not_open'
  if (now >= ctx.intakeClosesBefore.getTime()) return 'closed'
  return 'open'
}

/** The selected entries of a project, in selection order, dropping ids that are not its own. */
const selectedEntries = (p: PlanProject) =>
  p.selected.flatMap((id) => {
    const e = p.entries.find((x) => x.id === id)
    return e ? [e] : []
  })

export function planSubmit(projects: PlanProject[], ctx: PlanContext): SubmitPlan {
  const items: SubmitItem[] = []
  const skipped: Skipped[] = []
  const window = windowOf(ctx)
  for (const p of projects) {
    const picked = selectedEntries(p)
    if (p.role === null) {
      for (const e of picked) skipped.push(skip(p, 'no_access', e))
      continue
    }
    // Everything the whole project has to satisfy is the same for each of its entries.
    const projectLevel = (): BulkSkipReason | null => {
      if (p.lockedBy) return 'locked'
      if (!p.emailVerified) return 'email_unverified'
      if (window === 'closed') return 'closed'
      if (window === 'not_open') return 'not_open'
      if (!p.billingProfileId) return 'no_billing'
      if (!p.termsAccepted) return 'terms_not_accepted'
      return null
    }
    const candidates = picked.filter((e) => e.status === 'draft' || e.status === 'withdrawn')
    for (const e of picked)
      if (!candidates.includes(e)) skipped.push(skip(p, 'not_submittable', e))
    if (candidates.length === 0) continue

    const blocked = projectLevel()
    if (blocked) {
      for (const e of candidates)
        skipped.push(skip(p, blocked, e, blocked === 'locked' ? (p.lockedBy ?? '') : undefined))
      continue
    }

    // Validation sees the whole live project, as the real submit does.
    const categories = [
      ...new Set([
        ...p.entries.filter((e) => e.status !== 'withdrawn').map((e) => e.category),
        ...candidates.map((e) => e.category),
      ]),
    ]
    const projectCheck = validateProjectAnswers(
      categories,
      { ...p.answers, termsAccepted: true },
      'submit',
    )
    const conflicts = new Set(
      selectionViolations(categories).flatMap((v) => ('categories' in v ? v.categories : [])),
    )
    for (const e of candidates) {
      if (e.status === 'withdrawn' && conflicts.has(e.category)) {
        skipped.push(skip(p, 'category_conflict', e))
        continue
      }
      if (!projectCheck.ok) {
        skipped.push(skip(p, 'project_incomplete', e))
        continue
      }
      if (!validateEntryAnswers(categories, e.answers, 'submit').ok) {
        skipped.push(skip(p, 'entry_incomplete', e))
        continue
      }
      const snapshot = priceFor(
        ctx.now,
        {
          earlyBirdEndsBefore: ctx.earlyBird.endsBefore.toISOString(),
          earlyBirdDiscountPercent: ctx.earlyBird.discountPercent,
          earlyBirdRounding: 'nearest-900',
        },
        e.regular || getCategory(e.category)?.price || 0,
      )
      items.push({
        projectId: p.id,
        projectTitle: p.title,
        entryId: e.id,
        category: e.category,
        amount: snapshot.priceAmount,
        regular: snapshot.priceRegular,
        early: snapshot.tier === 'early',
        resubmit: e.status === 'withdrawn',
      })
    }
  }
  return { kind: 'submit', items, skipped, total: items.reduce((n, i) => n + i.amount, 0) }
}

export function planWithdraw(projects: PlanProject[], ctx: PlanContext): WithdrawPlan {
  const items: WithdrawItem[] = []
  const skipped: Skipped[] = []
  const window = windowOf(ctx)
  for (const p of projects) {
    for (const e of selectedEntries(p)) {
      if (p.role === null) skipped.push(skip(p, 'no_access', e))
      else if (!can('withdraw', [p.role])) skipped.push(skip(p, 'not_creator', e))
      else if (e.status !== 'submitted') skipped.push(skip(p, 'not_submitted', e))
      else if (window !== 'open') skipped.push(skip(p, window === 'closed' ? 'closed' : 'not_open', e))
      else if (p.lockedBy) skipped.push(skip(p, 'locked', e, p.lockedBy))
      else
        items.push({
          projectId: p.id,
          projectTitle: p.title,
          entryId: e.id,
          category: e.category,
          lockedAmount: e.price?.amount ?? 0,
          hadEarlyBird: (e.price?.discountPercent ?? 0) > 0,
          regular: e.price?.regular ?? e.regular,
        })
    }
  }
  return { kind: 'withdraw', items, skipped, givesUpEarlyBird: items.some((i) => i.hadEarlyBird) }
}

/**
 * Change who is invoiced. Projects, not entries: a project with several selected entries is
 * one item. `profileFound` is whether the chosen profile is the actor's own.
 */
export function planBilling(
  projects: PlanProject[],
  ctx: PlanContext,
  target: { profileId: string; profileFound: boolean },
): BillingPlan {
  const items: BillingItem[] = []
  const skipped: Skipped[] = []
  const window = windowOf(ctx)
  for (const p of projects) {
    if (p.selected.length === 0) continue
    if (!target.profileFound) skipped.push(skip(p, 'profile_not_found'))
    else if (p.role === null) skipped.push(skip(p, 'no_access'))
    else if (window === 'closed') skipped.push(skip(p, 'closed'))
    else if (p.lockedBy) skipped.push(skip(p, 'locked', null, p.lockedBy))
    else if (p.billingProfileId === target.profileId) skipped.push(skip(p, 'unchanged'))
    else items.push({ projectId: p.id, projectTitle: p.title })
  }
  return { kind: 'billing', items, skipped }
}
