import { and, asc, desc, eq, isNull } from 'drizzle-orm'
import { appendEntryEvent } from '../db/entry-event'
import { project, projectAnswer, projectInvitation, projectPerson, user } from '../db/schema'
import { invitationEmail, sendEmail, type OutgoingEmail } from '../email'
import { AwardsError } from '../projects/errors'
import type { AwardsDb, Queryable } from '../projects/db-types'
import { getRole, requireRole } from '../projects/service'
import { getSiteUrl } from '@/lib/site-url'
import { localePath } from '@/lib/i18n'
import { issueInvitation, type PendingInvite } from './lifecycle'
import { hashInviteToken, normalizeEmail, RESEND_MIN_INTERVAL_MS } from './token'
import type { InviteState } from './types'

export type InvitationDeps = { send?: (message: OutgoingEmail) => Promise<void> }

const PERSON_ORDER = [asc(projectPerson.sortOrder), asc(projectPerson.createdAt)] as const

/** The link in the email: a page, never an action, so a mail scanner opening it changes nothing. */
export function inviteUrl(token: string, locale: 'is' | 'en'): string {
  return `${getSiteUrl()}${localePath(`/innsendingar/bod/${token}`, locale)}`
}

/** Sends the invitation emails queued by a transaction. Returns how many could not be sent. */
export async function deliverInvitations(
  invites: readonly PendingInvite[],
  deps: InvitationDeps = {},
): Promise<number> {
  let failed = 0
  for (const i of invites) {
    try {
      const content = invitationEmail({
        locale: i.locale,
        name: i.name,
        inviterName: i.inviterName,
        projectTitle: i.projectTitle,
        url: inviteUrl(i.token, i.locale),
        expiresAt: i.expiresAt,
      })
      await (deps.send ?? sendEmail)({ to: i.to, ...content })
    } catch (e) {
      console.error('[awards] invitation email failed', e)
      failed++
    }
  }
  return failed
}

// ── State for the form ──────────────────────────────────────────────────────

/** One entry per collaborator, in the order the form lists them. */
export async function inviteStates(
  q: Queryable,
  projectId: string,
  now: Date,
): Promise<InviteState[]> {
  const people = await q
    .select()
    .from(projectPerson)
    .where(
      and(
        eq(projectPerson.projectId, projectId),
        eq(projectPerson.kind, 'collaborator'),
        isNull(projectPerson.deletedAt),
      ),
    )
    .orderBy(...PERSON_ORDER)
  if (!people.length) return []
  const invitations = await q
    .select()
    .from(projectInvitation)
    .where(eq(projectInvitation.projectId, projectId))
    .orderBy(desc(projectInvitation.createdAt))
  return people.map((p): InviteState => {
    const base = { personId: p.id, email: p.email ?? '' }
    const none = { ...base, state: 'none' as const, invitedAt: null, acceptedAt: null, expiresAt: null }
    if (!p.canEdit || !p.email) return none
    if (p.acceptedAt)
      return {
        ...base,
        state: 'accepted',
        invitedAt: p.invitedAt?.toISOString() ?? null,
        acceptedAt: p.acceptedAt.toISOString(),
        expiresAt: null,
      }
    if (!p.invitedAt) return none
    const latest = invitations.find((i) => i.personId === p.id)
    const open = latest && !latest.usedAt && !latest.revokedAt && latest.expiresAt > now
    return {
      ...base,
      state: open ? 'invited' : 'expired',
      invitedAt: p.invitedAt.toISOString(),
      acceptedAt: null,
      expiresAt: latest?.expiresAt.toISOString() ?? null,
    }
  })
}

// ── Resend ──────────────────────────────────────────────────────────────────

/**
 * Sends a collaborator a fresh invitation (the old link stops working). Owners and
 * editors may; it needs no edit lock, because it changes no answer. A person who has
 * already accepted, or who is not set to "Can edit" with an email, is refused, and so
 * is a second send within a minute.
 */
