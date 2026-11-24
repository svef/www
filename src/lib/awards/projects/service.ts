import { and, asc, desc, eq, inArray, isNotNull, isNull } from 'drizzle-orm'
import { CATEGORIES } from '../categories'
import { appendEntryEvent } from '../db/entry-event'
import {
  billingProfile,
  category,
  credential,
  edition,
  entry,
  entryAnswer,
  entryRequest,
  project,
  projectAnswer,
  projectPerson,
  termsAcceptance,
  user,
} from '../db/schema'
import { fieldEditability, type Editability, type UnlockRequest } from '../editability'
import { ENTRY_FIELDS, FIELD_DEFINITIONS, PROJECT_FIELDS, type FieldDefinition } from '../fields'
import { assertSelectionAllowed, SelectionError } from '../selection'
import type { EntryStatus } from '../types'
import { validateEntryAnswers, validateProjectAnswers, type FieldError } from '../validation'
import { forcedValue, resolveAnswers } from '../visibility'
import { issueInvitation, revokeInvitation, type PendingInvite } from '../invitations/lifecycle'
import { normalizeEmail } from '../invitations/token'
import { deliverInvitations, inviteStates, type InvitationDeps } from '../invitations/service'
import { decryptCredential, encryptCredential } from './crypto'
import type { AwardsDb, Queryable, Tx } from './db-types'
import { diffAnswers, redactChange, sameValue, type FieldChange } from './diff'
import { AwardsError, type LockInfo } from './errors'
import { acquireLock, getLiveLock, heartbeatLock, releaseLock, requireLock } from './lock'
import type {
  EntryView,
  ProjectBilling,
  ProjectView,
  RejectReason,
  SaveAnswersPatch,
  SaveResult,
} from './types'

/**
 * The project service. Every function takes the acting `userId` (the session is
 * the caller's business) and the clock (`now`, defaulting to the real one), and
 * speaks in typed `AwardsError`s. Every write runs in one transaction that
 * starts by proving the caller holds a live edit lock, and appends its events
 * (`field_changed`, `category_added`, …) to the append-only log before commit.
 */

/** Recorded as the terms version while the edition has none (the terms text is still a draft). */
export const DRAFT_TERMS_VERSION = 'draft'

export type Clock = { now?: Date; ttlMs?: number }
type Locale = 'is' | 'en'

/** Fields autosave does not write: the image has its own upload flow, the terms waiver its own acceptance record. */
const NOT_SAVEABLE = new Set(['image', 'termsAccepted'])
/** Stored in `project_person` rather than `project_answer`. */
const PERSON_KINDS: Record<string, 'owner' | 'collaborator'> = {
  owners: 'owner',
  collaborators: 'collaborator',
}
const CREDENTIAL_KEY = 'loginInformation'

// ── Access ──────────────────────────────────────────────────────────────────

export type Role = 'creator' | 'editor'

/**
 * Who may open (and so edit) a project: its creator, or a person with `can_edit`
 * who has accepted the invitation. Staff access comes with the staff area.
 */
export async function getRole(
  db: Queryable,
  userId: string,
  projectId: string,
): Promise<Role | null> {
  const [p] = await db
    .select({ createdBy: project.createdBy })
    .from(project)
    .where(and(eq(project.id, projectId), isNull(project.deletedAt)))
  if (!p) return null
  if (p.createdBy === userId) return 'creator'
  const [person] = await db
    .select({ id: projectPerson.id })
    .from(projectPerson)
    .where(
      and(
        eq(projectPerson.projectId, projectId),
        eq(projectPerson.userId, userId),
        eq(projectPerson.canEdit, true),
        isNotNull(projectPerson.acceptedAt),
        isNull(projectPerson.deletedAt),
      ),
    )
  return person ? 'editor' : null
}

export async function requireRole(db: Queryable, userId: string, projectId: string): Promise<Role> {
  const [p] = await db
    .select({ id: project.id })
    .from(project)
    .where(and(eq(project.id, projectId), isNull(project.deletedAt)))
  if (!p) throw new AwardsError('not_found', 'Project not found.')
  const role = await getRole(db, userId, projectId)
  if (!role) throw new AwardsError('forbidden', 'You do not have access to this project.')
  return role
}

// ── Create ──────────────────────────────────────────────────────────────────

