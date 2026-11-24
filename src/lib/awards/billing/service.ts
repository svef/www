import { and, asc, eq, isNull, sql } from 'drizzle-orm'
import { billingProfile, project } from '../db/schema'
import type { AwardsDb } from '../projects/db-types'
import { AwardsError } from '../projects/errors'
import { validateBillingInput, type BillingInput, type BillingProfileView } from './rules'

/**
 * Billing profiles: who an invoice goes to. They belong to a user and are reusable
 * across that user's projects, so every function takes the acting `userId` and only
 * ever touches that user's rows. A profile that is someone else's, or gone, looks the
 * same: `not_found`.
 */

type Row = typeof billingProfile.$inferSelect

const view = (row: Row, inUse: number): BillingProfileView => ({
  id: row.id,
  companyName: row.companyName,
  kennitala: row.kennitala,
  invoiceEmail: row.invoiceEmail,
  address: row.address,
  reference: row.reference,
  inUse,
})

function invalid(
  errors: Extract<ReturnType<typeof validateBillingInput>, { ok: false }>['errors'],
): never {
  throw new AwardsError('invalid_input', 'The billing details are not valid.', {
    fieldErrors: errors.map((e) => ({
      fieldKey: e.field,
      path: [e.field],
      code: e.code,
      message: e.message,
    })),
  })
}

async function ownProfile(db: AwardsDb, userId: string, id: string): Promise<Row> {
  const [row] = await db
    .select()
    .from(billingProfile)
    .where(
      and(
        eq(billingProfile.id, id),
        eq(billingProfile.ownerUserId, userId),
        isNull(billingProfile.deletedAt),
      ),
    )
  if (!row) throw new AwardsError('not_found', 'Billing profile not found.')
  return row
}

async function usage(db: AwardsDb, id: string): Promise<number> {
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(project)
    .where(and(eq(project.billingProfileId, id), isNull(project.deletedAt)))
  return r?.n ?? 0
}

export async function listBillingProfiles(
  db: AwardsDb,
  args: { userId: string },
): Promise<BillingProfileView[]> {
  const rows = await db
    .select()
    .from(billingProfile)
    .where(and(eq(billingProfile.ownerUserId, args.userId), isNull(billingProfile.deletedAt)))
    .orderBy(asc(billingProfile.createdAt))
  return Promise.all(rows.map(async (r) => view(r, await usage(db, r.id))))
}

export async function createBillingProfile(
  db: AwardsDb,
  args: { userId: string; input: BillingInput },
): Promise<BillingProfileView> {
  const v = validateBillingInput(args.input)
  if (!v.ok) invalid(v.errors)
  const [row] = await db
    .insert(billingProfile)
    .values({ ownerUserId: args.userId, ...v.data })
    .returning()
  return view(row, 0)
}

export async function updateBillingProfile(
  db: AwardsDb,
  args: { userId: string; id: string; input: BillingInput },
): Promise<BillingProfileView> {
  await ownProfile(db, args.userId, args.id)
  const v = validateBillingInput(args.input)
  if (!v.ok) invalid(v.errors)
  const [row] = await db
    .update(billingProfile)
    .set(v.data)
    .where(eq(billingProfile.id, args.id))
    .returning()
  return view(row, await usage(db, row.id))
}

/** Removes a profile no project uses. One that is in use stays: the invoice needs it. */
export async function deleteBillingProfile(
  db: AwardsDb,
  args: { userId: string; id: string },
): Promise<void> {
  await ownProfile(db, args.userId, args.id)
  const n = await usage(db, args.id)
  if (n > 0)
    throw new AwardsError(
      'billing_in_use',
      `This profile is chosen on ${n} project${n === 1 ? '' : 's'}.`,
    )
  await db
    .update(billingProfile)
    .set({ deletedAt: new Date() })
    .where(eq(billingProfile.id, args.id))
}
