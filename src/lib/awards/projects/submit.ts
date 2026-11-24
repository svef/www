import { and, eq, isNull } from 'drizzle-orm'
import { appendEntryEvent } from '../db/entry-event'
import { billingProfile, category, entry, termsAcceptance, user } from '../db/schema'
import { receiptEmail, sendEmail, type OutgoingEmail } from '../email'
import { getCategory } from '../categories'
import { priceFor } from '../pricing'
import { selectionViolations } from '../selection'
import { transition } from '../status'
import type { EntryStatus } from '../types'
import { validateEntryAnswers, validateProjectAnswers } from '../validation'
import { getSiteUrl } from '@/lib/site-url'
import { localePath } from '@/lib/i18n'
import type { AwardsDb } from './db-types'
import { AwardsError } from './errors'
import { requireLock } from './lock'
import {
  TERMS_VERSION,
  loadContext,
  requireRole,
  type Clock,
} from './service'
import { PORTAL } from '@/lib/portal/paths'

/**
 * Submitting. One call submits every complete draft
 * entry of the project, or the single `entryId` (a category added after the first
 * submit). In one transaction it moves each entry to `submitted` through the status
 * rules, locks its price snapshot by the server clock, records the terms acceptance and
 * appends the events. Incomplete entries are skipped with a reason, not failed.
 *
 * It is safe to press twice: the lock-row update that proves the caller holds the edit
 * lock also serialises concurrent calls, so the second sees the entries already
 * submitted and returns them as `alreadySubmitted` without touching anything or
 * sending a second receipt.
 */

export type SkipReason = 'project_incomplete' | 'entry_incomplete' | 'category_conflict'

export type SubmittedEntry = {
  entryId: string
  category: string
  /** The locked price (whole ISK). */
  price: { regular: number; discountPercent: number; amount: number }
  early: boolean
}

export type SubmitResult = {
  submitted: SubmittedEntry[]
  skipped: { entryId: string; category: string; reason: SkipReason; fieldKeys: string[] }[]
  /** Categories that were already submitted (a repeated press), left alone. */
  alreadySubmitted: string[]
  /** Whether the receipt email went out; `none` when nothing was submitted. */
  receipt: 'sent' | 'failed' | 'none'
}

export type SubmitDeps = { send?: (message: OutgoingEmail) => Promise<void> }