/** The edition new projects go into: the most recent one. */
export async function currentEditionId(db: Queryable): Promise<string> {
  const [e] = await db
    .select({ id: edition.id })
    .from(edition)
    .where(isNull(edition.deletedAt))
    .orderBy(desc(edition.year))
    .limit(1)
  if (!e) throw new AwardsError('no_edition', 'There is no awards edition yet.')
  return e.id
}

export async function createProject(
  db: AwardsDb,
  args: { userId: string; locale: Locale; editionId?: string },
): Promise<{ id: string }> {
  const editionId = args.editionId ?? (await currentEditionId(db))
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(project)
      .values({ editionId, createdBy: args.userId, locale: args.locale })
      .returning({ id: project.id })
    await appendEntryEvent(tx, {
      projectId: row.id,
      actorUserId: args.userId,
      type: 'project_created',
      data: { editionId, locale: args.locale },
    })
    return row
  })
}

// ── Load ────────────────────────────────────────────────────────────────────

type EntryRow = {
  id: string
  categoryId: string
  category: string
  status: EntryStatus
  answers: Record<string, unknown>
  price: EntryView['price']
}

export type Context = {
  project: typeof project.$inferSelect
  edition: typeof edition.$inferSelect
  billing: ProjectBilling | null
  intakeClosesBefore: Date
  entries: EntryRow[]
  answers: Record<string, unknown>
  requests: UnlockRequest[]
  categoryIds: Map<string, string>
}

type PersonItem = Record<string, unknown>

function personToItem(kind: 'owner' | 'collaborator', row: typeof projectPerson.$inferSelect) {
  const item: PersonItem = { name: row.name }
  if (row.email) item.email = row.email
  if (kind === 'owner' && row.company) item.company = row.company
  if (kind === 'collaborator') {
    if (row.role) item.role = row.role
    if (row.canEdit) item.canEdit = true
  }
  return item
}

export async function loadContext(q: Queryable, projectId: string): Promise<Context> {
  const [p] = await q
    .select()
    .from(project)
    .where(and(eq(project.id, projectId), isNull(project.deletedAt)))
  if (!p) throw new AwardsError('not_found', 'Project not found.')
  const [ed] = await q.select().from(edition).where(eq(edition.id, p.editionId))

  const cats = await q
    .select({ id: category.id, slug: category.slug })
    .from(category)
    .where(and(eq(category.editionId, p.editionId), isNull(category.deletedAt)))
  const slugOf = new Map(cats.map((c) => [c.id, c.slug]))

  const entryRows = await q
    .select()
    .from(entry)
    .where(and(eq(entry.projectId, projectId), isNull(entry.deletedAt)))
    .orderBy(asc(entry.createdAt))
  const entryAnswers = entryRows.length
    ? await q
        .select()
        .from(entryAnswer)
        .where(
          and(
            inArray(
              entryAnswer.entryId,
              entryRows.map((e) => e.id),
            ),
            isNull(entryAnswer.deletedAt),
          ),
        )
    : []
  const entries: EntryRow[] = entryRows.map((e) => ({
    id: e.id,
    categoryId: e.categoryId,
    category: slugOf.get(e.categoryId) ?? '',
    status: e.status as EntryStatus,
    answers: Object.fromEntries(
      entryAnswers.filter((a) => a.entryId === e.id).map((a) => [a.fieldKey, a.value]),
    ),
    price:
      e.priceLockedAt && e.priceRegular !== null && e.priceAmount !== null
        ? {
            regular: e.priceRegular,
            discountPercent: e.discountPercent ?? 0,
            amount: e.priceAmount,
          }
        : null,
  }))

  // The chosen profile may belong to the creator while an editor is looking: only its
  // company and kennitala are shown, so the invoice note can name who is invoiced.
  const [profile] = p.billingProfileId
    ? await q
        .select({
          id: billingProfile.id,
          companyName: billingProfile.companyName,
          kennitala: billingProfile.kennitala,
        })
        .from(billingProfile)
        .where(and(eq(billingProfile.id, p.billingProfileId), isNull(billingProfile.deletedAt)))
    : []

  const answers: Record<string, unknown> = {}
  const projectAnswers = await q
    .select()
    .from(projectAnswer)
    .where(and(eq(projectAnswer.projectId, projectId), isNull(projectAnswer.deletedAt)))
  for (const a of projectAnswers) answers[a.fieldKey] = a.value

  const people = await q
    .select()
    .from(projectPerson)
    .where(and(eq(projectPerson.projectId, projectId), isNull(projectPerson.deletedAt)))
    .orderBy(asc(projectPerson.sortOrder), asc(projectPerson.createdAt))
  for (const [key, kind] of Object.entries(PERSON_KINDS)) {
    const rows = people.filter((r) => r.kind === kind)
    if (rows.length) answers[key] = rows.map((r) => personToItem(kind, r))
  }

  const creds = await q
    .select()
    .from(credential)
    .where(and(eq(credential.projectId, projectId), isNull(credential.deletedAt)))
    .orderBy(asc(credential.createdAt))
  if (creds.length) {
    answers[CREDENTIAL_KEY] = creds.map((c) => {
      const item: Record<string, unknown> = { value: decryptCredential(c.valueEncrypted) }
      if (c.label) item.label = c.label
      if (c.notes) item.notes = c.notes
      return item
    })
  }

  const requests = entryRows.length
    ? await q
        .select()
        .from(entryRequest)
        .where(
          and(
            inArray(
              entryRequest.entryId,
              entryRows.map((e) => e.id),
            ),
            isNull(entryRequest.resolvedAt),
            isNull(entryRequest.deletedAt),
          ),
        )
    : []

  return {
    project: p,
    edition: ed,
    billing: profile ?? null,
    intakeClosesBefore: ed.intakeClosesBefore,
    entries,
    answers,
    requests: requests.map((r) => ({
      fieldKeys: r.fieldKeys,
      deadlineAt: r.deadlineAt,
      resolvedAt: r.resolvedAt,
    })),
    categoryIds: new Map(cats.map((c) => [c.slug, c.id])),
  }
}

