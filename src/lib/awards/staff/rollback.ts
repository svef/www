import type { AwardsDb } from '../db/client'
import type { FixtureDb } from './test-fixtures'

class Rollback extends Error {}

/**
 * Runs `fn` inside a transaction that is always rolled back, so a test leaves nothing behind
 * (including `entry_event` rows, which cannot be deleted afterwards). `fn` gets the transaction
 * as both the fixtures' db and the service's db; services that open their own transaction
 * become savepoints. Test helper only.
 */
export async function withRollback(
  db: FixtureDb,
  fn: (tx: FixtureDb & AwardsDb) => Promise<void>,
): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      await fn(tx as unknown as FixtureDb & AwardsDb)
      throw new Rollback()
    })
  } catch (e) {
    if (!(e instanceof Rollback)) throw e
  }
}