export async function resendInvitation(
  db: AwardsDb,
  args: { userId: string; projectId: string; personId: string; now?: Date },
  deps: InvitationDeps = {},
): Promise<{ invites: InviteState[]; delivered: boolean }> {
  const { userId, projectId, personId } = args
  const now = args.now ?? new Date()
  await requireRole(db, userId, projectId)
  const pending = await db.transaction(async (tx) => {
    const [person] = await tx
      .select()
      .from(projectPerson)
      .where(
        and(
          eq(projectPerson.id, personId),
          eq(projectPerson.projectId, projectId),
          eq(projectPerson.kind, 'collaborator'),
          isNull(projectPerson.deletedAt),
        ),
      )
      .for('update')
    if (!person) throw new AwardsError('not_found', 'Person not found.')
    if (!person.canEdit || !person.email)
      throw new AwardsError('invite_not_allowed', 'Tick “Can edit” and add an email first.')
    if (person.acceptedAt)
      throw new AwardsError('invite_not_allowed', 'This person has already accepted.')
    if (person.invitedAt && now.getTime() - person.invitedAt.getTime() < RESEND_MIN_INTERVAL_MS)
      throw new AwardsError('invite_too_soon', 'An invitation was just sent. Try again in a minute.')
    return issueInvitation(tx, {
      projectId,
      person: { id: person.id, name: person.name, email: person.email },
      invitedBy: userId,
      now,
      resend: person.invitedAt !== null,
    })
  })
  const failed = await deliverInvitations([pending], deps)
  return { invites: await inviteStates(db, projectId, now), delivered: failed === 0 }
}

// ── The accept page ─────────────────────────────────────────────────────────

export type InviteStatus = 'valid' | 'expired' | 'revoked' | 'used' | 'invalid'

export type InvitePreview =
  | {
      status: 'valid'
      projectId: string
      projectTitle: string
      inviterName: string
      /** The address the invitation was sent to. */
      email: string
      locale: 'is' | 'en'
    }
  | { status: Exclude<InviteStatus, 'valid'> }

type Found = {
  invitation: typeof projectInvitation.$inferSelect
  person: typeof projectPerson.$inferSelect
}

async function findInvitation(q: Queryable, token: string): Promise<Found | null> {
  if (!token || token.length > 200) return null
  const [row] = await q
    .select({ invitation: projectInvitation, person: projectPerson })
    .from(projectInvitation)
    .innerJoin(projectPerson, eq(projectPerson.id, projectInvitation.personId))
    .where(eq(projectInvitation.tokenHash, hashInviteToken(token)))
  return row ?? null
}

/** Why a token does not work, or `valid`. Revoked wins over used and expired: it is the owner's decision. */
export function statusOf(found: Found | null, now: Date): InviteStatus {
  if (!found) return 'invalid'
  const { invitation: i, person: p } = found
  if (i.revokedAt || p.deletedAt || !p.canEdit) return 'revoked'
  if (i.usedAt) return 'used'
  if (i.expiresAt <= now) return 'expired'
  return 'valid'
}

/** What the page may show a token holder: details only while the token works. */
export async function previewInvitation(
  db: Queryable,
  token: string,
  now: Date,
): Promise<InvitePreview> {
  const found = await findInvitation(db, token)
  const status = statusOf(found, now)
  if (status !== 'valid' || !found) return { status: status === 'valid' ? 'invalid' : status }
  const { invitation: i } = found
  const [inviter] = await db
    .select({ name: user.name })
    .from(user)
    .where(eq(user.id, i.invitedBy))
  const { title } = await projectTitle(db, i.projectId)
  return {
    status: 'valid',
    projectId: i.projectId,
    projectTitle: title,
    inviterName: inviter?.name ?? '',
    email: i.email,
    locale: i.locale as 'is' | 'en',
  }
}