const activeCategories = (ctx: Context) =>
  ctx.entries.filter((e) => e.status !== 'withdrawn').map((e) => e.category)

function editabilityFor(ctx: Context, now: Date, field: FieldDefinition, entryCategory?: string) {
  return fieldEditability(field, {
    now,
    intakeClosesBefore: ctx.intakeClosesBefore,
    entries: ctx.entries.map((e) => ({ category: e.category, status: e.status })),
    requests: ctx.requests,
    entryCategory,
  })
}

/**
 * The project as the form needs it: answers, entries, per-field editability and
 * the live lock. Readable by anyone with access, whether or not they hold the lock.
 */
export async function loadProject(
  db: AwardsDb,
  args: { userId: string; projectId: string } & Clock,
): Promise<ProjectView> {
  const now = args.now ?? new Date()
  const role = await requireRole(db, args.userId, args.projectId)
  const ctx = await loadContext(db, args.projectId)
  const lock = await getLiveLock(db, args.projectId, now, args.ttlMs)
  const [viewer] = await db
    .select({ email: user.email, emailVerified: user.emailVerified })
    .from(user)
    .where(eq(user.id, args.userId))
  // Terms are accepted per project and version; a null edition version is the draft text's.
  const termsVersion = ctx.edition.termsVersion ?? DRAFT_TERMS_VERSION
  const [accepted] = await db
    .select({ id: termsAcceptance.id })
    .from(termsAcceptance)
    .where(
      and(
        eq(termsAcceptance.projectId, args.projectId),
        eq(termsAcceptance.termsVersion, termsVersion),
        isNull(termsAcceptance.deletedAt),
      ),
    )
    .limit(1)

  const editability: Record<string, Editability> = {}
  for (const f of PROJECT_FIELDS) editability[f.key] = editabilityFor(ctx, now, f)
  const entryEditability: Record<string, Record<string, Editability>> = {}
  for (const e of ctx.entries) {
    entryEditability[e.category] = Object.fromEntries(
      ENTRY_FIELDS.map((f) => [f.key, editabilityFor(ctx, now, f, e.category)]),
    )
  }
  const entries: EntryView[] = ctx.entries.map((e) => ({
    id: e.id,
    category: e.category,
    status: e.status,
    answers: e.answers,
    price: e.price,
  }))
  return {
    id: ctx.project.id,
    locale: ctx.project.locale as Locale,
    editionId: ctx.project.editionId,
    role,
    categories: activeCategories(ctx),
    entries,
    answers: ctx.answers,
    editability,
    entryEditability,
    lock,
    intakeOpensAt: ctx.edition.intakeOpensAt.toISOString(),
    intakeClosesBefore: ctx.intakeClosesBefore.toISOString(),
    viewer: { email: viewer?.email ?? '', emailVerified: viewer?.emailVerified ?? false },
    terms: { version: termsVersion, accepted: Boolean(accepted) },
    earlyBird: {
      endsBefore: ctx.edition.earlyBirdEndsBefore.toISOString(),
      discountPercent: ctx.edition.earlyBirdDiscountPercent,
      rounding: ctx.edition.earlyBirdRounding as 'nearest-900',
    },
    billing: ctx.billing,
    invites: await inviteStates(db, args.projectId, now),
    serverNow: now.toISOString(),
  }
}

