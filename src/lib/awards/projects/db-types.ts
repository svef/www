import type { AwardsDb } from '../db/client'

export type { AwardsDb }
/** The transaction handle Drizzle passes to `db.transaction`. */
export type Tx = Parameters<Parameters<AwardsDb['transaction']>[0]>[0]
/** Either; for helpers that only run queries. */
export type Queryable = AwardsDb | Tx
