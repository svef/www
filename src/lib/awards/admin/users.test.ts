// @vitest-environment node
import { afterAll, describe, expect, it } from 'vitest'
import * as schema from '../db/schema'
import { withRollback } from '../staff/rollback'
import { createEntry, createProject, createUser, openFixtureDb, seededEdition } from '../staff/test-fixtures'
import { getUserDetail, listUsers, parseUserSearch } from './users'

describe('parseUserSearch (pure)', () => {
  it('defaults to everyone, newest first, page 1', () => {
    expect(parseUserSearch({})).toEqual({ q: '', role: 'all', sort: 'created', dir: 'desc', page: 1 })
  })

  it('reads what it understands and ignores the rest', () => {
    expect(parseUserSearch({ q: '  anna ', role: 'admin', sort: 'name', page: '2' })).toEqual({
      q: 'anna',
      role: 'admin',
      sort: 'name',
      dir: 'asc',
      page: 2,
    })
    expect(parseUserSearch({ sort: 'email', dir: 'desc' })).toMatchObject({ sort: 'email', dir: 'desc' })
    expect(parseUserSearch({ role: 'staff', sort: 'password', page: '0' })).toMatchObject({
      role: 'all',
      sort: 'created',
      dir: 'desc',
      page: 1,
    })
    expect(parseUserSearch({ q: 'x'.repeat(300) }).q).toHaveLength(100)
    expect(parseUserSearch({ page: ['3', '4'] }).page).toBe(3)
  })
})

const url = process.env.AWARDS_DATABASE_URL_UNPOOLED ?? process.env.AWARDS_DATABASE_URL

describe.skipIf(!url)('listUsers and getUserDetail', () => {
  const { db, close } = openFixtureDb()
  afterAll(() => close())
  const tag = () => `zu${Math.random().toString(36).slice(2, 8)}`

  it('searches name and email, filters admins, sorts and pages', async () => {
    await withRollback(db, async (tx) => {
      const t = tag()
      const a = await createUser(tx, `${t}-anna`)
      const b = await createUser(tx, `${t}-bjarni`)
      const c = await createUser(tx, `${t}-cecilia`)
      await tx.insert(schema.userRole).values({ userId: b, role: 'admin' })
      const ed = await seededEdition(tx)
      await createProject(tx, { editionId: ed.editionId, userId: c, title: `${t} Verk` })
      await createProject(tx, { editionId: ed.editionId, userId: c, title: `${t} Verk 2` })

      const ids = async (p: Parameters<typeof listUsers>[1]) => (await listUsers(tx, { q: t, ...p })).rows.map((r) => r.id)
      expect(await ids({ sort: 'name', dir: 'asc' })).toEqual([a, b, c])
      expect(await ids({ sort: 'name', dir: 'desc' })).toEqual([c, b, a])
      expect(await ids({ role: 'admin' })).toEqual([b])
      expect(await ids({ q: `${t}-ANNA` })).toEqual([a])
      expect(await ids({ sort: 'projects', dir: 'desc' })).toEqual([c, a, b])

      const page = await listUsers(tx, { q: t, sort: 'name', dir: 'asc', pageSize: 2, page: 9 })
      expect(page).toMatchObject({ total: 3, page: 2, pageCount: 2 })
      expect(page.rows.map((r) => r.id)).toEqual([c])
      const first = (await listUsers(tx, { q: t, sort: 'name', dir: 'asc' })).rows
      expect(first.map((r) => [r.isAdmin, r.projects])).toEqual([
        [false, 0],
        [true, 0],
        [false, 2],
      ])
    })
  })

  it('shows a user’s own projects, their memberships and their entries', async () => {
    await withRollback(db, async (tx) => {
      const t = tag()
      const owner = await createUser(tx, `${t}-owner`)
      const member = await createUser(tx, `${t}-member`)
      const ed = await seededEdition(tx)
      const mine = await createProject(tx, { editionId: ed.editionId, userId: member, title: `${t} Mitt` })
      const theirs = await createProject(tx, { editionId: ed.editionId, userId: owner, title: `${t} Annarra` })
      const entryId = await createEntry(tx, { projectId: theirs, categoryId: ed.categories[0].id, status: 'submitted' })
      await tx.insert(schema.projectPerson).values({
        projectId: theirs,
        kind: 'collaborator',
        name: 'Member',
        role: 'Hönnun',
        canEdit: true,
        userId: member,
        acceptedAt: new Date(),
      })

      const d = await getUserDetail(tx, member)
      expect(d).not.toBeNull()
      expect(d!.projects.map((p) => [p.projectId, p.title, p.entries.length])).toEqual([[mine, `${t} Mitt`, 0]])
      expect(d!.memberships).toHaveLength(1)
      expect(d!.memberships[0]).toMatchObject({
        projectId: theirs,
        kind: 'collaborator',
        creditRole: 'Hönnun',
        canEdit: true,
        entries: [{ entryId, status: 'submitted' }],
      })
      expect(await getUserDetail(tx, '0198c7a0-1111-7222-8333-444455556666')).toBeNull()
    })
  })
})