// ── Lock (with the access check in front) ───────────────────────────────────

/** Opening a project to edit takes the lock, if it is free, mine or expired. */
export async function acquireEditLock(
  db: AwardsDb,
  args: { userId: string; projectId: string } & Clock,
): Promise<{ held: true; lock: LockInfo } | { held: false; lock: LockInfo }> {
  await requireRole(db, args.userId, args.projectId)
  const r = await acquireLock(db, {
    projectId: args.projectId,
    userId: args.userId,
    now: args.now ?? new Date(),
    ttlMs: args.ttlMs,
  })
  return { held: r.ok, lock: r.lock }
}

/** The throttled activity ping; throws `lock_required` if the lock was lost. */
export async function heartbeatEditLock(
  db: AwardsDb,
  args: { userId: string; projectId: string } & Clock,
): Promise<LockInfo> {
  await requireRole(db, args.userId, args.projectId)
  return heartbeatLock(db, {
    projectId: args.projectId,
    userId: args.userId,
    now: args.now ?? new Date(),
    ttlMs: args.ttlMs,
  })
}

export async function releaseEditLock(
  db: AwardsDb,
  args: { userId: string; projectId: string } & Clock,
): Promise<boolean> {
  return releaseLock(db, {
    projectId: args.projectId,
    userId: args.userId,
    now: args.now ?? new Date(),
  })
}

// ── Save answers ────────────────────────────────────────────────────────────

async function writeProjectAnswer(tx: Tx, projectId: string, key: string, value: unknown) {
  if (value === undefined || value === null) {
    await tx
      .update(projectAnswer)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(projectAnswer.projectId, projectId),
          eq(projectAnswer.fieldKey, key),
          isNull(projectAnswer.deletedAt),
        ),
      )
    return
  }
  await tx
    .insert(projectAnswer)
    .values({ projectId, fieldKey: key, value })
    .onConflictDoUpdate({
      target: [projectAnswer.projectId, projectAnswer.fieldKey],
      set: { value, deletedAt: null },
    })
}

async function writeEntryAnswer(tx: Tx, entryId: string, key: string, value: unknown) {
  if (value === undefined || value === null) {
    await tx
      .update(entryAnswer)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(entryAnswer.entryId, entryId),
          eq(entryAnswer.fieldKey, key),
          isNull(entryAnswer.deletedAt),
        ),
      )
    return
  }
  await tx
    .insert(entryAnswer)
    .values({ entryId, fieldKey: key, value })
    .onConflictDoUpdate({
      target: [entryAnswer.entryId, entryAnswer.fieldKey],
      set: { value, deletedAt: null },
    })
}

type PersonRow = typeof projectPerson.$inferSelect

/**
 * Pairs each submitted person with the stored row it continues. Collaborators with an
 * email keep the row that had the same email, wherever it moved to, so removing or
 * reordering rows cannot hand one person's invitation (or accepted access) to another;
 * everyone else takes the remaining rows in order, so a row keeps its text edits.
 */
function matchRows(
  kind: 'owner' | 'collaborator',
  list: PersonItem[],
  existing: PersonRow[],
): (PersonRow | undefined)[] {
  const target: (PersonRow | undefined)[] = list.map(() => undefined)
  const claimed = new Set<string>()
  if (kind === 'collaborator') {
    list.forEach((it, i) => {
      const email = normalizeEmail(typeof it.email === 'string' ? it.email : '')
      if (!email) return
      const row = existing.find((r) => !claimed.has(r.id) && normalizeEmail(r.email) === email)
      if (row) {
        target[i] = row
        claimed.add(row.id)
      }
    })
  }
  const free = existing.filter((r) => !claimed.has(r.id))
  list.forEach((_, i) => {
    if (!target[i]) {
      const row = free.shift()
      if (row) target[i] = row
    }
  })
  return target
}

/**
 * Owners and collaborators. A row keeps its account link and invitation state while its
 * text is edited. For collaborators this is also where invitations follow the form:
 * ticking "Can edit" with an email invites (the mail is queued in `invites`, to go out
 * once the transaction commits); unticking, removing the row or changing its email
 * revokes the old invitation, and with it any access an accepted editor had.
 */
