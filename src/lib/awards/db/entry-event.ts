import type { AwardsDb } from './client'
import { entryEvent, userEvent } from './schema'

export type NewEntryEvent = typeof entryEvent.$inferInsert

/**
 * The only write path to `entry_event`: insert. There is deliberately no
 * update or delete function, and the database refuses both (trigger in
 * migration 0001). Pass a transaction as `db` to log atomically with the change.
 */
export async function appendEntryEvent(
  db: Pick<AwardsDb, 'insert'>,
  event: NewEntryEvent,
): Promise<void> {
  await db.insert(entryEvent).values(event)
}

export type NewUserEvent = typeof userEvent.$inferInsert

/** The only write path to `user_event`, on the same terms as `appendEntryEvent`. */
export async function appendUserEvent(
  db: Pick<AwardsDb, 'insert'>,
  event: NewUserEvent,
): Promise<void> {
  await db.insert(userEvent).values(event)
}
