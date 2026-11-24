import { and, eq, isNull } from 'drizzle-orm'
import { appendEntryEvent } from '../db/entry-event'
import {
  project,
  projectAnswer,
  projectEditLock,
  projectInvitation,
  projectPerson,
  user,
} from '../db/schema'
import type { Tx } from '../projects/db-types'
import { hashInviteToken, inviteExpiry, newInviteToken } from './token'

/**
 * The write side of invitations, as small steps that run inside the caller's
 * transaction (saving the People section, or "Resend"): issue a token, or revoke what
 * is outstanding. Nothing here sends mail, because mail must go out only after the
 * transaction commits; `issueInvitation` returns what to send instead.
 */

type Locale = 'is' | 'en'

/** Everything the email needs, including the raw token, which exists nowhere else. */
export type PendingInvite = {
  projectId: string
  personId: string
  to: string
  name: string
  locale: Locale
  inviterName: string
  projectTitle: string
  token: string
  expiresAt: Date
}

export type RevokeReason = 'unticked' | 'removed' | 'email_changed'

async function inviterAndTitle(tx: Tx, projectId: string, inviterId: string) {
  const [inviter] = await tx
    .select({ name: user.name, preferredLocale: user.preferredLocale })
    .from(user)
    .where(eq(user.id, inviterId))
  const [p] = await tx.select({ locale: project.locale }).from(project).where(eq(project.id, projectId))
  const [title] = await tx
    .select({ value: projectAnswer.value })
    .from(projectAnswer)
    .where(
      and(
        eq(projectAnswer.projectId, projectId),
        eq(projectAnswer.fieldKey, 'title'),
        isNull(projectAnswer.deletedAt),
      ),
    )
  const preferred = inviter?.preferredLocale
  const locale: Locale =
    preferred === 'is' || preferred === 'en' ? preferred : p?.locale === 'en' ? 'en' : 'is'
  return {
    inviterName: inviter?.name ?? '',
    locale,
    projectTitle: typeof title?.value === 'string' ? title.value : '',
  }
}

/** Stops every open (unused, unrevoked) invitation of a person from working. */
async function revokeOpen(tx: Tx, personId: string, now: Date): Promise<number> {
  const rows = await tx
    .update(projectInvitation)
    .set({ revokedAt: now })
    .where(
      and(
        eq(projectInvitation.personId, personId),
        isNull(projectInvitation.usedAt),
        isNull(projectInvitation.revokedAt),
      ),
    )
    .returning({ id: projectInvitation.id })
  return rows.length
}

/**
 * Invites a collaborator: replaces whatever was outstanding with a fresh single-use
 * token, stamps `invited_at` and logs it. The caller sends the returned message after commit.
 */
export async function issueInvitation(
  tx: Tx,
  args: {
    projectId: string
    person: { id: string; name: string; email: string }
    invitedBy: string
    now: Date
    /** A re-send of an existing invitation, for the log. */
    resend?: boolean
  },
): Promise<PendingInvite> {
  const { projectId, person, invitedBy, now } = args
  await revokeOpen(tx, person.id, now)
  const token = newInviteToken()
  const expiresAt = inviteExpiry(now)
  const ctx = await inviterAndTitle(tx, projectId, invitedBy)
  await tx.insert(projectInvitation).values({
    projectId,
    personId: person.id,
    email: person.email,
    tokenHash: hashInviteToken(token),
    invitedBy,
    locale: ctx.locale,
    expiresAt,
  })
  await tx.update(projectPerson).set({ invitedAt: now }).where(eq(projectPerson.id, person.id))
  await appendEntryEvent(tx, {
    projectId,
    actorUserId: invitedBy,
    type: args.resend ? 'invitation_resent' : 'invitation_sent',
    data: { personId: person.id, email: person.email, expiresAt: expiresAt.toISOString() },
  })
  return {
    projectId,
    personId: person.id,
    to: person.email,
    name: person.name,
    locale: ctx.locale,
    inviterName: ctx.inviterName,
    projectTitle: ctx.projectTitle,
    token,
    expiresAt,
  }
}

/**
 * Takes an invitation back: outstanding tokens stop working, and an editor who had
 * accepted loses access (the link to their account is cleared, and so is a lock they
 * held). Logged only when there was something to revoke. The row's other columns are
 * the caller's to write.
 */
export async function revokeInvitation(
  tx: Tx,
  args: {
    projectId: string
    person: {
      id: string
      email: string | null
      userId: string | null
      invitedAt: Date | null
      acceptedAt: Date | null
    }
    actorUserId: string
    now: Date
    reason: RevokeReason
  },
): Promise<void> {
  const { projectId, person, now } = args
  const revoked = await revokeOpen(tx, person.id, now)
  if (!person.invitedAt && !person.acceptedAt && !revoked) return
  await tx
    .update(projectPerson)
    .set({ invitedAt: null, acceptedAt: null, userId: null })
    .where(eq(projectPerson.id, person.id))
  if (person.userId) {
    await tx
      .delete(projectEditLock)
      .where(
        and(
          eq(projectEditLock.projectId, projectId),
          eq(projectEditLock.holderUserId, person.userId),
        ),
      )
  }
  await appendEntryEvent(tx, {
    projectId,
    actorUserId: args.actorUserId,
    type: 'invitation_revoked',
    data: {
      personId: person.id,
      email: person.email,
      reason: args.reason,
      wasAccepted: person.acceptedAt !== null,
    },
  })
}