async function writePeople(
  tx: Tx,
  projectId: string,
  key: string,
  items: unknown,
  actor: { userId: string; now: Date; invites: PendingInvite[] },
) {
  const kind = PERSON_KINDS[key]
  const list = Array.isArray(items) ? (items as PersonItem[]) : []
  const existing = await tx
    .select()
    .from(projectPerson)
    .where(
      and(
        eq(projectPerson.projectId, projectId),
        eq(projectPerson.kind, kind),
        isNull(projectPerson.deletedAt),
      ),
    )
    .orderBy(asc(projectPerson.sortOrder), asc(projectPerson.createdAt))
  const str = (v: unknown) => (typeof v === 'string' && v !== '' ? v : null)
  const target = matchRows(kind, list, existing)
  for (let i = 0; i < list.length; i++) {
    const it = list[i]
    const values = {
      name: typeof it.name === 'string' ? it.name : '',
      email: str(it.email),
      company: kind === 'owner' ? str(it.company) : null,
      role: kind === 'collaborator' ? str(it.role) : null,
      canEdit: kind === 'collaborator' && it.canEdit === true,
      sortOrder: i,
    }
    const row = target[i]
    let id: string
    let invited = false
    if (row) {
      id = row.id
      invited = row.invitedAt !== null || row.acceptedAt !== null
      const emailChanged = normalizeEmail(row.email) !== normalizeEmail(values.email)
      if (kind === 'collaborator' && (!values.canEdit || !values.email || emailChanged)) {
        await revokeInvitation(tx, {
          projectId,
          person: row,
          actorUserId: actor.userId,
          now: actor.now,
          reason: !values.canEdit || !values.email ? 'unticked' : 'email_changed',
        })
        invited = false
      }
      await tx.update(projectPerson).set(values).where(eq(projectPerson.id, id))
    } else {
      const [inserted] = await tx
        .insert(projectPerson)
        .values({ projectId, kind, ...values })
        .returning({ id: projectPerson.id })
      id = inserted.id
    }
    if (kind === 'collaborator' && values.canEdit && values.email && !invited) {
      actor.invites.push(
        await issueInvitation(tx, {
          projectId,
          person: { id, name: values.name, email: values.email },
          invitedBy: actor.userId,
          now: actor.now,
        }),
      )
    }
  }
  for (const extra of existing.filter((r) => !target.includes(r))) {
    if (kind === 'collaborator')
      await revokeInvitation(tx, {
        projectId,
        person: extra,
        actorUserId: actor.userId,
        now: actor.now,
        reason: 'removed',
      })
    await tx
      .update(projectPerson)
      .set({ deletedAt: new Date() })
      .where(eq(projectPerson.id, extra.id))
  }
}

/** Login details: replaced as a set, each value encrypted. */
async function writeCredentials(tx: Tx, projectId: string, items: unknown) {
  await tx
    .update(credential)
    .set({ deletedAt: new Date() })
    .where(and(eq(credential.projectId, projectId), isNull(credential.deletedAt)))
  for (const it of Array.isArray(items) ? (items as Record<string, unknown>[]) : []) {
    await tx.insert(credential).values({
      projectId,
      label: typeof it.label === 'string' ? it.label : '',
      notes: typeof it.notes === 'string' ? it.notes : null,
      valueEncrypted: encryptCredential(String(it.value ?? '')),
    })
  }
}

const rejectionFor = (e: Editability): RejectReason | null => (e.editable ? null : e.reason)

/** Validates `candidate`, dropping fields that fail (so the rest can be written) until it passes. */
function validateDroppingErrors(
  candidate: Record<string, unknown>,
  validate: (c: Record<string, unknown>) => ReturnType<typeof validateProjectAnswers>,
) {
  const errors: FieldError[] = []
  const working = { ...candidate }
  for (let i = 0; i < FIELD_DEFINITIONS.length + 1; i++) {
    const r = validate(working)
    if (r.ok) return { data: r.data, errors }
    const keys = new Set(r.errors.map((e) => e.fieldKey))
    if (keys.has('') || [...keys].every((k) => !(k in working)))
      throw new AwardsError('invalid_input', 'The answers could not be validated.', {
        fieldErrors: r.errors,
      })
    errors.push(...r.errors)
    for (const k of keys) delete working[k]
  }
  throw new AwardsError('invalid_input', 'The answers could not be validated.')
}

