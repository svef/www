// @vitest-environment node
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { runMigrations } from '../db/migrate'
import * as schema from '../db/schema'
import { buildInvoicingCsv } from '../export/invoicing'
import {
  isEligibilityTarget,
  planEligibility,
  setEligibility,
  setEligibilityBulk,
} from './eligibility'
import { getExportRows, listEligibilityRows, recordExport } from './queries'
import {
  createBillingProfile,
  createEntry,
  createProject,
  createUser,
  openFixtureDb,
  retireProjects,
  seededEdition,
  uniqueKennitala,
  type FixtureDb,
  type SeededEdition,
} from './test-fixtures'

const OPENS = new Date('2027-01-01T00:00:00Z')
const CLOSES = new Date('2027-02-02T00:00:00Z')
const BEFORE = new Date('2027-01-20T12:00:00Z')
const AFTER = new Date('2027-02-02T00:00:00Z') // the exclusive bound itself counts as closed

const base = {
  status: 'submitted' as const,
  previousStatus: null,
  to: 'eligible',
  roles: ['staff'] as const,
  now: AFTER,
  intakeOpensAt: OPENS,
  intakeClosesBefore: CLOSES,
}

describe('planEligibility (pure)', () => {
  it('walks submitted -> pending -> eligible / ineligible and corrects between them', () => {
    expect(planEligibility({ ...base, to: 'eligibility_pending' })).toEqual({
      ok: true,
      from: 'submitted',
      to: 'eligibility_pending',
    })
    expect(planEligibility({ ...base, status: 'eligibility_pending', to: 'eligible' }).ok).toBe(true)
    expect(planEligibility({ ...base, status: 'eligibility_pending', to: 'ineligible' }).ok).toBe(true)
    expect(planEligibility({ ...base, status: 'eligible', to: 'ineligible' }).ok).toBe(true)
    expect(planEligibility({ ...base, status: 'ineligible', to: 'eligible' }).ok).toBe(true)
  })

  it('refuses a jump the rules do not have (submitted straight to eligible)', () => {
    expect(planEligibility(base)).toEqual({ ok: false, reason: 'not_allowed' })
  })

  it('refuses before intake closes, and allows it from the closing moment on', () => {
    expect(planEligibility({ ...base, to: 'eligibility_pending', now: BEFORE })).toEqual({
      ok: false,
      reason: 'before_close',
    })
    expect(
      planEligibility({ ...base, to: 'eligibility_pending', now: new Date(CLOSES.getTime() - 1) }).ok,
    ).toBe(false)
    expect(planEligibility({ ...base, to: 'eligibility_pending', now: CLOSES }).ok).toBe(true)
  })

  it('is for staff only', () => {
    expect(planEligibility({ ...base, to: 'eligibility_pending', roles: ['creator'] })).toEqual({
      ok: false,
      reason: 'not_staff',
    })
    expect(planEligibility({ ...base, to: 'eligibility_pending', roles: [] }).ok).toBe(false)
  })

  it('refuses drafts, withdrawn entries and entries awaiting clarification', () => {
    for (const status of ['draft', 'withdrawn', 'needs_clarification'] as const) {
      expect(planEligibility({ ...base, status, to: 'eligibility_pending' })).toEqual({
        ok: false,
        reason: 'not_allowed',
      })
    }
  })

  it('refuses targets that are not eligibility statuses, and no-ops', () => {
    expect(isEligibilityTarget('withdrawn')).toBe(false)
    expect(planEligibility({ ...base, to: 'withdrawn' })).toEqual({
      ok: false,
      reason: 'invalid_target',
    })
    expect(planEligibility({ ...base, status: 'eligible', to: 'eligible' })).toEqual({
      ok: false,
      reason: 'unchanged',
    })
  })
})

/**
 * Against a real Postgres, like db.test.ts: skipped when AWARDS_DATABASE_URL is unset.
 * Works inside the seeded edition (see test-fixtures.ts), standing either side of its
 * closing moment through `now`, and only ever asserts about the rows it made.
 */
const url = process.env.AWARDS_DATABASE_URL_UNPOOLED ?? process.env.AWARDS_DATABASE_URL

