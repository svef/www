// @vitest-environment node
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestDatabase, type TestDatabase } from '../db/test-database'
import * as schema from '../db/schema'
import { AwardsError } from './errors'
import { LOCK_TTL_MS } from './lock-rules'
import {
  acquireEditLock,
  createProject,
  heartbeatEditLock,
  loadProject,
  releaseEditLock,
  saveAnswers,
  setCategories,
} from './service'

/**
 * The project service against a real Postgres. The suite creates, migrates and seeds a
 * database of its own and drops it afterwards, so it leaves nothing in the shared one
 * (`AWARDS_DATABASE_URL` only says which server to use; the role needs CREATEDB).
 * Skipped when it is unset. Every test makes its own users and project, and moves the
 * clock through `now` rather than waiting.
 */
const url = process.env.AWARDS_DATABASE_URL_UNPOOLED ?? process.env.AWARDS_DATABASE_URL

describe.skipIf(!url)('project service', () => {
  let pool: Pool
  let scratch: TestDatabase
  let db: ReturnType<typeof drizzle<typeof schema>>
  const T0 = new Date()
  const at = (ms: number) => new Date(T0.getTime() + ms)

  // The suite writes users, projects and (append-only) events, so it runs in a database of
  // its own that is dropped afterwards; the shared one is only used to find the server.
  beforeAll(async () => {
    scratch = await createTestDatabase(url!)
    pool = new Pool({ connectionString: scratch.url, max: 12 })
    db = drizzle(pool, { schema })
  }, 60_000)
  afterAll(async () => {
    await pool?.end()
    await scratch?.drop()
  })

  let n = 0
  async function makeUser(name = 'Test User') {
    const [u] = await db
      .insert(schema.user)
      .values({ name, email: `svc-${Date.now()}-${n++}-${Math.random().toString(36).slice(2)}@example.com` })
      .returning({ id: schema.user.id })
    return u.id
  }
  async function makeProject(userId?: string) {
    const owner = userId ?? (await makeUser('Anna'))
    // The 2026 edition by year, not "latest": other suites in the shared database
    // create throwaway editions.
    const [ed] = await db.select({ id: schema.edition.id }).from(schema.edition).where(eq(schema.edition.year, 2026))
    const { id } = await createProject(db, { userId: owner, locale: 'en', editionId: ed.id })
    return { id, owner }
  }
  const events = async (projectId: string, type?: string) => {
    const rows = await db.select().from(schema.entryEvent).where(eq(schema.entryEvent.projectId, projectId))
    return type ? rows.filter((r) => r.type === type) : rows
  }
  const refusal = async (p: Promise<unknown>) => {
    try {
      await p
    } catch (e) {
      if (e instanceof AwardsError) return e
      throw e
    }
    throw new Error('expected an AwardsError')
  }
  /** A project with the lock held by its creator and the given categories chosen. */
  async function editing(categories: string[] = ['marketing-website']) {
    const { id, owner } = await makeProject()
    await acquireEditLock(db, { userId: owner, projectId: id, now: T0 })
    if (categories.length)
      await setCategories(db, { userId: owner, projectId: id, categories, now: T0 })
    return { id, owner }
  }

  describe('edit lock', () => {
    it('is taken by the first to ask, with the event logged', async () => {
      const { id, owner } = await makeProject()
      const r = await acquireEditLock(db, { userId: owner, projectId: id, now: T0 })
      expect(r.held).toBe(true)
      expect(r.lock.holderName).toBe('Anna')
      expect(r.lock.expiresAt).toBe(at(LOCK_TTL_MS).toISOString())
      expect((await events(id, 'lock_acquired')).length).toBe(1)
    })

    it('is refused to anyone else while live, naming the holder; no forcing', async () => {
      const { id, owner } = await makeProject()
      const editor = await makeUser('Bjarni')
      await db.insert(schema.projectPerson).values({
        projectId: id, kind: 'collaborator', name: 'B', email: 'b@example.com',
        canEdit: true, userId: editor, acceptedAt: T0,
      })
      await acquireEditLock(db, { userId: owner, projectId: id, now: T0 })
      const r = await acquireEditLock(db, { userId: editor, projectId: id, now: at(LOCK_TTL_MS - 1) })
      expect(r.held).toBe(false)
      expect(r.lock.holderName).toBe('Anna')
      expect(r.lock.holderUserId).toBe(owner)
      // The refusal changed nothing.
      const [row] = await db.select().from(schema.projectEditLock).where(eq(schema.projectEditLock.projectId, id))
      expect(row.holderUserId).toBe(owner)
    })

    it('can be taken exactly at expiry, logging who it was taken from', async () => {
      const { id, owner } = await makeProject()
      const editor = await makeUser('Bjarni')
      await db.insert(schema.projectPerson).values({
        projectId: id, kind: 'collaborator', name: 'B', email: 'b@example.com',
        canEdit: true, userId: editor, acceptedAt: T0,
      })
      await acquireEditLock(db, { userId: owner, projectId: id, now: T0 })
      const r = await acquireEditLock(db, { userId: editor, projectId: id, now: at(LOCK_TTL_MS) })
      expect(r.held).toBe(true)
      const [e] = await events(id, 'lock_expired_taken')
      expect(e.actorUserId).toBe(editor)
      expect((e.data as { previousHolderUserId: string }).previousHolderUserId).toBe(owner)
    })

    it('renewing my own live lock keeps its start time and logs nothing new', async () => {
      const { id, owner } = await makeProject()
      await acquireEditLock(db, { userId: owner, projectId: id, now: T0 })
      const r = await acquireEditLock(db, { userId: owner, projectId: id, now: at(60_000) })
      expect(r.lock.acquiredAt).toBe(T0.toISOString())
      expect((await events(id, 'lock_acquired')).length).toBe(1)
    })

    it('goes to exactly one of many simultaneous askers', async () => {
      const { id, owner } = await makeProject()
      const others = await Promise.all(Array.from({ length: 7 }, (_, i) => makeUser(`U${i}`)))
      for (const u of others)
        await db.insert(schema.projectPerson).values({
          projectId: id, kind: 'collaborator', name: 'x', email: `${u}@example.com`,
          canEdit: true, userId: u, acceptedAt: T0,
        })
      const results = await Promise.all(
        [owner, ...others].map((userId) => acquireEditLock(db, { userId, projectId: id, now: T0 })),
      )
      expect(results.filter((r) => r.held).length).toBe(1)
      const holders = new Set(results.map((r) => r.lock.holderUserId))
      expect(holders.size).toBe(1)
      expect((await events(id, 'lock_acquired')).length).toBe(1)
    })

    it('is extended by heartbeats, so activity at 19 minutes keeps it past 20', async () => {
      const { id, owner } = await makeProject()
      const editor = await makeUser('Bjarni')
      await db.insert(schema.projectPerson).values({
        projectId: id, kind: 'collaborator', name: 'B', email: 'b@example.com',
        canEdit: true, userId: editor, acceptedAt: T0,
      })
      await acquireEditLock(db, { userId: owner, projectId: id, now: T0 })
      await heartbeatEditLock(db, { userId: owner, projectId: id, now: at(19 * 60_000) })
      const r = await acquireEditLock(db, { userId: editor, projectId: id, now: at(21 * 60_000) })
      expect(r.held).toBe(false)
    })

    it('refuses a heartbeat from someone who does not hold it, and from the holder once lapsed', async () => {
      const { id, owner } = await makeProject()
      await acquireEditLock(db, { userId: owner, projectId: id, now: T0 })
      const stranger = await makeUser('S')
      expect((await refusal(heartbeatEditLock(db, { userId: stranger, projectId: id, now: T0 }))).code).toBe('forbidden')
      const late = await refusal(heartbeatEditLock(db, { userId: owner, projectId: id, now: at(LOCK_TTL_MS) }))
      expect(late.code).toBe('lock_required')
      expect(late.toPayload().lock).toBeNull()
    })

    it('a release only ends the acquisition it was issued: a stale token leaves a re-acquired lock alone', async () => {
      const { id, owner } = await makeProject()
      const first = await acquireEditLock(db, { userId: owner, projectId: id, now: T0 })
      // The page is reloaded: the new page takes (renews) the lock before the old one's beacon lands.
      const second = await acquireEditLock(db, { userId: owner, projectId: id, now: at(1000) })
      expect(second.token).toBeTruthy()
      expect(second.token).not.toBe(first.token)
      expect(await releaseEditLock(db, { userId: owner, projectId: id, token: first.token!, now: at(2000) })).toBe(false)
      expect((await loadProject(db, { userId: owner, projectId: id, now: at(2000) })).lock).not.toBeNull()
      expect(await releaseEditLock(db, { userId: owner, projectId: id, token: 'not-a-uuid', now: at(2000) })).toBe(false)
      expect(await releaseEditLock(db, { userId: owner, projectId: id, token: second.token!, now: at(2000) })).toBe(true)
    })

    it('is released by the holder only, and logged', async () => {
      const { id, owner } = await makeProject()
      const got = await acquireEditLock(db, { userId: owner, projectId: id, now: T0 })
      const token = got.token!
      const stranger = await makeUser('S')
      expect(await releaseEditLock(db, { userId: stranger, projectId: id, token, now: T0 })).toBe(false)
      expect((await loadProject(db, { userId: owner, projectId: id, now: T0 })).lock).not.toBeNull()
      expect(await releaseEditLock(db, { userId: owner, projectId: id, token, now: T0 })).toBe(true)
      expect(await releaseEditLock(db, { userId: owner, projectId: id, token, now: T0 })).toBe(false)
      expect((await loadProject(db, { userId: owner, projectId: id, now: T0 })).lock).toBeNull()
      expect((await events(id, 'lock_released')).length).toBe(1)
    })
  })

  describe('authorisation', () => {
    it('keeps strangers out of every entry point, and reports missing projects', async () => {
      const { id } = await makeProject()
      const stranger = await makeUser('S')
      for (const call of [
        () => loadProject(db, { userId: stranger, projectId: id }),
        () => acquireEditLock(db, { userId: stranger, projectId: id }),
        () => saveAnswers(db, { userId: stranger, projectId: id, patch: { answers: { title: 'x' } } }),
        () => setCategories(db, { userId: stranger, projectId: id, categories: ['app'] }),
      ])
        expect((await refusal(call())).code).toBe('forbidden')
      expect(
        (await refusal(loadProject(db, { userId: stranger, projectId: '019aaaaa-0000-7000-8000-000000000000' }))).code,
      ).toBe('not_found')
    })

    it('lets an editor in once the invitation is accepted, not before', async () => {
      const { id } = await makeProject()
      const editor = await makeUser('Bjarni')
      const [person] = await db
        .insert(schema.projectPerson)
        .values({ projectId: id, kind: 'collaborator', name: 'B', email: 'b@example.com', canEdit: true, userId: editor, invitedAt: T0 })
        .returning()
      expect((await refusal(loadProject(db, { userId: editor, projectId: id }))).code).toBe('forbidden')
      await db.update(schema.projectPerson).set({ acceptedAt: T0 }).where(eq(schema.projectPerson.id, person.id))
      expect((await loadProject(db, { userId: editor, projectId: id })).role).toBe('editor')
    })

    it('does not let a collaborator without can_edit in', async () => {
      const { id } = await makeProject()
      const u = await makeUser('C')
      await db.insert(schema.projectPerson).values({ projectId: id, kind: 'collaborator', name: 'C', userId: u, acceptedAt: T0 })
      expect((await refusal(loadProject(db, { userId: u, projectId: id }))).code).toBe('forbidden')
    })
  })

  describe('writes need the lock', () => {
    it('refuses a save without it, naming the live holder when there is one', async () => {
      const { id, owner } = await makeProject()
      const e1 = await refusal(saveAnswers(db, { userId: owner, projectId: id, patch: { answers: { title: 'x' } }, now: T0 }))
      expect(e1.code).toBe('lock_required')
      expect(e1.toPayload().lock).toBeNull()

      const editor = await makeUser('Bjarni')
      await db.insert(schema.projectPerson).values({
        projectId: id, kind: 'collaborator', name: 'B', email: 'b@example.com',
        canEdit: true, userId: editor, acceptedAt: T0,
      })
      await acquireEditLock(db, { userId: editor, projectId: id, now: T0 })
      const e2 = await refusal(saveAnswers(db, { userId: owner, projectId: id, patch: { answers: { title: 'x' } }, now: at(1000) }))
      expect(e2.toPayload().lock?.holderName).toBe('Bjarni')
      const e3 = await refusal(setCategories(db, { userId: owner, projectId: id, categories: ['app'], now: at(1000) }))
      expect(e3.code).toBe('lock_required')
    })

    it('refuses once the lock has lapsed, and the lapsed holder can simply take it again', async () => {
      const { id, owner } = await editing()
      const e = await refusal(saveAnswers(db, { userId: owner, projectId: id, patch: { answers: { title: 'x' } }, now: at(LOCK_TTL_MS) }))
      expect(e.code).toBe('lock_required')
      await acquireEditLock(db, { userId: owner, projectId: id, now: at(LOCK_TTL_MS) })
      const r = await saveAnswers(db, { userId: owner, projectId: id, patch: { answers: { title: 'x' } }, now: at(LOCK_TTL_MS + 1) })
      expect(r.saved).toEqual(['title'])
    })

    it('counts every save as activity', async () => {
      const { id, owner } = await editing()
      await saveAnswers(db, { userId: owner, projectId: id, patch: { answers: { title: 'a' } }, now: at(19 * 60_000) })
      const view = await loadProject(db, { userId: owner, projectId: id, now: at(25 * 60_000) })
      expect(view.lock?.holderUserId).toBe(owner)
    })
  })

  describe('saving answers', () => {
    it('writes the field and one event with before and after; a repeat writes none', async () => {
      const { id, owner } = await editing()
      const save = (title: string, ms = 1000) =>
        saveAnswers(db, { userId: owner, projectId: id, patch: { answers: { title } }, now: at(ms) })
      expect((await save('First')).saved).toEqual(['title'])
      expect((await save('Second', 2000)).saved).toEqual(['title'])
      expect((await save('Second', 3000)).saved).toEqual(['title'])
      const changes = (await events(id, 'field_changed')).filter((e) => e.fieldKey === 'title')
      expect(changes.map((e) => [e.before, e.after])).toEqual([
        [null, 'First'],
        ['First', 'Second'],
      ])
      expect(changes[0].actorUserId).toBe(owner)
      expect((await loadProject(db, { userId: owner, projectId: id, now: at(4000) })).answers.title).toBe('Second')
    })

    it('clears an answer when blanked', async () => {
      const { id, owner } = await editing()
      await saveAnswers(db, { userId: owner, projectId: id, patch: { answers: { title: 'x' } }, now: at(1) })
      const r = await saveAnswers(db, { userId: owner, projectId: id, patch: { answers: { title: '  ' } }, now: at(2) })
      expect(r.saved).toEqual(['title'])
      expect((await loadProject(db, { userId: owner, projectId: id, now: at(3) })).answers.title).toBeUndefined()
    })

    it('writes the valid fields and reports the ones that fail validation', async () => {
      const { id, owner } = await editing()
      const r = await saveAnswers(db, {
        userId: owner, projectId: id, now: at(1),
        patch: { answers: { title: 'Fine', links: ['not a link'] } },
      })
      expect(r.saved).toEqual(['title'])
      expect(r.errors.map((e) => [e.fieldKey, e.code])).toEqual([['links', 'invalidUrl']])
      const view = await loadProject(db, { userId: owner, projectId: id, now: at(2) })
      expect(view.answers.links).toBeUndefined()
    })

    it('enforces length limits', async () => {
      const { id, owner } = await editing()
      const r = await saveAnswers(db, {
        userId: owner, projectId: id, now: at(1),
        patch: { answers: { title: 'x'.repeat(81) } },
      })
      expect(r.saved).toEqual([])
      expect(r.errors[0].code).toBe('tooLong')
    })

    it('rejects unknown, hidden, wrong-scope and not-saveable fields without touching the rest', async () => {
      const { id, owner } = await editing(['marketing-website'])
      const r = await saveAnswers(db, {
        userId: owner, projectId: id, now: at(1),
        patch: {
          answers: { title: 'T', nope: 1, aiRole: 'x', categoryPitch: 'p', image: { fileId: 'f' }, termsAccepted: true },
        },
      })
      expect(r.saved).toEqual(['title'])
      expect(Object.fromEntries(r.rejected.map((x) => [x.fieldKey, x.reason]))).toEqual({
        nope: 'unknown_field',
        aiRole: 'hidden',
        categoryPitch: 'wrong_scope',
        image: 'not_saveable',
        termsAccepted: 'not_saveable',
      })
    })

    it('refuses locked-after-submit fields but still takes editable ones', async () => {
      const { id, owner } = await editing()
      await db
        .update(schema.entry)
        .set({ status: 'submitted', submittedAt: T0 })
        .where(eq(schema.entry.projectId, id))
      const r = await saveAnswers(db, {
        userId: owner, projectId: id, now: at(1),
        patch: { answers: { title: 'Changed', links: ['https://example.is'], publicCredit: 'Anna' } },
      })
      expect(r.saved.sort()).toEqual(['links', 'publicCredit'])
      expect(r.rejected).toEqual([{ fieldKey: 'title', reason: 'locked_after_submit' }])
      const view = await loadProject(db, { userId: owner, projectId: id, now: at(2) })
      expect(view.editability.title).toEqual({ editable: false, reason: 'locked_after_submit' })
      expect(view.editability.links.editable).toBe(true)
    })

    it('opens a locked field again while a staff request unlocks it', async () => {
      const { id, owner } = await editing()
      const [e] = await db.select().from(schema.entry).where(eq(schema.entry.projectId, id))
      await db.update(schema.entry).set({ status: 'needs_clarification', statusBeforeClarification: 'submitted' }).where(eq(schema.entry.id, e.id))
      const staff = await makeUser('Staff')
      await db.insert(schema.entryRequest).values({
        entryId: e.id, authorUserId: staff, message: 'fix', fieldKeys: ['title'], deadlineAt: at(60 * 60_000),
      })
      const r = await saveAnswers(db, { userId: owner, projectId: id, now: at(1), patch: { answers: { title: 'Fixed' } } })
      expect(r.saved).toEqual(['title'])
    })

    it('a request on one entry unlocks its entry-scope fields only there; project-scope fields for the whole project', async () => {
      const { id, owner } = await editing(['marketing-website', 'app'])
      const entries = await db
        .select({ id: schema.entry.id, slug: schema.category.slug })
        .from(schema.entry)
        .innerJoin(schema.category, eq(schema.category.id, schema.entry.categoryId))
        .where(eq(schema.entry.projectId, id))
      await db.update(schema.entry).set({ status: 'submitted', submittedAt: T0 }).where(eq(schema.entry.projectId, id))
      const appEntry = entries.find((e) => e.slug === 'app')!
      const staff = await makeUser('Staff')
      await db.insert(schema.entryRequest).values({
        entryId: appEntry.id, authorUserId: staff, message: 'fix', fieldKeys: ['categoryPitch', 'title'], deadlineAt: at(60 * 60_000),
      })
      const r = await saveAnswers(db, {
        userId: owner, projectId: id, now: at(1),
        patch: {
          answers: { title: 'Fixed' },
          entryAnswers: {
            app: { categoryPitch: 'Pitch for the app' },
            'marketing-website': { categoryPitch: 'Pitch for the site' },
          },
        },
      })
      expect(r.saved).toEqual(expect.arrayContaining(['title', 'app:categoryPitch']))
      expect(r.saved).not.toContain('marketing-website:categoryPitch')
      expect(r.rejected).toEqual([{ fieldKey: 'marketing-website:categoryPitch', reason: 'locked_after_submit' }])
      const view = await loadProject(db, { userId: owner, projectId: id, now: at(2) })
      expect(view.entryEditability.app.categoryPitch).toEqual({ editable: true, reason: 'open_request' })
      expect(view.entryEditability['marketing-website'].categoryPitch.editable).toBe(false)
      expect(view.editability.title).toEqual({ editable: true, reason: 'open_request' })
    })

    it('refuses everything once intake has closed', async () => {
      const { id, owner } = await editing()
      const closed = new Date('2027-02-02T00:00:00Z')
      await acquireEditLock(db, { userId: owner, projectId: id, now: closed })
      const r = await saveAnswers(db, { userId: owner, projectId: id, now: closed, patch: { answers: { title: 'late', publicCredit: 'x' } } })
      expect(r.saved).toEqual([])
      expect(r.rejected.map((x) => x.reason)).toEqual(['intake_closed', 'intake_closed'])
    })

    it('saves owners and collaborators as people, keeping a row’s identity when its text changes', async () => {
      const { id, owner } = await editing()
      await saveAnswers(db, {
        userId: owner, projectId: id, now: at(1),
        patch: { answers: { owners: [{ name: 'Acme', email: 'acme@example.com' }] } },
      })
      const [before] = await db.select().from(schema.projectPerson).where(and(eq(schema.projectPerson.projectId, id), eq(schema.projectPerson.kind, 'owner')))
      await saveAnswers(db, {
        userId: owner, projectId: id, now: at(2),
        patch: { answers: { owners: [{ name: 'Acme ehf.', email: 'acme@example.com', company: 'Acme' }] } },
      })
      const rows = await db.select().from(schema.projectPerson).where(and(eq(schema.projectPerson.projectId, id), eq(schema.projectPerson.kind, 'owner')))
      expect(rows).toHaveLength(1)
      expect(rows[0].id).toBe(before.id)
      expect(rows[0].name).toBe('Acme ehf.')
      const view = await loadProject(db, { userId: owner, projectId: id, now: at(3) })
      expect(view.answers.owners).toEqual([{ name: 'Acme ehf.', email: 'acme@example.com', company: 'Acme' }])
      await saveAnswers(db, { userId: owner, projectId: id, now: at(4), patch: { answers: { owners: [] } } })
      expect((await loadProject(db, { userId: owner, projectId: id, now: at(5) })).answers.owners).toBeUndefined()
    })

    it('keeps the login details encrypted at rest and out of the event log, but readable by the editor', async () => {
      const { id, owner } = await editing()
      const secret = 'jury@example.com / correct-horse-battery'
      const r = await saveAnswers(db, {
        userId: owner, projectId: id, now: at(1),
        patch: { answers: { requiresLogin: true, loginInformation: [{ value: secret, notes: 'staging' }] } },
      })
      expect(r.saved.sort()).toEqual(['loginInformation', 'requiresLogin'])
      const rows = await db.select().from(schema.credential).where(eq(schema.credential.projectId, id))
      expect(rows).toHaveLength(1)
      expect(rows[0].valueEncrypted.toString('utf8')).not.toContain('correct-horse')
      const log = JSON.stringify(await events(id))
      expect(log).not.toContain('correct-horse')
      expect(log).toContain('[redacted]')
      const view = await loadProject(db, { userId: owner, projectId: id, now: at(2) })
      expect(view.answers.loginInformation).toEqual([{ value: secret, notes: 'staging' }])
      // No project_answer row holds them either.
      const answers = await db.select().from(schema.projectAnswer).where(eq(schema.projectAnswer.projectId, id))
      expect(JSON.stringify(answers)).not.toContain('correct-horse')
    })

    it('saves entry answers per category and logs them against the entry', async () => {
      const { id, owner } = await editing(['marketing-website', 'app'])
      const r = await saveAnswers(db, {
        userId: owner, projectId: id, now: at(1),
        patch: { entryAnswers: { app: { categoryPitch: 'Because.' }, 'ecommerce-website': { categoryPitch: 'x' } } },
      })
      expect(r.saved).toEqual(['app:categoryPitch'])
      expect(r.rejected).toEqual([{ fieldKey: 'ecommerce-website:categoryPitch', reason: 'no_entry' }])
      const view = await loadProject(db, { userId: owner, projectId: id, now: at(2) })
      expect(view.entries.find((e) => e.category === 'app')?.answers.categoryPitch).toBe('Because.')
      const ev = (await events(id, 'field_changed')).find((e) => e.fieldKey === 'categoryPitch')
      expect(ev?.entryId).toBe(view.entries.find((e) => e.category === 'app')?.id)
    })
  })

  describe('categories', () => {
    it('adds and removes draft entries, logging each', async () => {
      const { id, owner } = await editing(['marketing-website', 'app'])
      await setCategories(db, { userId: owner, projectId: id, categories: ['app', 'ai-solution'], now: at(1) })
      const view = await loadProject(db, { userId: owner, projectId: id, now: at(2) })
      expect(view.categories.sort()).toEqual(['ai-solution', 'app'])
      expect((await events(id, 'category_removed')).length).toBe(1)
      expect((await events(id, 'category_added')).length).toBe(3)
      // Re-adding a removed category revives the row.
      await setCategories(db, { userId: owner, projectId: id, categories: ['app', 'ai-solution', 'marketing-website'], now: at(3) })
      expect((await loadProject(db, { userId: owner, projectId: id, now: at(4) })).categories).toHaveLength(3)
      const rows = await db.select().from(schema.entry).where(eq(schema.entry.projectId, id))
      expect(rows).toHaveLength(3)
    })

    it('enforces one tier per select-one group and the exclusion pair', async () => {
      const { id, owner } = await editing([])
      const tier = await refusal(setCategories(db, { userId: owner, projectId: id, categories: ['company-website-small', 'company-website-large'], now: at(1) }))
      expect(tier.code).toBe('selection_invalid')
      expect(tier.toPayload().violations?.[0].kind).toBe('group')
      const ex = await refusal(setCategories(db, { userId: owner, projectId: id, categories: ['student-project', 'passion-project'], now: at(1) }))
      expect(ex.toPayload().violations?.[0].kind).toBe('exclusion')
      expect((await refusal(setCategories(db, { userId: owner, projectId: id, categories: ['bogus'], now: at(1) }))).code).toBe('unknown_category')
      expect((await loadProject(db, { userId: owner, projectId: id, now: at(2) })).categories).toEqual([])
    })

    it('will not drop a submitted entry, and will not revive a withdrawn one', async () => {
      const { id, owner } = await editing(['app', 'ai-solution'])
      const rows = await db.select().from(schema.entry).where(eq(schema.entry.projectId, id))
      const [cats] = [await db.select().from(schema.category)]
      const slug = (cid: string) => cats.find((c) => c.id === cid)!.slug
      const app = rows.find((r) => slug(r.categoryId) === 'app')!
      const ai = rows.find((r) => slug(r.categoryId) === 'ai-solution')!
      await db.update(schema.entry).set({ status: 'submitted', submittedAt: T0 }).where(eq(schema.entry.id, app.id))
      await db.update(schema.entry).set({ status: 'withdrawn' }).where(eq(schema.entry.id, ai.id))
      expect((await refusal(setCategories(db, { userId: owner, projectId: id, categories: ['ai-solution'], now: at(1) }))).code).toBe('cannot_remove_entry')
      expect((await refusal(setCategories(db, { userId: owner, projectId: id, categories: ['app', 'ai-solution'], now: at(1) }))).code).toBe('category_withdrawn')
    })

    it('forces requires-login on when Logged-In Platform is chosen', async () => {
      const { id, owner } = await editing([])
      await setCategories(db, { userId: owner, projectId: id, categories: ['logged-in-platform'], now: at(1) })
      const view = await loadProject(db, { userId: owner, projectId: id, now: at(2) })
      expect(view.answers.requiresLogin).toBe(true)
      const r = await saveAnswers(db, { userId: owner, projectId: id, now: at(3), patch: { answers: { requiresLogin: false } } })
      expect(r.errors[0].code).toBe('forcedValue')
    })
  })
})
