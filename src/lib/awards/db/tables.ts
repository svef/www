import { sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { user } from './auth-tables'
import { auditTimestamps, bytea, id, localizedText, timestamps } from './columns'

/*
 * The awards submission schema. Conventions: UUIDv7 keys,
 * snake_case, created_at/updated_at/deleted_at, `{is,en}` JSON for bilingual
 * text, enums as text + CHECK. Foreign keys restrict by default — rows are
 * soft-deleted, never cascaded away — except where a child is meaningless
 * without its parent and is itself never audited.
 */

/**
 * Allowed values, shared by the CHECK constraints and the application.
 *
 * `admin` is the role the application grants; `superadmin` is an admin that admins cannot
 * manage, set only in the database (src/lib/awards/auth/roles.ts). `staff` is admin's old name: a data
 * migration (0007) renamed the rows, and the CHECK still accepts it so that code from before
 * the rename, running against the same database, does not fail on a write. Drop it at the
 * cutover, with the other held-back removals (#35).
 */
export const ROLES = ['admin', 'superadmin', 'staff'] as const
export const LOCALES = ['is', 'en'] as const
export const PERSON_KINDS = ['owner', 'collaborator'] as const
export const ENTRY_STATUSES = [
  'draft',
  'submitted',
  'eligibility_pending',
  'eligible',
  'ineligible',
  'needs_clarification',
  'withdrawn',
] as const
export const FILE_STATUSES = ['pending', 'available', 'rejected'] as const

export type Role = (typeof ROLES)[number]
export type Locale = (typeof LOCALES)[number]
export type PersonKind = (typeof PERSON_KINDS)[number]
export type EntryStatus = (typeof ENTRY_STATUSES)[number]
export type FileStatus = (typeof FILE_STATUSES)[number]

const inList = (column: unknown, values: readonly string[]) =>
  sql`${column} in (${sql.join(
    values.map((v) => sql.raw(`'${v}'`)),
    sql`, `,
  )})`

const userRef = (name: string) => uuid(name).references(() => user.id)

// ── Accounts ────────────────────────────────────────────────────────────────

/** Gates the admin (Stjórnborð). One row per (user, role); room for more roles. */
export const userRole = pgTable(
  'user_role',
  {
    id: id(),
    userId: userRef('user_id').notNull(),
    role: text('role').notNull(),
    ...timestamps,
  },
  (t) => [
    check('user_role_role_check', inList(t.role, ROLES)),
    uniqueIndex('user_role_user_role_key')
      .on(t.userId, t.role)
      .where(sql`${t.deletedAt} is null`),
  ],
)

/** An account may hold several: agencies often bill the client's kennitala. */
export const billingProfile = pgTable(
  'billing_profile',
  {
    id: id(),
    ownerUserId: userRef('owner_user_id').notNull(),
    // Ten digits; the checksum is validated in the application (rules module).
    kennitala: text('kennitala').notNull(),
    companyName: text('company_name').notNull(),
    invoiceEmail: text('invoice_email').notNull(),
    address: text('address').notNull(),
    reference: text('reference'),
    ...timestamps,
  },
  (t) => [
    check('billing_profile_kennitala_check', sql`${t.kennitala} ~ '^[0-9]{10}$'`),
    index('billing_profile_owner_idx').on(t.ownerUserId),
  ],
)

// ── Edition and categories ──────────────────────────────────────────────────

export const edition = pgTable(
  'edition',
  {
    id: id(),
    year: integer('year').notNull(),
    // Exclusive upper bounds / inclusive opening, UTC.
    intakeOpensAt: timestamp('intake_opens_at', { withTimezone: true }).notNull(),
    earlyBirdEndsBefore: timestamp('early_bird_ends_before', {
      withTimezone: true,
    }).notNull(),
    intakeClosesBefore: timestamp('intake_closes_before', {
      withTimezone: true,
    }).notNull(),
    earlyBirdDiscountPercent: integer('early_bird_discount_percent').notNull(),
    earlyBirdRounding: text('early_bird_rounding').notNull().default('nearest-900'),
    // The terms version in force; null until the terms text exists.
    termsVersion: text('terms_version'),
    ...timestamps,
  },
  (t) => [
    unique('edition_year_key').on(t.year),
    check('edition_discount_check', sql`${t.earlyBirdDiscountPercent} between 0 and 100`),
    check('edition_rounding_check', inList(t.earlyBirdRounding, ['nearest-900'])),
    check(
      'edition_dates_check',
      sql`${t.intakeOpensAt} <= ${t.earlyBirdEndsBefore} and ${t.earlyBirdEndsBefore} <= ${t.intakeClosesBefore}`,
    ),
  ],
)

export const categoryGroup = pgTable(
  'category_group',
  {
    id: id(),
    editionId: uuid('edition_id')
      .notNull()
      .references(() => edition.id),
    slug: text('slug').notNull(),
    name: localizedText('name').notNull(),
    blurb: localizedText('blurb'),
    description: localizedText('description'),
    sortOrder: integer('sort_order').notNull().default(0),
    // At most one non-withdrawn entry per project across the group's categories.
    selectOne: boolean('select_one').notNull().default(false),
    ...timestamps,
  },
  (t) => [
    unique('category_group_edition_slug_key').on(t.editionId, t.slug),
    // Target of category's composite FK, so a category can't sit in another edition's group.
    unique('category_group_id_edition_key').on(t.id, t.editionId),
  ],
)

export const category = pgTable(
  'category',
  {
    id: id(),
    editionId: uuid('edition_id')
      .notNull()
      .references(() => edition.id),
    groupId: uuid('group_id'),
    slug: text('slug').notNull(),
    name: localizedText('name').notNull(),
    blurb: localizedText('blurb'),
    // Markdown, per language.
    description: localizedText('description'),
    // Short label for grouped categories (the size tier).
    tierLabel: localizedText('tier_label'),
    // Regular price in whole ISK; no VAT involved. Early bird is computed, never stored.
    price: integer('price').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    ...timestamps,
  },
  (t) => [
    unique('category_edition_slug_key').on(t.editionId, t.slug),
    unique('category_id_edition_key').on(t.id, t.editionId),
    foreignKey({
      columns: [t.groupId, t.editionId],
      foreignColumns: [categoryGroup.id, categoryGroup.editionId],
      name: 'category_group_edition_fk',
    }),
    check('category_price_check', sql`${t.price} >= 0`),
    index('category_group_idx').on(t.groupId),
  ],
)

/**
 * Symmetric by construction: the pair is stored once, smaller id first, so
 * (a, b) and (b, a) cannot both exist. Look up with `a = x or b = x`.
 */
export const categoryExclusion = pgTable(
  'category_exclusion',
  {
    id: id(),
    categoryAId: uuid('category_a_id')
      .notNull()
      .references(() => category.id),
    categoryBId: uuid('category_b_id')
      .notNull()
      .references(() => category.id),
    ...timestamps,
  },
  (t) => [
    check('category_exclusion_order_check', sql`${t.categoryAId} < ${t.categoryBId}`),
    unique('category_exclusion_pair_key').on(t.categoryAId, t.categoryBId),
    index('category_exclusion_b_idx').on(t.categoryBId),
  ],
)

// ── Submissions ─────────────────────────────────────────────────────────────

export const project = pgTable(
  'project',
  {
    id: id(),
    editionId: uuid('edition_id')
      .notNull()
      .references(() => edition.id),
    // The creator: the only one who can withdraw.
    createdBy: userRef('created_by').notNull(),
    billingProfileId: uuid('billing_profile_id').references(() => billingProfile.id),
    // The locale the project was created in.
    locale: text('locale').notNull(),
    ...timestamps,
  },
  (t) => [
    check('project_locale_check', inList(t.locale, LOCALES)),
    index('project_edition_idx').on(t.editionId),
    index('project_created_by_idx').on(t.createdBy),
    index('project_billing_profile_idx').on(t.billingProfileId),
  ],
)

/**
 * Project-scope answers (fields with `scope: project`), one row per field key.
 * `value` is the typed JSON the form produces, so a row copies straight into
 * kriton's `entry_field_value (field_key, value)`. The field set
 * lives in code; changing it needs no migration.
 */
export const projectAnswer = pgTable(
  'project_answer',
  {
    id: id(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => project.id),
    fieldKey: text('field_key').notNull(),
    value: jsonb('value').notNull(),
    ...timestamps,
  },
  (t) => [unique('project_answer_project_field_key').on(t.projectId, t.fieldKey)],
)

/** Owners and collaborators in one table. Completeness is validated at submit, not here. */
export const projectPerson = pgTable(
  'project_person',
  {
    id: id(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => project.id),
    kind: text('kind').notNull(),
    // Drafts autosave half-filled rows, so name defaults to empty; submit validation requires it.
    name: text('name').notNull().default(''),
    email: text('email'),
    // Owners.
    company: text('company'),
    // Collaborators (credit role).
    role: text('role'),
    canEdit: boolean('can_edit').notNull().default(false),
    // Linked when an invitation is accepted.
    userId: userRef('user_id'),
    invitedAt: timestamp('invited_at', { withTimezone: true }),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    sortOrder: integer('sort_order').notNull().default(0),
    ...timestamps,
  },
  (t) => [
    check('project_person_kind_check', inList(t.kind, PERSON_KINDS)),
    index('project_person_project_idx').on(t.projectId),
    index('project_person_user_idx').on(t.userId),
    // An account sees (and edits) a project once.
    uniqueIndex('project_person_project_user_key')
      .on(t.projectId, t.userId)
      .where(sql`${t.userId} is not null and ${t.deletedAt} is null`),
  ],
)

/**
 * An invitation to edit a project, one per (collaborator, send). Only the SHA-256 of
 * the token is stored (the raw token exists in the email alone). Single use
 * (`used_at`), expiring (`expires_at`), and revocable (`revoked_at`: unticking "Can
 * edit", removing the row, changing the email, or a newer invitation replacing it).
 * Never deleted: the rows are the record of who was invited when.
 */
export const projectInvitation = pgTable(
  'project_invitation',
  {
    id: id(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => project.id),
    personId: uuid('person_id')
      .notNull()
      .references(() => projectPerson.id),
    // The address the invitation was sent to.
    email: text('email').notNull(),
    tokenHash: text('token_hash').notNull(),
    invitedBy: userRef('invited_by').notNull(),
    // The language of the email, and so of the page it links to.
    locale: text('locale').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    usedBy: userRef('used_by'),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    ...auditTimestamps,
  },
  (t) => [
    unique('project_invitation_token_hash_key').on(t.tokenHash),
    check('project_invitation_locale_check', inList(t.locale, LOCALES)),
    index('project_invitation_person_idx').on(t.personId),
    index('project_invitation_project_idx').on(t.projectId),
  ],
)

/** One row per (project, category). Withdrawn rows stay, so re-submitting reuses the row. */
export const entry = pgTable(
  'entry',
  {
    id: id(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => project.id),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => category.id),
    status: text('status').notNull().default('draft'),
    // The status to return to when a request opened over it is resolved.
    statusBeforeClarification: text('status_before_clarification'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    // Price snapshot (whole ISK), taken at submit and cleared on withdraw.
    priceRegular: integer('price_regular'),
    discountPercent: integer('discount_percent'),
    priceAmount: integer('price_amount'),
    priceLockedAt: timestamp('price_locked_at', { withTimezone: true }),
    // Set by the kriton import, so it can be re-run without duplicates.
    kritonEntryId: uuid('kriton_entry_id'),
    ...timestamps,
  },
  (t) => [
    unique('entry_project_category_key').on(t.projectId, t.categoryId),
    uniqueIndex('entry_kriton_entry_id_key')
      .on(t.kritonEntryId)
      .where(sql`${t.kritonEntryId} is not null`),
    check('entry_status_check', inList(t.status, ENTRY_STATUSES)),
    check(
      'entry_status_before_check',
      sql`${t.statusBeforeClarification} is null or ${t.statusBeforeClarification} in ('draft','submitted','eligibility_pending','eligible','ineligible','withdrawn')`,
    ),
    check(
      'entry_discount_check',
      sql`${t.discountPercent} is null or ${t.discountPercent} between 0 and 100`,
    ),
    check(
      'entry_price_snapshot_check',
      sql`(${t.priceLockedAt} is null and ${t.priceRegular} is null and ${t.discountPercent} is null and ${t.priceAmount} is null)
        or (${t.priceLockedAt} is not null and ${t.priceRegular} is not null and ${t.discountPercent} is not null and ${t.priceAmount} is not null)`,
    ),
    check(
      'entry_price_amount_check',
      sql`${t.priceAmount} is null or ${t.priceAmount} >= 0`,
    ),
    index('entry_category_idx').on(t.categoryId),
    index('entry_status_idx').on(t.status),
  ],
)

/** Entry-scope answers (only `categoryPitch`), same shape as `project_answer`. */
export const entryAnswer = pgTable(
  'entry_answer',
  {
    id: id(),
    entryId: uuid('entry_id')
      .notNull()
      .references(() => entry.id),
    fieldKey: text('field_key').notNull(),
    value: jsonb('value').notNull(),
    ...timestamps,
  },
  (t) => [unique('entry_answer_entry_field_key').on(t.entryId, t.fieldKey)],
)

/** Uploads to the private R2 bucket. Owned by the project; project-scope fields only. */
export const entryFile = pgTable(
  'entry_file',
  {
    id: id(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => project.id),
    fieldKey: text('field_key').notNull(),
    r2Key: text('r2_key').notNull(),
    fileName: text('file_name').notNull(),
    contentType: text('content_type').notNull(),
    sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
    status: text('status').notNull().default('pending'),
    ...timestamps,
  },
  (t) => [
    unique('entry_file_r2_key_key').on(t.r2Key),
    check('entry_file_status_check', inList(t.status, FILE_STATUSES)),
    check('entry_file_size_check', sql`${t.sizeBytes} >= 0`),
    index('entry_file_project_field_idx').on(t.projectId, t.fieldKey),
  ],
)

/** Login details for the jury. `value_encrypted` is AES-256-GCM output; never log or select it casually. */
export const credential = pgTable(
  'credential',
  {
    id: id(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => project.id),
    label: text('label').notNull().default(''),
    valueEncrypted: bytea('value_encrypted').notNull(),
    notes: text('notes'),
    ...timestamps,
  },
  (t) => [index('credential_project_idx').on(t.projectId)],
)

export const termsAcceptance = pgTable(
  'terms_acceptance',
  {
    id: id(),
    userId: userRef('user_id').notNull(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => project.id),
    termsVersion: text('terms_version').notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [
    index('terms_acceptance_project_idx').on(t.projectId),
    index('terms_acceptance_user_idx').on(t.userId),
  ],
)

/**
 * One editor at a time. A lock is acquired by inserting (the unique key on
 * `project_id` settles races), refreshed by bumping `last_activity_at`, and
 * released by deleting the row — a hard delete, so a soft-deleted ghost can
 * never hold the unique key. Hence no `deleted_at` here.
 */
export const projectEditLock = pgTable(
  'project_edit_lock',
  {
    id: id(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => project.id),
    holderUserId: userRef('holder_user_id').notNull(),
    acquiredAt: timestamp('acquired_at', { withTimezone: true }).notNull().defaultNow(),
    /**
     * Opaque, rotated on every acquisition (a renewal included). A release must present the
     * token it was issued, so a leaving page's late beacon can't delete the lock its
     * successor (a reload, another tab) has since taken.
     */
    token: uuid('token').notNull().defaultRandom(),
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    ...auditTimestamps,
  },
  (t) => [unique('project_edit_lock_project_key').on(t.projectId)],
)

// ── Communication and history ───────────────────────────────────────────────

/** A staff request on an entry; `field_keys` are the fields it unlocks until resolved or past the deadline. */
export const entryRequest = pgTable(
  'entry_request',
  {
    id: id(),
    entryId: uuid('entry_id')
      .notNull()
      .references(() => entry.id),
    authorUserId: userRef('author_user_id').notNull(),
    message: text('message').notNull(),
    fieldKeys: text('field_keys')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    deadlineAt: timestamp('deadline_at', { withTimezone: true }).notNull(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    resolvedBy: userRef('resolved_by'),
    // Set when the deadline reminder went out; the claim that makes the sweep idempotent.
    reminderSentAt: timestamp('reminder_sent_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index('entry_request_entry_idx').on(t.entryId),
    // Open requests, for the overdue/reminder sweeps.
    index('entry_request_open_idx')
      .on(t.deadlineAt)
      .where(sql`${t.resolvedAt} is null and ${t.deletedAt} is null`),
  ],
)

/** The short thread on a request: the entrant's "Mark as done" reply and any follow-ups. */
export const entryRequestReply = pgTable(
  'entry_request_reply',
  {
    id: id(),
    requestId: uuid('request_id')
      .notNull()
      .references(() => entryRequest.id),
    authorUserId: userRef('author_user_id').notNull(),
    message: text('message').notNull(),
    ...timestamps,
  },
  (t) => [index('entry_request_reply_request_idx').on(t.requestId)],
)

/**
 * Append-only log of every meaningful change. The database refuses UPDATE,
 * DELETE and TRUNCATE (trigger in the migration), and the data-access code
 * exposes insert only (`appendEntryEvent`). Hence created_at alone: no
 * updated_at/deleted_at to maintain. Foreign keys restrict, so a project or
 * entry with history can only be soft-deleted.
 *
 * `type` is free text validated in the application (new event kinds should
 * not need a migration); `before`/`after` carry field edits, credentials redacted.
 */
export const entryEvent = pgTable(
  'entry_event',
  {
    id: id(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => project.id),
    // Null for project-level events (locks, people, project fields).
    entryId: uuid('entry_id').references(() => entry.id),
    actorUserId: userRef('actor_user_id'),
    type: text('type').notNull(),
    fieldKey: text('field_key'),
    before: jsonb('before'),
    after: jsonb('after'),
    data: jsonb('data'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('entry_event_type_check', sql`length(${t.type}) > 0`),
    index('entry_event_project_idx').on(t.projectId, t.createdAt),
    index('entry_event_entry_idx').on(t.entryId, t.createdAt),
    // The admin overview's recent activity, newest first across every project.
    index('entry_event_created_idx').on(t.createdAt),
  ],
)

/**
 * Append-only log of changes to an account itself, which have no project to hang off in
 * `entry_event`: an admin granting or removing a role, for now. Same rules as `entry_event`:
 * the database refuses UPDATE, DELETE and TRUNCATE (trigger in migration 0007), and the
 * code only inserts (`appendUserEvent`). `user_id` is the account the change is about,
 * `actor_user_id` who made it.
 */
export const userEvent = pgTable(
  'user_event',
  {
    id: id(),
    userId: userRef('user_id').notNull(),
    actorUserId: userRef('actor_user_id'),
    type: text('type').notNull(),
    data: jsonb('data'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('user_event_type_check', sql`length(${t.type}) > 0`),
    index('user_event_user_idx').on(t.userId, t.createdAt),
    index('user_event_created_idx').on(t.createdAt),
  ],
)

export const REMINDER_WAVES = ['early_bird', 'closing'] as const
export type ReminderWave = (typeof REMINDER_WAVES)[number]

/**
 * Which draft reminders went out: one row per (user, edition, wave). The row
 * is inserted *before* sending, which is what makes the cron idempotent: the unique key lets
 * exactly one of any number of overlapping runs claim it. It is deleted again only if the send
 * fails, so the next run retries.
 */
export const reminderLog = pgTable(
  'reminder_log',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id),
    editionId: uuid('edition_id')
      .notNull()
      .references(() => edition.id),
    wave: text('wave').notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('reminder_log_user_edition_wave_key').on(t.userId, t.editionId, t.wave),
    check('reminder_log_wave_check', inList(t.wave, REMINDER_WAVES)),
  ],
)
