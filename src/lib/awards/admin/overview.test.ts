// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { emptyCounts, foldCounts } from './overview'

const cats = [
  { id: 'a', name: { is: 'Fyrirtækjavefur', en: 'Corporate website' } },
  { id: 'b', name: { is: 'Vefverslun', en: 'E-commerce' } },
]

describe('foldCounts', () => {
  it('gives every category every status, in the given order, with totals', () => {
    const out = foldCounts(cats, [
      { categoryId: 'b', status: 'submitted', n: 3 },
      { categoryId: 'a', status: 'draft', n: 2 },
      { categoryId: 'a', status: 'eligible', n: 1 },
    ])
    expect(out.categories.map((c) => c.id)).toEqual(['a', 'b'])
    expect(out.categories[0]).toMatchObject({ total: 3, counts: { ...emptyCounts(), draft: 2, eligible: 1 } })
    expect(out.categories[1]).toMatchObject({ total: 3, counts: { ...emptyCounts(), submitted: 3 } })
    expect(out.totals).toEqual({ ...emptyCounts(), draft: 2, eligible: 1, submitted: 3 })
    expect(out.entries).toBe(6)
  })

  it('keeps a category with nothing in it, and ignores rows it cannot place', () => {
    const out = foldCounts(cats, [
      { categoryId: 'gone', status: 'submitted', n: 4 },
      { categoryId: 'a', status: 'bogus', n: 9 },
    ])
    expect(out.categories.every((c) => c.total === 0)).toBe(true)
    expect(out.entries).toBe(0)
  })
})

const url = process.env.AWARDS_DATABASE_URL_UNPOOLED ?? process.env.AWARDS_DATABASE_URL

describe.skipIf(!url)('countEdition', () => {
  it('counts projects with no category, matching the rows the projects list adds for them', async () => {
    const { openFixtureDb, seededEdition, createUser, createProject, createEntry } = await import(
      '../staff/test-fixtures'
    )
    const { withRollback } = await import('../staff/rollback')
    const { listStaffEntries } = await import('../staff/entry-list')
    const { countEdition } = await import('./overview')
    const { db, close } = openFixtureDb()
    try {
      const ed = await seededEdition(db)
      await withRollback(db, async (tx) => {
        const before = await countEdition(tx, ed.editionId)
        const u = await createUser(tx, 'count-nocat')
        await createProject(tx, { editionId: ed.editionId, userId: u, title: 'Án flokks' })
        const p = await createProject(tx, { editionId: ed.editionId, userId: u, title: 'Með flokk' })
        await createEntry(tx, { projectId: p, categoryId: ed.categories[0].id, status: 'draft' })
        const after = await countEdition(tx, ed.editionId)
        expect(after.projects - before.projects).toBe(2)
        expect(after.noCategory - before.noCategory).toBe(1)
        expect(after.entries - before.entries).toBe(1)

        // The footer's total is exactly what the list's "all" and "no_category" views hold.
        const all = await listStaffEntries(tx, { editionId: ed.editionId, status: 'all', pageSize: 1 })
        expect(all.total).toBe(after.entries + after.noCategory)
        const none = await listStaffEntries(tx, { editionId: ed.editionId, status: 'no_category', pageSize: 1 })
        expect(none.total).toBe(after.noCategory)
      })
    } finally {
      await close()
    }
  })
})
