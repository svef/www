import { and, asc, count, eq, isNull, or } from 'drizzle-orm'
import type { AwardsDb } from '../db/client'
import {
  billingProfile,
  category,
  credential,
  edition,
  entry,
  entryAnswer,
  entryEvent,
  entryFile,
  project,
  projectAnswer,
  projectPerson,
  user,
} from '../db/schema'
import { ENTRY_FIELDS, PROJECT_FIELDS, type FieldDefinition } from '../fields'
import type { EntryStatus } from '../types'
import { resolveAnswers } from '../visibility'

/**
 * Everything the staff entry view shows, loaded in one place. The page splits the fields by
 * `visibility`: `admin` ones (who made it, the image, the school) are shown above what the
 * jury will see (`judges`, `public`), and login details are never in here: they are decrypted
 * on demand by `credentials.ts`, which writes the audit event.
 */

export type StaffPerson = {
  id: string
  kind: 'owner' | 'collaborator'
  name: string
  email: string | null
  company: string | null
  role: string | null
  canEdit: boolean
  /** The linked account, once an invitation was accepted. */
  accountEmail: string | null
  invitedAt: Date | null
  acceptedAt: Date | null
}

export type StaffEntryEvent = {
  id: string
  type: string
  createdAt: Date
  /** The entry the event is about; null for project-level events. */
  entryId: string | null
  fieldKey: string | null
  before: unknown
  after: unknown
  data: unknown
  actorName: string | null
  actorEmail: string | null
}

export type StaffEntryView = {
  entryId: string
  projectId: string
  status: EntryStatus
  submittedAt: Date | null
  price: { regular: number; discountPercent: number; amount: number } | null
  categoryName: { is: string; en: string }
  categorySlug: string
  editionYear: number
  locale: string
  creator: { id: string; name: string; email: string }
  billing: {
    kennitala: string
    companyName: string
    invoiceEmail: string
    address: string
    reference: string | null
  } | null
  people: StaffPerson[]
  image: { fileName: string; contentType: string; sizeBytes: number; status: string } | null
  /** Resolved answers for this entry (project answers plus this entry's own), by field key. */
  answers: Record<string, unknown>
  /** The fields that apply to this entry's project, in definition order. */
  adminFields: FieldDefinition[]
  juryFields: FieldDefinition[]
  /** How many login details exist; their values are not loaded. */
  credentialCount: number
  events: StaffEntryEvent[]
}

/** Fields shown through other sections (login details have their own, people and image are admin rows). */
const NOT_ANSWER_ROWS = new Set(['loginInformation', 'termsAccepted'])