/**
 * Autosave. Applies a patch of changed fields in one transaction:
 *  - proves the caller holds a live lock (and counts the save as activity);
 *  - refuses fields that are unknown, hidden or not editable now (`rejected`);
 *  - validates in draft mode (formats and limits); a field that fails is not
 *    written and comes back in `errors`, the others still are;
 *  - writes the changes and one `field_changed` event per field that actually
 *    changed, with before/after (login details redacted).
 * A blank value clears the answer. Values the rules force (requires-login for
 * Logged-In Platform) are applied here too and reported in `forced`.
 */
export async function saveAnswers(
  db: AwardsDb,
  args: { userId: string; projectId: string; patch: SaveAnswersPatch } & Clock,
  deps: InvitationDeps = {},
): Promise<SaveResult> {
  const { userId, projectId, patch } = args
  const now = args.now ?? new Date()
  await requireRole(db, userId, projectId)

  // Invitations ticked in this save: written in the transaction, mailed after it commits.
  const invites: PendingInvite[] = []
  const result = await db.transaction(async (tx) => {
    const lock = await requireLock(tx, { projectId, userId, now, ttlMs: args.ttlMs })
    const ctx = await loadContext(tx, projectId)
    const categories = activeCategories(ctx)
    const rejected: SaveResult['rejected'] = []
    const saved: string[] = []

    // ---- project-scope fields
    // Visibility is judged with the patch applied, so one save can turn on the
    // toggle and fill in the details it reveals.
    const resolvedNow = resolveAnswers(PROJECT_FIELDS, categories, {
      ...ctx.answers,
      ...patch.answers,
    })
    const visible = new Set(resolvedNow.visible.map((f) => f.key))
    const accepted: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(patch.answers ?? {})) {
      const field = FIELD_DEFINITIONS.find((f) => f.key === key)
      if (!field) rejected.push({ fieldKey: key, reason: 'unknown_field' })
      else if (field.scope !== 'project') rejected.push({ fieldKey: key, reason: 'wrong_scope' })
      else if (NOT_SAVEABLE.has(key)) rejected.push({ fieldKey: key, reason: 'not_saveable' })
      else if (!visible.has(key)) rejected.push({ fieldKey: key, reason: 'hidden' })
      else {
        const why = rejectionFor(editabilityFor(ctx, now, field))
        if (why) rejected.push({ fieldKey: key, reason: why })
        else accepted[key] = value
      }
    }

    const errors: SaveResult['errors'] = []
    const forced: Record<string, unknown> = {}
    const changes: FieldChange[] = []
    const writes: { key: string; value: unknown }[] = []

    if (Object.keys(accepted).length) {
      const { data, errors: found } = validateDroppingErrors({ ...ctx.answers, ...accepted }, (c) =>
        validateProjectAnswers(categories, c, 'draft'),
      )
      const failed = new Set<string>()
      for (const e of found) {
        if (e.fieldKey in accepted) {
          failed.add(e.fieldKey)
          errors.push({
            fieldKey: e.fieldKey,
            path: e.path,
            code: e.code,
            message: e.message,
          })
        }
      }
      const after = { ...ctx.answers }
      for (const key of Object.keys(accepted)) {
        if (failed.has(key)) continue
        // Absent from the validated data means blank: cleared.
        if (key in data) after[key] = data[key]
        else delete after[key]
        writes.push({ key, value: data[key] ?? null })
      }
      // Forced values the new categories/answers now impose.
      const resolvedAfter = resolveAnswers(PROJECT_FIELDS, categories, after)
      for (const field of resolvedAfter.visible) {
        const f = forcedValue(field, { categories, answers: resolvedAfter.answers })
        if (
          f.forced &&
          !sameValue(after[field.key], f.value) &&
          !(field.key in accepted && !failed.has(field.key))
        ) {
          after[field.key] = f.value
          forced[field.key] = f.value
          writes.push({ key: field.key, value: f.value })
        }
      }
      changes.push(
        ...diffAnswers(
          writes.map((w) => w.key),
          ctx.answers,
          after,
        ),
      )
    }

    const changedKeys = new Set(changes.map((c) => c.fieldKey))
    for (const w of writes) {
      if (!changedKeys.has(w.key)) continue
      if (w.key in PERSON_KINDS)
        await writePeople(tx, projectId, w.key, w.value, { userId, now, invites })
      else if (w.key === CREDENTIAL_KEY) await writeCredentials(tx, projectId, w.value)
      else await writeProjectAnswer(tx, projectId, w.key, w.value)
      saved.push(w.key)
    }
    // A value identical to what is stored counts as saved (nothing to do).
    for (const w of writes) if (!changedKeys.has(w.key)) saved.push(w.key)
    for (const c of changes) {
      const r = redactChange(c)
      await appendEntryEvent(tx, {
        projectId,
        actorUserId: userId,
        type: 'field_changed',
        fieldKey: r.fieldKey,
        before: r.before,
        after: r.after,
      })
    }

    // ---- entry-scope fields
    for (const [slug, fields] of Object.entries(patch.entryAnswers ?? {})) {
      const row = ctx.entries.find((e) => e.category === slug && e.status !== 'withdrawn')
      const acceptedEntry: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(fields)) {
        const id = `${slug}:${key}`
        const field = ENTRY_FIELDS.find((f) => f.key === key)
        if (!row) rejected.push({ fieldKey: id, reason: 'no_entry' })
        else if (!field) rejected.push({ fieldKey: id, reason: 'wrong_scope' })
        else {
          const why = rejectionFor(editabilityFor(ctx, now, field, slug))
          if (why) rejected.push({ fieldKey: id, reason: why })
          else acceptedEntry[key] = value
        }
      }
      if (!row || !Object.keys(acceptedEntry).length) continue
      const { data, errors: found } = validateDroppingErrors(
        { ...row.answers, ...acceptedEntry },
        (c) => validateEntryAnswers(categories, c, 'draft'),
      )
      const failed = new Set<string>()
      for (const e of found) {
        if (e.fieldKey in acceptedEntry) {
          failed.add(e.fieldKey)
          errors.push({
            fieldKey: `${slug}:${e.fieldKey}`,
            path: e.path,
            code: e.code,
            message: e.message,
          })
        }
      }
      for (const key of Object.keys(acceptedEntry)) {
        if (failed.has(key)) continue
        const before = row.answers[key] ?? null
        const after = data[key] ?? null
        saved.push(`${slug}:${key}`)
        if (sameValue(before, after)) continue
        await writeEntryAnswer(tx, row.id, key, after)
        await appendEntryEvent(tx, {
          projectId,
          entryId: row.id,
          actorUserId: userId,
          type: 'field_changed',
          fieldKey: key,
          before,
          after,
        })
      }
    }

    if (saved.length) {
      await tx.update(project).set({ updatedAt: now }).where(eq(project.id, projectId))
    }
    return { saved, rejected, errors, forced, lock } as SaveResult
  })

  if (result.saved.includes('collaborators')) {
    result.invites = await inviteStates(db, projectId, now)
    // After the commit: a failing mail server must not undo a save. The person shows as
    // invited either way, and "Resend invitation" is there for a message that never arrived.
    result.invitesFailed = await deliverInvitations(invites, deps)
  }
  return result
}

