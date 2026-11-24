import { customType, jsonb, timestamp, uuid } from 'drizzle-orm/pg-core'
import { uuidv7 } from 'uuidv7'

/** Text in both languages, stored as `{ "is": …, "en": … }`. */
export type LocalizedText = { is: string; en: string }

/** `jsonb` column holding a `{ is, en }` pair. */
export function localizedText(name: string) {
  return jsonb(name).$type<LocalizedText>()
}

/**
 * UUIDv7 primary key, generated in the application: time-sortable, so inserts stay
 * index-local, and not guessable from a neighbouring id.
 *
 * App-side rather than a database function: Postgres 17 (CI, local) has no
 * `uuidv7()` — it arrives in 18 — and Better Auth generates its own ids through
 * `advanced.database.generateId`, so the application is the one place both
 * paths share. Time-sortable for index locality, non-enumerable for public ids.
 */
export const id = () =>
  uuid('id')
    .primaryKey()
    .$defaultFn(() => uuidv7())

/** `bytea`, for encrypted values. node-postgres marshals it as a Buffer. */
export const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return 'bytea'
  },
})

/** created_at / updated_at. `updated_at` is bumped by Drizzle on every update. */
export const auditTimestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}

/** The standard trio: created_at / updated_at / deleted_at (null means live). */
export const timestamps = {
  ...auditTimestamps,
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}