export async function getStaffEntryView(
  db: AwardsDb,
  entryId: string,
): Promise<StaffEntryView | null> {
  const [row] = await db
    .select({
      e: entry,
      p: project,
      categoryName: category.name,
      categorySlug: category.slug,
      year: edition.year,
    })
    .from(entry)
    .innerJoin(project, eq(project.id, entry.projectId))
    .innerJoin(category, eq(category.id, entry.categoryId))
    .innerJoin(edition, eq(edition.id, project.editionId))
    .where(and(eq(entry.id, entryId), isNull(entry.deletedAt), isNull(project.deletedAt)))
  if (!row) return null
  const { e, p } = row

  const [creator] = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(eq(user.id, p.createdBy))

  const [billing] = p.billingProfileId
    ? await db
        .select({
          kennitala: billingProfile.kennitala,
          companyName: billingProfile.companyName,
          invoiceEmail: billingProfile.invoiceEmail,
          address: billingProfile.address,
          reference: billingProfile.reference,
        })
        .from(billingProfile)
        .where(eq(billingProfile.id, p.billingProfileId))
    : []

  const peopleRows = await db
    .select({ person: projectPerson, accountEmail: user.email })
    .from(projectPerson)
    .leftJoin(user, eq(user.id, projectPerson.userId))
    .where(and(eq(projectPerson.projectId, p.id), isNull(projectPerson.deletedAt)))
    .orderBy(asc(projectPerson.kind), asc(projectPerson.sortOrder), asc(projectPerson.createdAt))
  const people: StaffPerson[] = peopleRows.map(({ person, accountEmail }) => ({
    id: person.id,
    kind: person.kind as 'owner' | 'collaborator',
    name: person.name,
    email: person.email,
    company: person.company,
    role: person.role,
    canEdit: person.canEdit,
    accountEmail,
    invitedAt: person.invitedAt,
    acceptedAt: person.acceptedAt,
  }))

  const answers: Record<string, unknown> = {}
  for (const a of await db
    .select()
    .from(projectAnswer)
    .where(and(eq(projectAnswer.projectId, p.id), isNull(projectAnswer.deletedAt))))
    answers[a.fieldKey] = a.value
  for (const a of await db
    .select()
    .from(entryAnswer)
    .where(and(eq(entryAnswer.entryId, e.id), isNull(entryAnswer.deletedAt))))
    answers[a.fieldKey] = a.value

  // Which fields apply depends on the categories the project is in (non-withdrawn entries).
  const siblings = await db
    .select({ slug: category.slug, status: entry.status })
    .from(entry)
    .innerJoin(category, eq(category.id, entry.categoryId))
    .where(and(eq(entry.projectId, p.id), isNull(entry.deletedAt)))
  const slugs = siblings.filter((s) => s.status !== 'withdrawn').map((s) => s.slug)
  // A withdrawn entry still has to be readable, so its own category counts.
  if (!slugs.includes(row.categorySlug)) slugs.push(row.categorySlug)
  const { visible, answers: resolved } = resolveAnswers(
    [...PROJECT_FIELDS, ...ENTRY_FIELDS],
    slugs,
    answers,
  )
  const shown = visible.filter((f) => !NOT_ANSWER_ROWS.has(f.key))

  const [file] = await db
    .select()
    .from(entryFile)
    .where(
      and(
        eq(entryFile.projectId, p.id),
        eq(entryFile.fieldKey, 'image'),
        isNull(entryFile.deletedAt),
      ),
    )
    .orderBy(asc(entryFile.createdAt))
    .limit(1)

  const [{ credentialCount }] = await db
    .select({ credentialCount: count() })
    .from(credential)
    .where(and(eq(credential.projectId, p.id), isNull(credential.deletedAt)))

  const events = await db
    .select({
      ev: entryEvent,
      actorName: user.name,
      actorEmail: user.email,
    })
    .from(entryEvent)
    .leftJoin(user, eq(user.id, entryEvent.actorUserId))
    .where(
      and(
        eq(entryEvent.projectId, p.id),
        or(isNull(entryEvent.entryId), eq(entryEvent.entryId, e.id)),
      ),
    )
    .orderBy(asc(entryEvent.createdAt), asc(entryEvent.id))

  return {
    entryId: e.id,
    projectId: p.id,
    status: e.status as EntryStatus,
    submittedAt: e.submittedAt,
    price:
      e.priceLockedAt && e.priceRegular !== null && e.priceAmount !== null
        ? {
            regular: e.priceRegular,
            discountPercent: e.discountPercent ?? 0,
            amount: e.priceAmount,
          }
        : null,
    categoryName: row.categoryName,
    categorySlug: row.categorySlug,
    editionYear: row.year,
    locale: p.locale,
    creator,
    billing: billing ?? null,
    people,
    image: file
      ? {
          fileName: file.fileName,
          contentType: file.contentType,
          sizeBytes: file.sizeBytes,
          status: file.status,
        }
      : null,
    answers: resolved,
    adminFields: shown.filter((f) => f.visibility === 'admin'),
    juryFields: shown.filter((f) => f.visibility !== 'admin'),
    credentialCount,
    events: events.map(({ ev, actorName, actorEmail }) => ({
      id: ev.id,
      type: ev.type,
      createdAt: ev.createdAt,
      entryId: ev.entryId,
      fieldKey: ev.fieldKey,
      before: ev.before,
      after: ev.after,
      data: ev.data,
      actorName,
      actorEmail,
    })),
  }
}
