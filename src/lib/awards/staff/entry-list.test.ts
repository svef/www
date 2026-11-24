// @vitest-environment node
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import * as schema from '../db/schema'
import { escapeLike, listStaffEntries, parseListSearch } from './entry-list'
import { withRollback } from './rollback'
import {
  createBillingProfile,
  createEntry,
  createProject,
  createUser,
  openFixtureDb,
  seededEdition,
  uniqueKennitala,
  type FixtureDb,
  type SeededEdition,
} from './test-fixtures'

describe('parseListSearch (pure)', () => {
  it('defaults to submitted entries, oldest first, page 1', () => {
    expect(parseListSearch({})).toEqual({
      categoryId: undefined,
      status: 'submitted',
      q: '',
      sort: 'submitted',
      dir: 'asc',
      page: 1,
    })
  })

  it('reads what it understands and ignores the rest', () => {
    expect(
      parseListSearch({ status: 'eligible', q: '  vefur ', sort: 'title', dir: 'desc', page: '3', category: 'c1' }),
    ).toEqual({ categoryId: 'c1', status: 'eligible', q: 'vefur', sort: 'title', dir: 'desc', page: 3 })
    const bad = parseListSearch({ status: 'bogus', sort: 'password', dir: 'sideways', page: '-2' })
    expect(bad).toMatchObject({ status: 'submitted', sort: 'submitted', dir: 'asc', page: 1 })
    expect(parseListSearch({ page: '1.5' }).page).toBe(1)
    expect(parseListSearch({ q: 'x'.repeat(500) }).q).toHaveLength(100)
  })

  it('escapes LIKE wildcards in a search', () => {
    expect(escapeLike('100%_a\\b')).toBe('100\\%\\_a\\\\b')
  })
})

const url = process.env.AWARDS_DATABASE_URL_UNPOOLED ?? process.env.AWARDS_DATABASE_URL

