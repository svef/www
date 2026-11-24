// @vitest-environment node
import { and, eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import * as schema from '../db/schema'
import { encryptCredential } from '../projects/crypto'
import { StaffEntryNotFound, viewCredentials } from './credentials'
import { withRollback } from './rollback'
import {
  createEntry,
  createProject,
  createUser,
  openFixtureDb,
  seededEdition,
  type FixtureDb,
  type SeededEdition,
} from './test-fixtures'

const url = process.env.AWARDS_DATABASE_URL_UNPOOLED ?? process.env.AWARDS_DATABASE_URL

describe.skipIf(!url)('viewCredentials', () => {
  const { db, close } = openFixtureDb()
  let ed: SeededEdition
  beforeAll(async () => {
    ed = await seededEdition(db)
  })
  afterAll(() => close())

  async function setup(tx: FixtureDb) {
    const owner = await createUser(tx, 'owner')
    const staff = await createUser(tx, 'staff')
    const projectId = await createProject(tx, { editionId: ed.editionId, userId: owner, title: 'Með aðgangi' })
    const entryId = await createEntry(tx, { projectId, categoryId: ed.categories[0].id, status: 'submitted' })
    await tx.insert(schema.credential).values([
      { projectId, label: 'Admin', valueEncrypted: encryptCredential('hunter2-ÞÆÖ'), notes: 'tvíþátta' },
      { projectId, label: '', valueEncrypted: encryptCredential('second') },
    ])
    return { owner, staff, projectId, entryId }
  }

  const events = (tx: FixtureDb, entryId: string) =>
    tx
      .select()
      .from(schema.entryEvent)
      .where(and(eq(schema.entryEvent.entryId, entryId), eq(schema.entryEvent.type, 'credentials_viewed')))

  it('decrypts every login detail and records who looked, without the values', async () => {
    await withRollback(db, async (tx) => {
      const { staff, entryId, projectId } = await setup(tx)
      const items = await viewCredentials(tx, { entryId, actorUserId: staff })
      expect(items.map((i) => i.value)).toEqual(['hunter2-ÞÆÖ', 'second'])
      expect(items[0]).toMatchObject({ label: 'Admin', notes: 'tvíþátta' })

      const logged = await events(tx, entryId)
      expect(logged).toHaveLength(1)
      expect(logged[0]).toMatchObject({ actorUserId: staff, projectId, data: { count: 2 } })
      expect(JSON.stringify(logged[0])).not.toContain('hunter2')
    })
  })

  it('writes one event for every view', async () => {
    await withRollback(db, async (tx) => {
      const { staff, entryId } = await setup(tx)
      await viewCredentials(tx, { entryId, actorUserId: staff })
      await viewCredentials(tx, { entryId, actorUserId: staff })
      await viewCredentials(tx, { entryId, actorUserId: staff })
      expect(await events(tx, entryId)).toHaveLength(3)
    })
  })

  it('logs a view of a project with no login details, and refuses an unknown or retired entry', async () => {
    await withRollback(db, async (tx) => {
      const owner = await createUser(tx, 'o2')
      const staff = await createUser(tx, 's2')
      const projectId = await createProject(tx, { editionId: ed.editionId, userId: owner, title: 'Án aðgangs' })
      const entryId = await createEntry(tx, { projectId, categoryId: ed.categories[0].id, status: 'submitted' })
      expect(await viewCredentials(tx, { entryId, actorUserId: staff })).toEqual([])
      expect((await events(tx, entryId))[0].data).toEqual({ count: 0 })

      await expect(
        viewCredentials(tx, { entryId: '00000000-0000-7000-8000-000000000000', actorUserId: staff }),
      ).rejects.toBeInstanceOf(StaffEntryNotFound)

      await tx.update(schema.project).set({ deletedAt: new Date() }).where(eq(schema.project.id, projectId))
      await expect(viewCredentials(tx, { entryId, actorUserId: staff })).rejects.toBeInstanceOf(StaffEntryNotFound)
    })
  })

  it('leaves no event behind when decryption fails (the audit row and the view are one transaction)', async () => {
    await withRollback(db, async (tx) => {
      const { staff, entryId, projectId } = await setup(tx)
      await tx.insert(schema.credential).values({ projectId, label: 'bad', valueEncrypted: Buffer.from('not encrypted') })
      await expect(viewCredentials(tx, { entryId, actorUserId: staff })).rejects.toThrow()
      expect(await events(tx, entryId)).toHaveLength(0)
    })
  })
})
