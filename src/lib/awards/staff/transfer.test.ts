// @vitest-environment node
import { and, eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { loadDashboard } from '../dashboard/queries'
import * as schema from '../db/schema'
import { getRole } from '../projects/service'
import { withRollback } from './rollback'
import { transferProject } from './transfer'
import {
  createProject,
  createUser,
  openFixtureDb,
  seededEdition,
  type SeededEdition,
} from './test-fixtures'

const url = process.env.AWARDS_DATABASE_URL_UNPOOLED ?? process.env.AWARDS_DATABASE_URL

describe.skipIf(!url)('transferProject', () => {
  const { db, close } = openFixtureDb()
  let ed: SeededEdition
  beforeAll(async () => {
    ed = await seededEdition(db)
  })
  afterAll(() => close())

  const users = async (tx: typeof db, ...labels: string[]) => {
    const out: string[] = []
    for (const l of labels) out.push(await createUser(tx, l))
    return out
  }

  const email = async (tx: typeof db, id: string) =>
    (await tx.select({ e: schema.user.email }).from(schema.user).where(eq(schema.user.id, id)))[0].e

  it('makes the new creator the creator, writes an event, and the old creator keeps nothing', async () => {
    await withRollback(db, async (tx) => {
      const [oldC, newC, staff] = await users(tx, 'old', 'new', 'staff')
      const projectId = await createProject(tx, { editionId: ed.editionId, userId: oldC, title: 'Á ferð' })
      expect(await getRole(tx, oldC, projectId)).toBe('creator')

      // The match is on the email, whatever its case or surrounding space.
      const r = await transferProject(tx, {
        projectId,
        toEmail: `  ${(await email(tx, newC)).toUpperCase()} `,
        actorUserId: staff,
      })
      expect(r).toMatchObject({ ok: true, to: { id: newC }, from: { id: oldC } })

      expect(await getRole(tx, newC, projectId)).toBe('creator')
      expect(await getRole(tx, oldC, projectId)).toBeNull()
      const [ev] = await tx
        .select()
        .from(schema.entryEvent)
        .where(and(eq(schema.entryEvent.projectId, projectId), eq(schema.entryEvent.type, 'project_transferred')))
      expect(ev).toMatchObject({
        actorUserId: staff,
        entryId: null,
        before: { createdBy: oldC },
        after: { createdBy: newC },
      })

      // The project is now on the new creator's dashboard, and gone from the old one's.
      const mine = await loadDashboard(tx, { userId: newC, now: new Date('2026-12-20T12:00:00Z') })
      expect(mine?.projects.map((p) => p.id)).toContain(projectId)
      const theirs = await loadDashboard(tx, { userId: oldC, now: new Date('2026-12-20T12:00:00Z') })
      expect(theirs?.projects.map((p) => p.id)).not.toContain(projectId)
    })
  })

  it('leaves an old creator who is also an accepted editor as an editor', async () => {
    await withRollback(db, async (tx) => {
      const [oldC, newC, staff] = await users(tx, 'old2', 'new2', 'staff2')
      const projectId = await createProject(tx, { editionId: ed.editionId, userId: oldC, title: 'Ritstjóri' })
      await tx.insert(schema.projectPerson).values({
        projectId,
        kind: 'collaborator',
        name: 'Old',
        canEdit: true,
        userId: oldC,
        acceptedAt: new Date(),
      })
      await transferProject(tx, { projectId, toEmail: await email(tx, newC), actorUserId: staff })
      expect(await getRole(tx, oldC, projectId)).toBe('editor')
      expect(await getRole(tx, newC, projectId)).toBe('creator')
    })
  })

  it('releases an edit lock the old creator no longer has the right to hold', async () => {
    await withRollback(db, async (tx) => {
      const [oldC, newC, staff] = await users(tx, 'old3', 'new3', 'staff3')
      const projectId = await createProject(tx, { editionId: ed.editionId, userId: oldC, title: 'Læst' })
      await tx.insert(schema.projectEditLock).values({ projectId, holderUserId: oldC })
      await transferProject(tx, { projectId, toEmail: await email(tx, newC), actorUserId: staff })
      const locks = await tx.select().from(schema.projectEditLock).where(eq(schema.projectEditLock.projectId, projectId))
      expect(locks).toEqual([])
    })
  })

  it('refuses an unknown email, the current creator, a bad address and a missing project, changing nothing', async () => {
    await withRollback(db, async (tx) => {
      const [oldC, staff] = await users(tx, 'old4', 'staff4')
      const projectId = await createProject(tx, { editionId: ed.editionId, userId: oldC, title: 'Kyrrt' })
      const go = (toEmail: string, id = projectId) =>
        transferProject(tx, { projectId: id, toEmail, actorUserId: staff })

      expect(await go('nobody-here@example.test')).toEqual({ ok: false, error: 'user_not_found' })
      expect(await go(await email(tx, oldC))).toEqual({ ok: false, error: 'already_creator' })
      expect(await go('not an email')).toEqual({ ok: false, error: 'invalid_email' })
      expect(await go(await email(tx, staff), '00000000-0000-7000-8000-000000000000')).toEqual({
        ok: false,
        error: 'project_not_found',
      })

      const [p] = await tx.select().from(schema.project).where(eq(schema.project.id, projectId))
      expect(p.createdBy).toBe(oldC)
      const events = await tx
        .select()
        .from(schema.entryEvent)
        .where(and(eq(schema.entryEvent.projectId, projectId), eq(schema.entryEvent.type, 'project_transferred')))
      expect(events).toEqual([])
    })
  })

  it('does not hand a project to a retired account', async () => {
    await withRollback(db, async (tx) => {
      const [oldC, gone, staff] = await users(tx, 'old5', 'gone', 'staff5')
      await tx.update(schema.user).set({ deletedAt: new Date() }).where(eq(schema.user.id, gone))
      const projectId = await createProject(tx, { editionId: ed.editionId, userId: oldC, title: 'Hætt' })
      expect(await transferProject(tx, { projectId, toEmail: await email(tx, gone), actorUserId: staff })).toEqual({
        ok: false,
        error: 'user_not_found',
      })
    })
  })
})
