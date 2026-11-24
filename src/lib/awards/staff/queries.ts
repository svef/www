import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import type { AwardsDb } from '../db/client'
import { appendEntryEvent } from '../db/entry-event'
import {
  billingProfile,
  category,
  edition,
  entry,
  project,
  projectAnswer,
  type EntryStatus,
} from '../db/schema'
import type { ExportRow } from '../export/invoicing'

/** What the staff pages read. Plain queries; the rules live in eligibility.ts and export/invoicing.ts. */

export type StaffEdition = {
  id: string
  year: number
  intakeClosesBefore: Date
}

/** The edition for `year`, or the latest when none is given. */
export async function getStaffEdition(db: AwardsDb, year?: number): Promise<StaffEdition | null> {
  const [row] = await db
    .select({
      id: edition.id,
      year: edition.year,
      intakeClosesBefore: edition.intakeClosesBefore,
    })
    .from(edition)
    .where(
      and(isNull(edition.deletedAt), year === undefined ? undefined : eq(edition.year, year)),
    )
    .orderBy(desc(edition.year))
    .limit(1)
  return row ?? null
}

export async function listStaffCategories(db: AwardsDb, editionId: string) {
  const rows = await db
    .select({ id: category.id, name: category.name })
    .from(category)
    .where(and(eq(category.editionId, editionId), isNull(category.deletedAt)))
    .orderBy(asc(category.sortOrder))
  return rows.map((r) => ({ id: r.id, name: r.name.is }))
}

/** The `title` project answer is a string; anything else is shown as-is rather than hidden. */
function titleOf(value: unknown): string {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return ''
  return JSON.stringify(value)
}

const entryRows = (db: AwardsDb) =>
  db
    .select({
      entryId: entry.id,
      projectId: entry.projectId,
      status: entry.status,
      submittedAt: entry.submittedAt,
      priceRegular: entry.priceRegular,
      discountPercent: entry.discountPercent,
      priceAmount: entry.priceAmount,
      title: projectAnswer.value,
      categoryId: category.id,
      categoryName: category.name,
      billing: {
        kennitala: billingProfile.kennitala,
        companyName: billingProfile.companyName,
        invoiceEmail: billingProfile.invoiceEmail,
        address: billingProfile.address,
        reference: billingProfile.reference,
      },
      billingUpdatedAt: billingProfile.updatedAt,
      billingId: billingProfile.id,
    })
    .from(entry)
    .innerJoin(project, eq(project.id, entry.projectId))
    .innerJoin(category, eq(category.id, entry.categoryId))
    .leftJoin(billingProfile, eq(billingProfile.id, project.billingProfileId))
    .leftJoin(
      projectAnswer,
      and(
        eq(projectAnswer.projectId, project.id),
        eq(projectAnswer.fieldKey, 'title'),
        isNull(projectAnswer.deletedAt),
      ),
    )

/** Every entry of the edition that has been submitted and not withdrawn, with billing as it is now. */
export async function getExportRows(db: AwardsDb, editionId: string): Promise<ExportRow[]> {
  const rows = await entryRows(db).where(
    and(
      eq(project.editionId, editionId),
      isNull(project.deletedAt),
      isNull(entry.deletedAt),
      // Drafts and withdrawn entries are never invoiced; buildInvoicingReport filters again.
      inArray(entry.status, [
        'submitted',
        'eligibility_pending',
        'eligible',
        'ineligible',
        'needs_clarification',
      ]),
    ),
  )
  return rows.map((r) => ({
    entryId: r.entryId,
    projectId: r.projectId,
    status: r.status as EntryStatus,
    projectTitle: titleOf(r.title),
    categoryName: r.categoryName.is,
    submittedAt: r.submittedAt,
    priceRegular: r.priceRegular,
    discountPercent: r.discountPercent,
    priceAmount: r.priceAmount,
    // A left join with no match yields an all-null object.
    billing: r.billingId && r.billing ? r.billing : null,
    billingUpdatedAt: r.billingUpdatedAt,
  }))
}

export type EligibilityListRow = {
  entryId: string
  status: EntryStatus
  projectTitle: string
  categoryName: string
  submittedAt: Date | null
  company: string | null
}

/** Submitted-or-later entries for the eligibility list, optionally by category and status. */
export async function listEligibilityRows(
  db: AwardsDb,
  filter: { editionId: string; categoryId?: string; status?: EntryStatus },
): Promise<EligibilityListRow[]> {
  const rows = await entryRows(db)
    .where(
      and(
        eq(project.editionId, filter.editionId),
        isNull(project.deletedAt),
        isNull(entry.deletedAt),
        filter.categoryId ? eq(entry.categoryId, filter.categoryId) : undefined,
        filter.status
          ? eq(entry.status, filter.status)
          : inArray(entry.status, [
              'submitted',
              'eligibility_pending',
              'eligible',
              'ineligible',
              'needs_clarification',
            ]),
      ),
    )
    .orderBy(asc(category.sortOrder), asc(entry.submittedAt))
  return rows.map((r) => ({
    entryId: r.entryId,
    status: r.status as EntryStatus,
    projectTitle: titleOf(r.title),
    categoryName: r.categoryName.is,
    submittedAt: r.submittedAt,
    company: r.billing?.companyName ?? null,
  }))
}

/**
 * Notes who exported and when, on every entry in the file. `entry_event` is the
 * audit log and needs a project, so an export (which has none of its own) leaves
 * one `invoicing_exported` event per entry, sharing an `exportId` in `data`.
 * An export with no entries leaves nothing to attach to, and so no row.
 */
export async function recordExport(
  db: AwardsDb,
  input: { actorUserId: string; format: 'csv' | 'xlsx'; rows: readonly ExportRow[] },
): Promise<{ exportId: string; events: number }> {
  const exportId = uuidv7()
  const targets = input.rows.filter((r): r is ExportRow & { projectId: string } => !!r.projectId)
  await db.transaction(async (tx) => {
    for (const r of targets) {
      await appendEntryEvent(tx, {
        projectId: r.projectId,
        entryId: r.entryId,
        actorUserId: input.actorUserId,
        type: 'invoicing_exported',
        data: { exportId, format: input.format },
      })
    }
  })
  return { exportId, events: targets.length }
}