async function projectTitle(q: Queryable, projectId: string) {
  const [row] = await q
    .select({ value: projectAnswer.value })
    .from(projectAnswer)
    .where(
      and(
        eq(projectAnswer.projectId, projectId),
        eq(projectAnswer.fieldKey, 'title'),
        isNull(projectAnswer.deletedAt),
      ),
    )
  return { title: typeof row?.value === 'string' ? row.value : '' }
}

export type AcceptResult =
  | { ok: true; projectId: string; alreadyHadAccess: boolean }
  | {
      ok: false
      reason: Exclude<InviteStatus, 'valid'> | 'email_mismatch' | 'unverified'
    }

/**
 * Accepts an invitation as `userId`: links the account to the collaborator row, stamps
 * `accepted_at`, uses the token up and logs it, all in one transaction.
 *
 * Who may accept: the token is a bearer secret that went to the invited address, so
 * holding it is the proof that matters, not which account is used. But an editor gets
 * the whole project, so:
 *  - an account whose email is the invited one accepts directly (the link proved the
 *    mailbox, so an unverified account is fine);
 *  - any other account must confirm (`confirmDifferentEmail`) and must have a verified
 *    email, so a forwarded link works for a colleague who really exists but a throwaway
 *    sign-up cannot take it.
 * Someone who can already open the project (creator or accepted editor) is sent there
 * and the token is left alone, so opening your own invitation never uses it up.
 */
export async function acceptInvitation(
  db: AwardsDb,
  args: { userId: string; token: string; now?: Date; confirmDifferentEmail?: boolean },
): Promise<AcceptResult> {
  const now = args.now ?? new Date()
  return db.transaction(async (tx) => {
    const found = await findInvitation(tx, args.token)
    const status = statusOf(found, now)
    if (status !== 'valid' || !found) return { ok: false, reason: status === 'valid' ? 'invalid' : status }
    const { invitation, person } = found

    const [live] = await tx
      .select({ id: project.id })
      .from(project)
      .where(and(eq(project.id, invitation.projectId), isNull(project.deletedAt)))
    if (!live) return { ok: false, reason: 'invalid' }

    if (await getRole(tx, args.userId, invitation.projectId))
      return { ok: true, projectId: invitation.projectId, alreadyHadAccess: true }

    const [account] = await tx
      .select({ email: user.email, emailVerified: user.emailVerified })
      .from(user)
      .where(eq(user.id, args.userId))
    if (!account) return { ok: false, reason: 'invalid' }
    if (normalizeEmail(account.email) !== normalizeEmail(invitation.email)) {
      if (!account.emailVerified) return { ok: false, reason: 'unverified' }
      if (!args.confirmDifferentEmail) return { ok: false, reason: 'email_mismatch' }
    }

    // The token's single use: the first transaction to set `used_at` wins.
    const used = await tx
      .update(projectInvitation)
      .set({ usedAt: now, usedBy: args.userId })
      .where(
        and(
          eq(projectInvitation.id, invitation.id),
          isNull(projectInvitation.usedAt),
          isNull(projectInvitation.revokedAt),
        ),
      )
      .returning({ id: projectInvitation.id })
    if (!used.length) return { ok: false, reason: 'used' }

    // An account is one person on a project (unique key): if it is already linked to another
    // row there, that row gives way to this one.
    await tx
      .update(projectPerson)
      .set({ userId: null, acceptedAt: null })
      .where(
        and(
          eq(projectPerson.projectId, invitation.projectId),
          eq(projectPerson.userId, args.userId),
          isNull(projectPerson.deletedAt),
        ),
      )
    await tx
      .update(projectPerson)
      .set({ userId: args.userId, acceptedAt: now })
      .where(eq(projectPerson.id, person.id))
    await appendEntryEvent(tx, {
      projectId: invitation.projectId,
      actorUserId: args.userId,
      type: 'invitation_accepted',
      data: {
        personId: person.id,
        invitedEmail: invitation.email,
        accountEmail: account.email,
      },
    })
    return { ok: true, projectId: invitation.projectId, alreadyHadAccess: false }
  })
}