export async function submitEntries(
  db: AwardsDb,
  args: {
    userId: string
    projectId: string
    /**
     * Submit only this entry (a draft, or a withdrawn one: that re-prices it now); omit to
     * submit every draft entry. A withdrawn entry is never picked up by the all-at-once call.
     */
    entryId?: string
    /** Submit exactly these entries (drafts or withdrawn ones). Used by the dashboard's bulk submit. */
    entryIds?: string[]
    /** The terms checkbox. Not needed again when this project already accepted the version in force. */
    acceptTerms: boolean
  } & Clock,
  deps: SubmitDeps = {},
): Promise<SubmitResult> {
  const { userId, projectId } = args
  const now = args.now ?? new Date()
  const role = await requireRole(db, userId, projectId)

  const outcome = await db.transaction(async (tx) => {
    await requireLock(tx, { projectId, userId, now, ttlMs: args.ttlMs })
    const ctx = await loadContext(tx, projectId)
    const ed = ctx.edition

    const [account] = await tx
      .select({
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        preferredLocale: user.preferredLocale,
      })
      .from(user)
      .where(eq(user.id, userId))
    if (!account?.emailVerified)
      throw new AwardsError('email_unverified', 'Verify your email address to submit.')
    if (now.getTime() < ed.intakeOpensAt.getTime())
      throw new AwardsError('intake_not_open', 'Submissions have not opened yet.')
    if (now.getTime() >= ctx.intakeClosesBefore.getTime())
      throw new AwardsError('intake_closed', 'Submissions have closed.')

    let candidates = ctx.entries.filter((e) => e.status === 'draft')
    const already: string[] = []
    if (args.entryId) {
      const one = ctx.entries.find((e) => e.id === args.entryId)
      if (!one) throw new AwardsError('not_found', 'Entry not found.')
      if (one.status === 'draft' || one.status === 'withdrawn') candidates = [one]
      else {
        candidates = []
        already.push(one.category)
      }
    } else if (args.entryIds) {
      const wanted = new Set(args.entryIds)
      const picked = ctx.entries.filter((e) => wanted.has(e.id))
      if (picked.length !== wanted.size) throw new AwardsError('not_found', 'Entry not found.')
      candidates = picked.filter((e) => e.status === 'draft' || e.status === 'withdrawn')
      already.push(...picked.filter((e) => !candidates.includes(e)).map((e) => e.category))
    } else {
      already.push(
        ...ctx.entries.filter((e) => e.status === 'submitted').map((e) => e.category),
      )
    }
    const result: SubmitResult = {
      submitted: [],
      skipped: [],
      alreadySubmitted: candidates.length ? [] : already,
      receipt: 'none',
    }
    if (candidates.length === 0) {
      if (already.length === 0)
        throw new AwardsError('nothing_to_submit', 'There is no draft entry to submit.')
      return { result, mail: null }
    }

    if (!ctx.project.billingProfileId)
      throw new AwardsError('billing_required', 'Choose who is invoiced before submitting.')

    const termsVersion = ed.termsVersion ?? TERMS_VERSION
    const [accepted] = await tx
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
    if (!accepted && !args.acceptTerms)
      throw new AwardsError('terms_required', 'Accept the terms to submit.')

    // Validation sees the whole live project: its categories decide which fields apply.
    // A withdrawn entry being submitted again counts as part of the project from now on.
    const categories = [
      ...new Set([
        ...ctx.entries.filter((e) => e.status !== 'withdrawn').map((e) => e.category),
        ...candidates.map((e) => e.category),
      ]),
    ]
    const conflicts = new Set(
      selectionViolations(categories).flatMap((v) =>
        'categories' in v ? v.categories : [],
      ),
    )
    const projectCheck = validateProjectAnswers(
      categories,
      { ...ctx.answers, termsAccepted: true },
      'submit',
    )
    const projectKeys = projectCheck.ok ? [] : [...new Set(projectCheck.errors.map((e) => e.fieldKey))]

    const prices = new Map(
      (
        await tx
          .select({ id: category.id, price: category.price })
          .from(category)
          .where(eq(category.editionId, ed.id))
      ).map((c) => [c.id, c.price]),
    )

    const actor = role === 'creator' ? 'creator' : 'editor'
    for (const e of candidates) {
      if (e.status === 'withdrawn' && conflicts.has(e.category)) {
        result.skipped.push({
          entryId: e.id,
          category: e.category,
          reason: 'category_conflict',
          fieldKeys: [],
        })
        continue
      }
      if (!projectCheck.ok) {
        result.skipped.push({
          entryId: e.id,
          category: e.category,
          reason: 'project_incomplete',
          fieldKeys: projectKeys,
        })
        continue
      }
      const check = validateEntryAnswers(categories, e.answers, 'submit')
      if (!check.ok) {
        result.skipped.push({
          entryId: e.id,
          category: e.category,
          reason: 'entry_incomplete',
          fieldKeys: [...new Set(check.errors.map((x) => x.fieldKey))],
        })
        continue
      }
      const moved = transition({ status: e.status, previousStatus: null }, 'submitted', actor, {
        now,
        intakeOpensAt: ed.intakeOpensAt,
        intakeClosesBefore: ctx.intakeClosesBefore,
        valid: true,
      })
      if (!moved.ok) throw new AwardsError('forbidden', `This entry cannot be submitted (${moved.reason}).`)
      const regular = prices.get(e.categoryId) ?? getCategory(e.category)?.price ?? 0
      const snapshot = priceFor(
        now,
        {
          earlyBirdEndsBefore: ed.earlyBirdEndsBefore.toISOString(),
          earlyBirdDiscountPercent: ed.earlyBirdDiscountPercent,
          earlyBirdRounding: ed.earlyBirdRounding as 'nearest-900',
        },
        regular,
      )
      await tx
        .update(entry)
        .set({
          status: moved.state.status,
          statusBeforeClarification: null,
          submittedAt: now,
          priceRegular: snapshot.priceRegular,
          discountPercent: snapshot.discountPercent,
          priceAmount: snapshot.priceAmount,
          priceLockedAt: now,
          updatedAt: now,
        })
        .where(eq(entry.id, e.id))
      await appendEntryEvent(tx, {
        projectId,
        entryId: e.id,
        actorUserId: userId,
        type: 'entry_submitted',
        before: { status: e.status as EntryStatus },
        after: { status: 'submitted' },
        data: {
          tier: snapshot.tier,
          priceRegular: snapshot.priceRegular,
          discountPercent: snapshot.discountPercent,
          priceAmount: snapshot.priceAmount,
          termsVersion,
        },
      })
      result.submitted.push({
        entryId: e.id,
        category: e.category,
        price: {
          regular: snapshot.priceRegular,
          discountPercent: snapshot.discountPercent,
          amount: snapshot.priceAmount,
        },
        early: snapshot.tier === 'early',
      })
    }

    if (result.submitted.length === 0) return { result, mail: null }

    if (!accepted) {
      await tx
        .insert(termsAcceptance)
        .values({ userId, projectId, termsVersion, acceptedAt: now })
      await appendEntryEvent(tx, {
        projectId,
        actorUserId: userId,
        type: 'terms_accepted',
        data: { termsVersion },
      })
    }

    const [profile] = await tx
      .select()
      .from(billingProfile)
      .where(eq(billingProfile.id, ctx.project.billingProfileId))
    return {
      result,
      mail: {
        to: account.email,
        name: account.name,
        locale: (account.preferredLocale ?? ctx.project.locale) as 'is' | 'en',
        title: typeof ctx.answers.title === 'string' ? ctx.answers.title : '',
        // An editor sees the company and kennitala of the creator's profile, not its address.
        billing: profile
          ? {
              companyName: profile.companyName,
              kennitala: profile.kennitala,
              ...(profile.ownerUserId === userId
                ? { invoiceEmail: profile.invoiceEmail, address: profile.address }
                : {}),
            }
          : null,
      },
    }
  })

  const { result, mail } = outcome
  if (mail && result.submitted.length) {
    // After the commit: a failing mail server must not undo a submission.
    try {
      const content = receiptEmail({
        locale: mail.locale,
        name: mail.name,
        projectTitle: mail.title,
        entries: result.submitted.map((s) => ({
          category: getCategory(s.category)?.name[mail.locale] ?? s.category,
          amount: s.price.amount,
          early: s.early,
        })),
        billing: mail.billing,
        url: `${getSiteUrl()}${localePath(PORTAL.project(projectId), mail.locale)}`,
      })
      await (deps.send ?? sendEmail)({ to: mail.to, ...content })
      result.receipt = 'sent'
    } catch (e) {
      console.error('[awards] receipt email failed', e)
      result.receipt = 'failed'
    }
  }
  return result
}