describe.skipIf(!url)('eligibility service and invoicing rows (database)', () => {
  let db: FixtureDb
  let close: () => Promise<void>
  let ed: SeededEdition
  let staff: { userId: string; roles: ['staff'] }
  let userId: string
  const made: string[] = []
  const before = new Date('2027-01-20T12:00:00Z')
  const after = new Date('2027-03-01T00:00:00Z')

  beforeAll(async () => {
    await runMigrations(url!)
    ;({ db, close } = openFixtureDb(url))
    ed = await seededEdition(db)
    userId = await createUser(db, 'staff-test')
    staff = { userId, roles: ['staff'] }
  })
  afterAll(async () => {
    await retireProjects(db, made)
    await close?.()
  })

  const entryOf = async (
    status: schema.EntryStatus,
    extra: { billing?: string; title?: string; category?: 0 | 1 } = {},
  ) => {
    const projectId = await createProject(db, {
      editionId: ed.editionId,
      userId,
      title: extra.title ?? 'Verkefni',
      billingProfileId: extra.billing,
    })
    made.push(projectId)
    const entryId = await createEntry(db, {
      projectId,
      categoryId: ed.categories[extra.category ?? 0].id,
      status,
    })
    return entryId
  }
  const statusOf = async (id: string) =>
    (await db.select().from(schema.entry).where(eq(schema.entry.id, id)))[0].status
  const eventsOf = (id: string) =>
    db.select().from(schema.entryEvent).where(eq(schema.entryEvent.entryId, id))

  it('the seeded edition closes before the dates these tests use', () => {
    expect(ed.intakeClosesBefore.getTime()).toBeGreaterThan(before.getTime())
    expect(ed.intakeClosesBefore.getTime()).toBeLessThanOrEqual(after.getTime())
  })

  it('changes the status and appends an entry_event with before and after', async () => {
    const id = await entryOf('submitted')
    const r = await setEligibility(db, { entryId: id, to: 'eligibility_pending', actor: staff, now: after })
    expect(r).toMatchObject({ ok: true, from: 'submitted', to: 'eligibility_pending' })
    expect(await statusOf(id)).toBe('eligibility_pending')
    const [event] = await eventsOf(id)
    expect(event).toMatchObject({
      type: 'eligibility_changed',
      actorUserId: userId,
      before: { status: 'submitted' },
      after: { status: 'eligibility_pending' },
    })
  })

  it('refuses before close, for non-staff, and leaves status and log untouched', async () => {
    const id = await entryOf('submitted')
    const early = await setEligibility(db, { entryId: id, to: 'eligibility_pending', actor: staff, now: before })
    expect(early).toEqual({ ok: false, entryId: id, reason: 'before_close' })

    const notStaff = await setEligibility(db, {
      entryId: id,
      to: 'eligibility_pending',
      actor: { userId, roles: [] },
      now: after,
    })
    expect(notStaff).toMatchObject({ ok: false, reason: 'not_staff' })
    expect(await statusOf(id)).toBe('submitted')
    expect(await eventsOf(id)).toHaveLength(0)
  })

  it('reports an unknown entry as not found', async () => {
    const r = await setEligibility(db, {
      entryId: '0194ad2a-0000-7000-8000-000000000000',
      to: 'eligible',
      actor: staff,
      now: after,
    })
    expect(r).toMatchObject({ ok: false, reason: 'not_found' })
  })

  it('bulk: changes what it can and skips the rest with a reason each', async () => {
    const a = await entryOf('submitted')
    const b = await entryOf('submitted')
    const withdrawn = await entryOf('withdrawn')
    const already = await entryOf('eligibility_pending')
    const result = await setEligibilityBulk(db, {
      entryIds: [a, b, withdrawn, already, a],
      to: 'eligibility_pending',
      actor: staff,
      now: after,
    })
    expect(result.changed.map((c) => c.entryId).sort()).toEqual([a, b].sort())
    expect(Object.fromEntries(result.skipped.map((s) => [s.entryId, s.reason]))).toEqual({
      [withdrawn]: 'not_allowed',
      [already]: 'unchanged',
    })
    expect(await statusOf(a)).toBe('eligibility_pending')
    expect(await statusOf(withdrawn)).toBe('withdrawn')
  })

  it('lists submitted entries, filtered by category and status', async () => {
    const siteEntry = await entryOf('eligible', { title: 'Á lista', category: 0 })
    const appEntry = await entryOf('ineligible', { title: 'Í hinum flokknum', category: 1 })
    const withdrawn = await entryOf('withdrawn')
    const ids = (rows: { entryId: string }[]) => rows.map((r) => r.entryId)

    const all = await listEligibilityRows(db, { editionId: ed.editionId })
    expect(ids(all)).toEqual(expect.arrayContaining([siteEntry, appEntry]))
    expect(ids(all)).not.toContain(withdrawn)

    const apps = await listEligibilityRows(db, { editionId: ed.editionId, categoryId: ed.categories[1].id })
    expect(ids(apps)).toContain(appEntry)
    expect(ids(apps)).not.toContain(siteEntry)
    expect(apps.find((r) => r.entryId === appEntry)).toMatchObject({
      categoryName: ed.categories[1].name,
      projectTitle: 'Í hinum flokknum',
      status: 'ineligible',
    })

    const eligible = await listEligibilityRows(db, { editionId: ed.editionId, status: 'eligible' })
    expect(eligible.every((r) => r.status === 'eligible')).toBe(true)
    expect(ids(eligible)).toContain(siteEntry)
  })

  it('exports: billing as at export time, several projects per kennitala, missing group, audit', async () => {
    const kt = uniqueKennitala(true)
    const oldName = `Gamla Nafnið ${kt} ehf.`
    const newName = `Nýja Nafnið Þ ${kt} ehf.`
    const profile = await createBillingProfile(db, userId, { kennitala: kt, companyName: oldName })
    const mine = new Set<string>([
      await entryOf('submitted', { billing: profile, title: 'Eitt' }),
      await entryOf('eligible', { billing: profile, title: 'Tvö' }),
      await entryOf('submitted', { title: 'Án greiðanda' }),
    ])
    await entryOf('withdrawn', { billing: profile })
    await entryOf('draft', { billing: profile })

    // The profile is edited after the entries were submitted.
    await db
      .update(schema.billingProfile)
      .set({ companyName: newName })
      .where(eq(schema.billingProfile.id, profile))

    const rows = (await getExportRows(db, ed.editionId)).filter((r) => mine.has(r.entryId))
    expect(rows).toHaveLength(3)
    const csv = buildInvoicingCsv(rows)
    expect(csv).toContain(newName)
    expect(csv).not.toContain('Gamla Nafnið')
    expect(csv).toContain('Vantar reikningsupplýsingar')
    expect(csv).toContain('Samtals alls (3)')
    // Lines that start with the kennitala: two entries and the subtotal.
    expect(csv.match(new RegExp(`\\r\\n${kt};`, 'g'))).toHaveLength(3)

    const rec = await recordExport(db, { actorUserId: userId, format: 'csv', rows })
    expect(rec.events).toBe(3)
    const events = await eventsOf(rows[0].entryId)
    expect(events.at(-1)).toMatchObject({
      type: 'invoicing_exported',
      actorUserId: userId,
      data: { exportId: rec.exportId, format: 'csv' },
    })
  })
})