describe.skipIf(!url)('listStaffEntries', () => {
  const { db, close } = openFixtureDb()
  let ed: SeededEdition
  beforeAll(async () => {
    ed = await seededEdition(db)
  })
  afterAll(() => close())

  // A tag unique to the run narrows every query to rows made here: other suites share the edition.
  const tag = () => `zq${Math.random().toString(36).slice(2, 8)}`

  async function make(
    tx: FixtureDb,
    owner: string,
    title: string,
    status: schema.EntryStatus,
    opts: { second?: boolean; company?: string; at?: string } = {},
  ) {
    const billing = opts.company
      ? await createBillingProfile(tx, owner, { kennitala: uniqueKennitala(), companyName: opts.company })
      : undefined
    const projectId = await createProject(tx, {
      editionId: ed.editionId,
      userId: owner,
      title,
      billingProfileId: billing,
    })
    return createEntry(tx, {
      projectId,
      categoryId: ed.categories[opts.second ? 1 : 0].id,
      status,
      submittedAt: opts.at ? new Date(opts.at) : undefined,
    })
  }

  it('filters by category, status and title search, and hides drafts and withdrawn by default', async () => {
    await withRollback(db, async (tx) => {
      const t = tag()
      const u = await createUser(tx, 'filter')
      const a = await make(tx, u, `${t} Alfa`, 'submitted')
      const b = await make(tx, u, `${t} Beta`, 'eligible', { second: true })
      const d = await make(tx, u, `${t} Drög`, 'draft')
      const w = await make(tx, u, `${t} Dregið`, 'withdrawn')
      const ids = async (p: Partial<Parameters<typeof listStaffEntries>[1]>) =>
        (await listStaffEntries(tx, { editionId: ed.editionId, search: t, sort: 'title', ...p })).rows.map(
          (r) => r.entryId,
        )

      expect(await ids({})).toEqual([a, b])
      expect((await ids({ status: 'all' })).sort()).toEqual([a, b, d, w].sort())
      expect(await ids({ status: 'draft' })).toEqual([d])
      expect(await ids({ status: 'withdrawn' })).toEqual([w])
      expect(await ids({ status: 'eligible' })).toEqual([b])
      expect(await ids({ categoryId: ed.categories[1].id })).toEqual([b])
      expect(await ids({ categoryId: ed.categories[0].id, status: 'eligible' })).toEqual([])
      expect(await ids({ search: `${t} alfa` })).toEqual([a]) // case-insensitive
      expect(await ids({ search: `${t} %` })).toEqual([]) // a wildcard is a literal
    })
  })

  it('sorts by each column, both ways, and breaks ties stably', async () => {
    await withRollback(db, async (tx) => {
      const t = tag()
      const u = await createUser(tx, 'sort')
      const a = await make(tx, u, `${t} B`, 'submitted', { company: 'Zeta ehf.', at: '2027-01-03T10:00:00Z' })
      const b = await make(tx, u, `${t} a`, 'eligible', { company: 'alfa ehf.', at: '2027-01-01T10:00:00Z', second: true })
      const c = await make(tx, u, `${t} C`, 'ineligible', { at: '2027-01-02T10:00:00Z' })
      const order = async (sort: Parameters<typeof listStaffEntries>[1]['sort'], dir: 'asc' | 'desc') =>
        (await listStaffEntries(tx, { editionId: ed.editionId, search: t, sort, dir })).rows.map((r) => r.entryId)

      expect(await order('title', 'asc')).toEqual([b, a, c]) // case-insensitive
      expect(await order('title', 'desc')).toEqual([c, a, b])
      expect(await order('submitted', 'asc')).toEqual([b, c, a])
      expect(await order('submitted', 'desc')).toEqual([a, c, b])
      expect(await order('status', 'asc')).toEqual([b, c, a]) // eligible, ineligible, submitted
      expect((await order('company', 'asc')).slice(0, 2)).toEqual([b, a]) // alfa, Zeta (no payer last)
      expect(await order('category', 'asc')).toHaveLength(3)
    })
  })

  it('paginates in the database and clamps a page past the end', async () => {
    await withRollback(db, async (tx) => {
      const t = tag()
      const u = await createUser(tx, 'pages')
      const ids: string[] = []
      for (let i = 0; i < 7; i++) {
        ids.push(await make(tx, u, `${t} ${String(i).padStart(2, '0')}`, 'submitted'))
      }
      const page = (n: number) =>
        listStaffEntries(tx, { editionId: ed.editionId, search: t, sort: 'title', page: n, pageSize: 3 })

      const p1 = await page(1)
      expect(p1).toMatchObject({ total: 7, page: 1, pageSize: 3, pageCount: 3 })
      expect(p1.rows.map((r) => r.entryId)).toEqual(ids.slice(0, 3))
      expect((await page(2)).rows.map((r) => r.entryId)).toEqual(ids.slice(3, 6))
      expect((await page(3)).rows.map((r) => r.entryId)).toEqual(ids.slice(6))
      const past = await page(99)
      expect(past.page).toBe(3)
      expect(past.rows.map((r) => r.entryId)).toEqual(ids.slice(6))

      const none = await listStaffEntries(tx, { editionId: ed.editionId, search: `${t}-nothing` })
      expect(none).toMatchObject({ total: 0, page: 1, pageCount: 1, rows: [] })
    })
  })

  it('leaves out retired projects', async () => {
    await withRollback(db, async (tx) => {
      const t = tag()
      const u = await createUser(tx, 'retired')
      const e = await make(tx, u, `${t} Gone`, 'submitted')
      const [row] = await tx.select({ projectId: schema.entry.projectId }).from(schema.entry).where(eq(schema.entry.id, e))
      await tx.update(schema.project).set({ deletedAt: new Date() }).where(eq(schema.project.id, row.projectId))
      const r = await listStaffEntries(tx, { editionId: ed.editionId, search: t })
      expect(r.rows.map((x) => x.entryId)).not.toContain(e)
    })
  })
})