// ── Categories ──────────────────────────────────────────────────────────────

/**
 * Sets the project's categories to exactly `slugs`: adds draft entries, soft-removes
 * draft entries that are no longer wanted, and enforces the selection rules (one per
 * select-one group, exclusions) on what is left. An entry that has been submitted is
 * not removed here: leaving it means withdrawing it. A category whose entry was
 * withdrawn cannot be re-added here either (re-submitting is the withdrawn-to-submitted
 * transition). Returns the resulting list of categories.
 */
export async function setCategories(
  db: AwardsDb,
  args: { userId: string; projectId: string; categories: readonly string[] } & Clock,
): Promise<string[]> {
  const { userId, projectId } = args
  const now = args.now ?? new Date()
  const wanted = [...new Set(args.categories)]
  await requireRole(db, userId, projectId)

  return db.transaction(async (tx) => {
    await requireLock(tx, { projectId, userId, now, ttlMs: args.ttlMs })
    const ctx = await loadContext(tx, projectId)
    if (now.getTime() >= ctx.intakeClosesBefore.getTime())
      throw new AwardsError('intake_closed', 'Submissions have closed.')

    const unknown = wanted.filter(
      (s) => !ctx.categoryIds.has(s) || !CATEGORIES.some((c) => c.slug === s),
    )
    if (unknown.length)
      throw new AwardsError('unknown_category', `Unknown category: ${unknown.join(', ')}`)
    try {
      assertSelectionAllowed(wanted)
    } catch (e) {
      if (e instanceof SelectionError)
        throw new AwardsError('selection_invalid', e.message, {
          violations: e.violations,
        })
      throw e
    }

    const current = ctx.entries.filter((e) => e.status !== 'withdrawn')
    const toRemove = current.filter((e) => !wanted.includes(e.category))
    const blocked = toRemove.find((e) => e.status !== 'draft')
    if (blocked)
      throw new AwardsError(
        'cannot_remove_entry',
        `The entry in ${blocked.category} has been submitted; withdraw it instead.`,
      )
    const withdrawn = wanted.find((s) =>
      ctx.entries.some((e) => e.category === s && e.status === 'withdrawn'),
    )
    if (withdrawn)
      throw new AwardsError('category_withdrawn', `The entry in ${withdrawn} was withdrawn.`)

    for (const e of toRemove) {
      await tx.update(entry).set({ deletedAt: now }).where(eq(entry.id, e.id))
      await appendEntryEvent(tx, {
        projectId,
        entryId: e.id,
        actorUserId: userId,
        type: 'category_removed',
        data: { category: e.category },
      })
    }
    for (const slug of wanted.filter((s) => !current.some((e) => e.category === s))) {
      const categoryId = ctx.categoryIds.get(slug)!
      // A soft-removed draft is revived rather than duplicated (unique project + category).
      const [row] = await tx
        .insert(entry)
        .values({ projectId, categoryId, status: 'draft' })
        .onConflictDoUpdate({
          target: [entry.projectId, entry.categoryId],
          set: { deletedAt: null, status: 'draft' },
        })
        .returning({ id: entry.id })
      await appendEntryEvent(tx, {
        projectId,
        entryId: row.id,
        actorUserId: userId,
        type: 'category_added',
        data: { category: slug },
      })
    }

    // Categories can force an answer (Logged-In Platform forces requires-login on).
    const resolved = resolveAnswers(PROJECT_FIELDS, wanted, ctx.answers)
    for (const field of resolved.visible) {
      const f = forcedValue(field, { categories: wanted, answers: resolved.answers })
      if (!f.forced || sameValue(ctx.answers[field.key], f.value)) continue
      await writeProjectAnswer(tx, projectId, field.key, f.value)
      await appendEntryEvent(tx, {
        projectId,
        actorUserId: userId,
        type: 'field_changed',
        fieldKey: field.key,
        before: ctx.answers[field.key] ?? null,
        after: f.value,
        data: { forcedBy: 'categories' },
      })
    }
    await tx.update(project).set({ updatedAt: now }).where(eq(project.id, projectId))
    return wanted
  })
}

