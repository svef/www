import { and, asc, eq, isNull } from 'drizzle-orm'
import type { AwardsDb } from '../db/client'
import { appendEntryEvent } from '../db/entry-event'
import { credential, entry, project } from '../db/schema'
import { decryptCredential } from '../projects/crypto'

export type DecryptedCredential = { label: string; value: string; notes: string | null }

export class StaffEntryNotFound extends Error {
  constructor() {
    super('Entry not found.')
    this.name = 'StaffEntryNotFound'
  }
}

/**
 * Decrypts a project's login details for a staff member, and leaves the audit trail first:
 * the `credentials_viewed` event and the decryption share one transaction, so there is no
 * view without a row and no row without a view. Called once per button press; the result is
 * returned to the caller and not kept anywhere.
 *
 * The event names who looked and how many details were shown, never the values (the log is
 * append-only and is read by staff in the entry view). Callers must have checked `requireStaff()`.
 */
export async function viewCredentials(
  db: AwardsDb,
  input: { entryId: string; actorUserId: string },
): Promise<DecryptedCredential[]> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ projectId: entry.projectId })
      .from(entry)
      .innerJoin(project, eq(project.id, entry.projectId))
      .where(and(eq(entry.id, input.entryId), isNull(entry.deletedAt), isNull(project.deletedAt)))
    if (!row) throw new StaffEntryNotFound()

    const rows = await tx
      .select()
      .from(credential)
      .where(and(eq(credential.projectId, row.projectId), isNull(credential.deletedAt)))
      .orderBy(asc(credential.createdAt), asc(credential.id))

    await appendEntryEvent(tx, {
      projectId: row.projectId,
      entryId: input.entryId,
      actorUserId: input.actorUserId,
      type: 'credentials_viewed',
      data: { count: rows.length },
    })

    return rows.map((c) => ({
      label: c.label,
      value: decryptCredential(c.valueEncrypted),
      notes: c.notes,
    }))
  })
}
