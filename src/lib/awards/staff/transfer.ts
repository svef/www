import { and, eq, isNull, sql } from 'drizzle-orm'
import type { AwardsDb } from '../db/client'
import { appendEntryEvent } from '../db/entry-event'
import { project, projectEditLock, projectPerson, user } from '../db/schema'

export type TransferError = 'project_not_found' | 'user_not_found' | 'already_creator' | 'invalid_email'

export type TransferResult =
  | { ok: true; from: { id: string; email: string }; to: { id: string; email: string } }
  | { ok: false; error: TransferError }

/**
 * Moves a project to another creator, by the email of an existing account (staff
 * only; the caller has checked `requireStaff()`). The new creator becomes `created_by`, which
 * is what makes the project theirs: it shows on their dashboard and only they can withdraw.
 * The previous creator keeps access only if they are also an accepted editor
 * (`project_person.can_edit`); nothing is added for them and nothing about editors changes.
 *
 * Billing stays as it is, so the invoice still goes to the same kennitala; the new creator
 * can switch it. An edit lock held by someone who no longer has access is released, so the new
 * creator is not kept out by it.
 */
export async function transferProject(
  db: AwardsDb,
  input: { projectId: string; toEmail: string; actorUserId: string },
): Promise<TransferResult> {
  const email = input.toEmail.trim().toLowerCase()
  if (!email.includes('@')) return { ok: false, error: 'invalid_email' }

  return db.transaction(async (tx) => {
    // Locked for the update so two transfers cannot both read the same "from".
    const [p] = await tx
      .select({ id: project.id, createdBy: project.createdBy })
      .from(project)
      .where(and(eq(project.id, input.projectId), isNull(project.deletedAt)))
      .for('update')
    if (!p) return { ok: false, error: 'project_not_found' } as const

    const [target] = await tx
      .select({ id: user.id, email: user.email })
      .from(user)
      .where(and(sql`lower(${user.email}) = ${email}`, isNull(user.deletedAt)))
    if (!target) return { ok: false, error: 'user_not_found' } as const
    if (target.id === p.createdBy) return { ok: false, error: 'already_creator' } as const

    const [previous] = await tx
      .select({ id: user.id, email: user.email })
      .from(user)
      .where(eq(user.id, p.createdBy))

    await tx.update(project).set({ createdBy: target.id }).where(eq(project.id, p.id))

    const [stillEditor] = await tx
      .select({ id: projectPerson.id })
      .from(projectPerson)
      .where(
        and(
          eq(projectPerson.projectId, p.id),
          eq(projectPerson.userId, p.createdBy),
          eq(projectPerson.canEdit, true),
          isNull(projectPerson.deletedAt),
        ),
      )
    if (!stillEditor) {
      await tx
        .delete(projectEditLock)
        .where(and(eq(projectEditLock.projectId, p.id), eq(projectEditLock.holderUserId, p.createdBy)))
    }

    await appendEntryEvent(tx, {
      projectId: p.id,
      actorUserId: input.actorUserId,
      type: 'project_transferred',
      before: { createdBy: p.createdBy },
      after: { createdBy: target.id },
      data: { fromEmail: previous?.email ?? null, toEmail: target.email },
    })
    return {
      ok: true,
      from: { id: p.createdBy, email: previous?.email ?? '' },
      to: target,
    } as const
  })
}
