// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import * as schema from '../db/schema'
import {
  createBillingProfile,
  createEntry,
  createProject,
  createUser,
  openFixtureDb,
  retireProjects,
  seededEdition,
  uniqueKennitala,
  type SeededEdition,
} from '../staff/test-fixtures'
import { loadDashboard } from './queries'

/**
 * The dashboard query against the seeded database (skipped without one). Rows are made through
 * the schema inside the seeded edition and retired afterwards; every assertion is about this
 * run's own users, so other suites' rows in the same edition do not matter.
 */
const url = process.env.AWARDS_DATABASE_URL_UNPOOLED ?? process.env.AWARDS_DATABASE_URL

describe.skipIf(!url)('loadDashboard', () => {
  const { db, close } = openFixtureDb()
  const made: string[] = []
  let ed: SeededEdition
  const EARLY = new Date('2026-12-20T12:00:00Z')
  const LATE = new Date('2027-01-10T12:00:00Z')

  beforeAll(async () => {
    ed = await seededEdition(db)
  })
  afterAll(async () => {
    await retireProjects(db, made)
    await close()
  })

  async function project(userId: string, title: string, billingProfileId?: string) {
    const id = await createProject(db, { editionId: ed.editionId, userId, title, billingProfileId })
    made.push(id)
    return id
  }

  it('is empty for a user with no projects', async () => {
    const u = await createUser(db, 'nobody')
    const d = await loadDashboard(db, { userId: u, now: EARLY })
    expect(d?.projects).toEqual([])
    expect(d?.edition.year).toBe(2026)
  })

  it('shows created and accepted-editor projects, and nobody else’s', async () => {
    const [anna, bob, eve] = await Promise.all([createUser(db, 'anna'), createUser(db, 'bob'), createUser(db, 'eve')])
    const own = await project(anna, 'Mine')
    const shared = await project(bob, 'Shared')
    const pending = await project(bob, 'Invited only')
    const hidden = await project(bob, 'Hidden')
    await db.insert(schema.projectPerson).values([
      { projectId: shared, kind: 'collaborator', name: 'Anna', canEdit: true, userId: anna, acceptedAt: new Date() },
      { projectId: pending, kind: 'collaborator', name: 'Anna', canEdit: true, userId: anna },
    ])
    const d = await loadDashboard(db, { userId: anna, now: EARLY })
    const byId = new Map(d!.projects.map((p) => [p.id, p]))
    expect([...byId.keys()].sort()).toEqual([own, shared].sort())
    expect(byId.get(own)?.role).toBe('creator')
    expect(byId.get(shared)?.role).toBe('editor')
    expect(byId.has(hidden)).toBe(false)
    expect((await loadDashboard(db, { userId: eve, now: EARLY }))?.projects).toEqual([])
  })

  it('prices drafts by the clock and submitted entries by their lock', async () => {
    const u = await createUser(db, 'price')
    const [cat1, cat2] = ed.categories
    const p = await project(u, 'Priced')
    const draftId = await createEntry(db, { projectId: p, categoryId: cat1.id, status: 'draft' })
    await createEntry(db, {
      projectId: p,
      categoryId: cat2.id,
      status: 'submitted',
      priceRegular: 26900,
      discountPercent: 30,
      priceAmount: 18900,
    })
    const early = (await loadDashboard(db, { userId: u, now: EARLY }))!.projects[0]
    const late = (await loadDashboard(db, { userId: u, now: LATE }))!.projects[0]
    const pick = (proj: typeof early, id: string) => proj.entries.find((e) => e.id === id)!
    const draftEarly = pick(early, draftId)
    const draftLate = pick(late, draftId)
    expect(draftEarly).toMatchObject({ priceKind: 'if-submitted-now', earlyBird: true, earlyBirdSecured: false })
    expect(draftLate).toMatchObject({ priceKind: 'if-submitted-now', earlyBird: false, price: draftLate.priceRegular })
    expect(draftEarly.price).toBeLessThan(draftEarly.priceRegular)
    // The locked entry keeps its price whatever the clock says.
    for (const view of [early, late]) {
      const locked = view.entries.find((e) => e.status === 'submitted')!
      expect(locked).toMatchObject({ price: 18900, priceKind: 'locked', earlyBird: true, earlyBirdSecured: true, missing: [] })
    }
    expect(draftEarly.missing.map((m) => m.fieldKey)).toContain('description')
  })

  it('carries open requests (not resolved ones), a live lock, and the billing profile', async () => {
    const u = await createUser(db, 'req')
    const holder = await createUser(db, 'holder')
    const kt = uniqueKennitala()
    const billing = await createBillingProfile(db, u, { kennitala: kt, companyName: 'Acme ehf.' })
    const p = await project(u, 'Asked', billing)
    const e = await createEntry(db, { projectId: p, categoryId: ed.categories[0].id, status: 'needs_clarification' })
    const deadline = new Date('2027-01-20T00:00:00Z')
    await db.insert(schema.entryRequest).values([
      { entryId: e, authorUserId: holder, message: 'Open one', deadlineAt: deadline },
      { entryId: e, authorUserId: holder, message: 'Done one', deadlineAt: deadline, resolvedAt: EARLY, resolvedBy: u },
    ])
    await db.insert(schema.projectEditLock).values({ projectId: p, holderUserId: holder, lastActivityAt: EARLY })

    const live = (await loadDashboard(db, { userId: u, now: new Date(EARLY.getTime() + 60_000) }))!.projects[0]
    expect(live.entries[0].requests.map((r) => [r.message, r.deadlineAt])).toEqual([['Open one', deadline.toISOString()]])
    expect(live.lock).toMatchObject({ holderName: 'holder', heldByViewer: false })
    expect(live.billing).toMatchObject({ companyName: 'Acme ehf.', kennitala: kt, ownedByViewer: true })

    const expired = (await loadDashboard(db, { userId: u, now: new Date(EARLY.getTime() + 21 * 60_000) }))!.projects[0]
    expect(expired.lock).toBeNull()
  })

  it('ranks a project with a request ahead of a plain one', async () => {
    const u = await createUser(db, 'rank')
    const plain = await project(u, 'Plain')
    await createEntry(db, { projectId: plain, categoryId: ed.categories[0].id, status: 'submitted' })
    const asked = await project(u, 'Asked')
    const e = await createEntry(db, { projectId: asked, categoryId: ed.categories[0].id, status: 'needs_clarification' })
    await db.insert(schema.entryRequest).values({ entryId: e, authorUserId: u, message: 'x', deadlineAt: new Date('2027-01-20T00:00:00Z') })
    const d = await loadDashboard(db, { userId: u, now: EARLY })
    expect(d!.projects.map((p) => p.id)).toEqual([asked, plain])
  })
})