// ── Billing ─────────────────────────────────────────────────────────────────

/**
 * Chooses who is invoiced for the project (null clears it). The profile must be the
 * caller's own: profiles belong to a user and are reusable across their projects, but
 * nobody can attach someone else's. Needs the edit lock and an open intake, and logs
 * a `billing_profile_changed` event with before and after.
 */
export async function setProjectBillingProfile(
  db: AwardsDb,
  args: { userId: string; projectId: string; billingProfileId: string | null } & Clock,
): Promise<void> {
  const { userId, projectId } = args
  const now = args.now ?? new Date()
  await requireRole(db, userId, projectId)

  await db.transaction(async (tx) => {
    await requireLock(tx, { projectId, userId, now, ttlMs: args.ttlMs })
    const ctx = await loadContext(tx, projectId)
    if (now.getTime() >= ctx.intakeClosesBefore.getTime())
      throw new AwardsError('intake_closed', 'Submissions have closed.')
    if (args.billingProfileId !== null) {
      const [own] = await tx
        .select({ id: billingProfile.id })
        .from(billingProfile)
        .where(
          and(
            eq(billingProfile.id, args.billingProfileId),
            eq(billingProfile.ownerUserId, userId),
            isNull(billingProfile.deletedAt),
          ),
        )
      // Someone else's profile looks the same as a missing one.
      if (!own) throw new AwardsError('not_found', 'Billing profile not found.')
    }
    const before = ctx.project.billingProfileId
    if (before === args.billingProfileId) return
    await tx
      .update(project)
      .set({ billingProfileId: args.billingProfileId, updatedAt: now })
      .where(eq(project.id, projectId))
    await appendEntryEvent(tx, {
      projectId,
      actorUserId: userId,
      type: 'billing_profile_changed',
      before: { billingProfileId: before },
      after: { billingProfileId: args.billingProfileId },
    })
  })
}
