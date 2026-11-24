// @vitest-environment node
import { releaseHeldLock } from '../bulk/test-helpers'
import { and, eq, isNull } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { createTestDatabase, type TestDatabase } from '../db/test-database'
import * as schema from '../db/schema'
import type { OutgoingEmail } from '../email'
import { AwardsError } from '../projects/errors'
import {
  acquireEditLock,
  createProject,
  getRole,
  loadProject,
  saveAnswers,
} from '../projects/service'
import {
  acceptInvitation,
  inviteStates,
  previewInvitation,
  resendInvitation,
} from './service'
import { hashInviteToken, INVITE_TTL_MS, RESEND_MIN_INTERVAL_MS } from './token'

/**
 * The invitation lifecycle against a real Postgres (a throwaway database, like the
 * project service suite): issue, hash, expire, single use, and every way to revoke.
 */
const url = process.env.AWARDS_DATABASE_URL_UNPOOLED ?? process.env.AWARDS_DATABASE_URL

describe.skipIf(!url)('invitations', () => {
  let pool: Pool
  let scratch: TestDatabase
  let db: ReturnType<typeof drizzle<typeof schema>>
  const T0 = new Date()
  const at = (ms: number) => new Date(T0.getTime() + ms)

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
  let run = ''
  /** Addresses are unique per test: users share one database. */
  const E = (name: string) => `${name}-${run}@example.com`
  async function makeUser(name: string, over: { email?: string; verified?: boolean } = {}) {
    const [u] = await db
      .insert(schema.user)
      .values({
        name,
        email: over.email ?? `inv-${Date.now()}-${n++}-${Math.random().toString(36).slice(2)}@example.com`,
        emailVerified: over.verified ?? true,
      })
      .returning({ id: schema.user.id, email: schema.user.email })
    return u
  }

  /** A project whose creator holds the lock, plus a mail spy. */
  async function setup() {
    run = `${Date.now()}-${n++}`
    const owner = await makeUser('Anna')
    const [ed] = await db
      .select({ id: schema.edition.id })
      .from(schema.edition)
      .where(eq(schema.edition.year, 2026))
    const { id } = await createProject(db, { userId: owner.id, locale: 'en', editionId: ed.id })
    await acquireEditLock(db, { userId: owner.id, projectId: id, now: T0 })
    const sent: OutgoingEmail[] = []
    const send = vi.fn(async (m: OutgoingEmail) => void sent.push(m))
    const tokenOf = (m: OutgoingEmail) => m.text.match(/\/(?:bod|invite)\/(\S+)/)![1]
    const collaborate = (
      userId: string,
      people: Record<string, unknown>[],
      now = at(1),
    ) =>
      saveAnswers(
        db,
        { userId, projectId: id, now, patch: { answers: { collaborators: people } } },
        { send },
      )
    return { id, owner, sent, send, tokenOf, collaborate }
  }
  const person = (over: Record<string, unknown> = {}) => ({
    name: 'Bjarni',
    role: 'Developer',
    email: E('bjarni'),
    canEdit: true,
    ...over,
  })
  const events = async (projectId: string, type: string) =>
    (await db.select().from(schema.entryEvent).where(eq(schema.entryEvent.projectId, projectId))).filter(
      (e) => e.type === type,
    )
  const rows = (projectId: string) =>
    db
      .select()
      .from(schema.projectPerson)
      .where(
        and(
          eq(schema.projectPerson.projectId, projectId),
          eq(schema.projectPerson.kind, 'collaborator'),
          isNull(schema.projectPerson.deletedAt),
        ),
      )
  const refusal = async (p: Promise<unknown>) => {
    try {
      await p
    } catch (e) {
      if (e instanceof AwardsError) return e
      throw e
    }
    throw new Error('expected an AwardsError')
  }

  describe('token', () => {
    it('hashes to 64 hex characters, differently per token', () => {
      expect(hashInviteToken('a')).toMatch(/^[0-9a-f]{64}$/)
      expect(hashInviteToken('a')).not.toBe(hashInviteToken('b'))
      expect(hashInviteToken('a')).toBe(hashInviteToken('a'))
    })
  })

  describe('creating', () => {
    it('ticking "Can edit" with an email invites: a hashed single-use token, invited_at, the mail and an event', async () => {
      const { id, owner, sent, tokenOf, collaborate } = await setup()
      const r = await collaborate(owner.id, [person()])
      expect(r.saved).toEqual(['collaborators'])
      expect(r.invitesFailed).toBe(0)
      expect(r.invites).toMatchObject([{ state: 'invited', email: E('bjarni') }])

      expect(sent).toHaveLength(1)
      expect(sent[0].to).toBe(E('bjarni'))
      expect(sent[0].subject).toContain('Anna')
      expect(sent[0].html).toContain('/en/my-pages/invite/')
      const token = tokenOf(sent[0])

      const [inv] = await db
        .select()
        .from(schema.projectInvitation)
        .where(eq(schema.projectInvitation.projectId, id))
      expect(inv.tokenHash).toBe(hashInviteToken(token))
      expect(JSON.stringify(inv)).not.toContain(token)
      expect(inv.expiresAt.getTime()).toBe(at(1).getTime() + INVITE_TTL_MS)
      expect((await rows(id))[0].invitedAt).toEqual(at(1))
      expect(await events(id, 'invitation_sent')).toHaveLength(1)
    })

    it('does nothing without an email or without the tick, and a later save does not re-send', async () => {
      const { id, owner, send, collaborate } = await setup()
      await collaborate(owner.id, [person({ email: '' }), person({ canEdit: false, email: E('c'), name: 'C' })])
      expect(send).not.toHaveBeenCalled()
      expect(await db.select().from(schema.projectInvitation).where(eq(schema.projectInvitation.projectId, id))).toHaveLength(0)

      await collaborate(owner.id, [person()], at(2))
      await collaborate(owner.id, [person({ role: 'Designer' })], at(3))
      expect(send).toHaveBeenCalledTimes(1)
    })

    it('an editor can invite too', async () => {
      const { id, owner, sent, tokenOf, collaborate } = await setup()
      const bjarni = await makeUser('Bjarni', { email: E('bjarni') })
      await collaborate(owner.id, [person()])
      const accepted = await acceptInvitation(db, { userId: bjarni.id, token: tokenOf(sent[0]), now: at(2) })
      expect(accepted).toMatchObject({ ok: true })
      await releaseHeldLock(db, owner.id, id, at(3))
      await acquireEditLock(db, { userId: bjarni.id, projectId: id, now: at(3) })
      await collaborate(bjarni.id, [person(), person({ name: 'Cara', email: E('cara') })], at(4))
      expect(sent.at(-1)?.to).toBe(E('cara'))
      expect(sent.at(-1)?.subject).toContain('Bjarni')
    })
  })

  describe('accepting', () => {
    it('links the account, stamps accepted_at, logs it, and grants editing', async () => {
      const { id, owner, sent, tokenOf, collaborate } = await setup()
      const bjarni = await makeUser('Bjarni', { email: E('bjarni'), verified: false })
      await collaborate(owner.id, [person()])
      const token = tokenOf(sent[0])
      expect(await getRole(db, bjarni.id, id)).toBeNull()

      const preview = await previewInvitation(db, token, at(2))
      expect(preview).toMatchObject({ status: 'valid', inviterName: 'Anna', email: E('bjarni'), projectId: id })

      // The invited address, so an unverified account is fine: the link proved the mailbox.
      const r = await acceptInvitation(db, { userId: bjarni.id, token, now: at(2) })
      expect(r).toEqual({ ok: true, projectId: id, alreadyHadAccess: false })
      const [row] = await rows(id)
      expect(row.userId).toBe(bjarni.id)
      expect(row.acceptedAt).toEqual(at(2))
      expect(await getRole(db, bjarni.id, id)).toBe('editor')
      const [ev] = await events(id, 'invitation_accepted')
      expect(ev.actorUserId).toBe(bjarni.id)
      expect((await inviteStates(db, id, at(3)))[0].state).toBe('accepted')
      // The editor can open it but is not the creator.
      expect((await loadProject(db, { userId: bjarni.id, projectId: id, now: at(3) })).role).toBe('editor')
    })

    it('is single use', async () => {
      const { sent, tokenOf, owner, collaborate } = await setup()
      const b = await makeUser('Bjarni', { email: E('bjarni') })
      const other = await makeUser('Other')
      await collaborate(owner.id, [person()])
      const token = tokenOf(sent[0])
      expect(await acceptInvitation(db, { userId: b.id, token, now: at(2) })).toMatchObject({ ok: true })
      expect(await acceptInvitation(db, { userId: other.id, token, now: at(3), confirmDifferentEmail: true })).toEqual({ ok: false, reason: 'used' })
      expect(await previewInvitation(db, token, at(3))).toEqual({ status: 'used' })
    })

    it('two accepts at once: one wins', async () => {
      const { sent, tokenOf, owner, collaborate } = await setup()
      const a = await makeUser('A', { email: E('bjarni') })
      const b = await makeUser('B')
      await collaborate(owner.id, [person()])
      const token = tokenOf(sent[0])
      const results = await Promise.all([
        acceptInvitation(db, { userId: a.id, token, now: at(2) }),
        acceptInvitation(db, { userId: b.id, token, now: at(2), confirmDifferentEmail: true }),
      ])
      expect(results.filter((r) => r.ok)).toHaveLength(1)
    })

    it('expires after 14 days, with a clear status', async () => {
      const { id, sent, tokenOf, owner, collaborate } = await setup()
      const b = await makeUser('Bjarni', { email: E('bjarni') })
      await collaborate(owner.id, [person()])
      const token = tokenOf(sent[0])
      const late = at(1 + INVITE_TTL_MS + 1)
      expect(await previewInvitation(db, token, at(1 + INVITE_TTL_MS - 1000))).toMatchObject({ status: 'valid' })
      expect(await previewInvitation(db, token, late)).toEqual({ status: 'expired' })
      expect(await acceptInvitation(db, { userId: b.id, token, now: late })).toEqual({ ok: false, reason: 'expired' })
      expect((await inviteStates(db, id, late))[0].state).toBe('expired')
    })

    it('an unknown token is simply invalid', async () => {
      expect(await previewInvitation(db, 'nope', T0)).toEqual({ status: 'invalid' })
      const u = await makeUser('X')
      expect(await acceptInvitation(db, { userId: u.id, token: 'nope', now: T0 })).toEqual({ ok: false, reason: 'invalid' })
    })

    it('another address: an unverified account is refused; a verified one must confirm', async () => {
      const { id, sent, tokenOf, owner, collaborate } = await setup()
      await collaborate(owner.id, [person()])
      const token = tokenOf(sent[0])
      const unverified = await makeUser('U', { verified: false })
      const verified = await makeUser('V', { verified: true })
      expect(await acceptInvitation(db, { userId: unverified.id, token, now: at(2), confirmDifferentEmail: true })).toEqual({
        ok: false,
        reason: 'unverified',
      })
      expect(await acceptInvitation(db, { userId: verified.id, token, now: at(2) })).toEqual({
        ok: false,
        reason: 'email_mismatch',
      })
      expect(await getRole(db, verified.id, id)).toBeNull()
      expect(await acceptInvitation(db, { userId: verified.id, token, now: at(2), confirmDifferentEmail: true })).toMatchObject({
        ok: true,
      })
      expect(await getRole(db, verified.id, id)).toBe('editor')
    })

    it('the creator opening their own invitation is sent to the project and uses nothing up', async () => {
      const { id, sent, tokenOf, owner, collaborate } = await setup()
      await collaborate(owner.id, [person()])
      const token = tokenOf(sent[0])
      expect(await acceptInvitation(db, { userId: owner.id, token, now: at(2) })).toEqual({
        ok: true,
        projectId: id,
        alreadyHadAccess: true,
      })
      expect(await previewInvitation(db, token, at(3))).toMatchObject({ status: 'valid' })
    })
  })

  describe('revoking', () => {
    it('unticking revokes the outstanding invitation', async () => {
      const { id, sent, tokenOf, owner, collaborate } = await setup()
      await collaborate(owner.id, [person()])
      const token = tokenOf(sent[0])
      await collaborate(owner.id, [person({ canEdit: false })], at(2))
      expect(await previewInvitation(db, token, at(3))).toEqual({ status: 'revoked' })
      expect((await rows(id))[0].invitedAt).toBeNull()
      expect((await events(id, 'invitation_revoked'))[0].data).toMatchObject({ reason: 'unticked', wasAccepted: false })
      expect((await inviteStates(db, id, at(3)))[0].state).toBe('none')
      // Ticking again is a new invitation, and the old link stays dead.
      await collaborate(owner.id, [person()], at(4))
      expect(sent).toHaveLength(2)
      expect(await previewInvitation(db, token, at(5))).toEqual({ status: 'revoked' })
      expect(await previewInvitation(db, tokenOf(sent[1]), at(5))).toMatchObject({ status: 'valid' })
    })

    it('removing the row revokes it', async () => {
      const { sent, tokenOf, owner, collaborate } = await setup()
      await collaborate(owner.id, [person()])
      await collaborate(owner.id, [], at(2))
      expect(await previewInvitation(db, tokenOf(sent[0]), at(3))).toEqual({ status: 'revoked' })
    })

    it('clearing the email revokes it', async () => {
      const { sent, tokenOf, owner, collaborate } = await setup()
      await collaborate(owner.id, [person()])
      await collaborate(owner.id, [person({ email: '', canEdit: false })], at(2))
      expect(await previewInvitation(db, tokenOf(sent[0]), at(3))).toEqual({ status: 'revoked' })
    })

    it('changing the email revokes the old link and invites the new address', async () => {
      const { id, sent, tokenOf, owner, collaborate } = await setup()
      await collaborate(owner.id, [person()])
      await collaborate(owner.id, [person({ email: E('new') })], at(2))
      expect(await previewInvitation(db, tokenOf(sent[0]), at(3))).toEqual({ status: 'revoked' })
      expect(sent.at(-1)?.to).toBe(E('new'))
      expect(await previewInvitation(db, tokenOf(sent[1]), at(3))).toMatchObject({ status: 'valid', email: E('new') })
      expect((await events(id, 'invitation_revoked'))[0].data).toMatchObject({ reason: 'email_changed' })
      // Only the case of the address changing is not a change.
      await collaborate(owner.id, [person({ email: E('new').toUpperCase() })], at(4))
      expect(sent).toHaveLength(2)
    })

    it('an accepted editor loses access (and their lock) when unticked or removed', async () => {
      for (const how of ['untick', 'remove'] as const) {
        const { id, owner, sent, tokenOf, collaborate } = await setup()
        const b = await makeUser('Bjarni', { email: E('bjarni') })
        await collaborate(owner.id, [person()])
        await acceptInvitation(db, { userId: b.id, token: tokenOf(sent[0]), now: at(2) })
        await releaseHeldLock(db, owner.id, id, at(3))
        await acquireEditLock(db, { userId: b.id, projectId: id, now: at(3) })
        expect(await getRole(db, b.id, id)).toBe('editor')

        // The creator takes the lock back once it lapses, then changes the list.
        const later = at(3 + 30 * 60 * 1000)
        await acquireEditLock(db, { userId: owner.id, projectId: id, now: later })
        await collaborate(owner.id, how === 'untick' ? [person({ canEdit: false })] : [], new Date(later.getTime() + 1))
        expect(await getRole(db, b.id, id)).toBeNull()
        await expect(loadProject(db, { userId: b.id, projectId: id, now: later })).rejects.toBeInstanceOf(AwardsError)
        expect((await events(id, 'invitation_revoked'))[0].data).toMatchObject({ wasAccepted: true })
      }
    })

    it('removing the first of two collaborators leaves the second one (and their access) alone', async () => {
      const { id, owner, sent, tokenOf, collaborate } = await setup()
      const cara = await makeUser('Cara', { email: E('cara') })
      const bjarni = person()
      const caraRow = person({ name: 'Cara', email: E('cara') })
      await collaborate(owner.id, [bjarni, caraRow])
      await acceptInvitation(db, { userId: cara.id, token: tokenOf(sent[1]), now: at(2) })
      await collaborate(owner.id, [caraRow], at(3))
      expect(sent).toHaveLength(2) // nobody re-invited
      expect(await getRole(db, cara.id, id)).toBe('editor')
      expect(await previewInvitation(db, tokenOf(sent[0]), at(4))).toEqual({ status: 'revoked' })
    })
  })

  describe('resending', () => {
    it('replaces the link, and the old one stops working', async () => {
      const { id, owner, sent, tokenOf, collaborate } = await setup()
      await collaborate(owner.id, [person()])
      const [p] = await rows(id)
      const later = at(1 + RESEND_MIN_INTERVAL_MS + 1)
      const mails: OutgoingEmail[] = []
      const r = await resendInvitation(
        db,
        { userId: owner.id, projectId: id, personId: p.id, now: later },
        { send: async (m) => void mails.push(m) },
      )
      expect(r.delivered).toBe(true)
      expect(r.invites[0].state).toBe('invited')
      expect(await previewInvitation(db, tokenOf(sent[0]), later)).toEqual({ status: 'revoked' })
      expect(await previewInvitation(db, tokenOf(mails[0]), later)).toMatchObject({ status: 'valid' })
      expect(await events(id, 'invitation_resent')).toHaveLength(1)
    })

    it('is refused within a minute, after accepting, and without the tick', async () => {
      const { id, owner, sent, tokenOf, collaborate } = await setup()
      await collaborate(owner.id, [person(), person({ name: 'C', email: E('c'), canEdit: false })])
      const [p, c] = await rows(id)
      const soon = await refusal(resendInvitation(db, { userId: owner.id, projectId: id, personId: p.id, now: at(2) }))
      expect(soon.code).toBe('invite_too_soon')
      const notEditor = await refusal(resendInvitation(db, { userId: owner.id, projectId: id, personId: c.id, now: at(1e6) }))
      expect(notEditor.code).toBe('invite_not_allowed')
      const b = await makeUser('Bjarni', { email: E('bjarni') })
      await acceptInvitation(db, { userId: b.id, token: tokenOf(sent[0]), now: at(3) })
      const accepted = await refusal(resendInvitation(db, { userId: owner.id, projectId: id, personId: p.id, now: at(1e6) }))
      expect(accepted.code).toBe('invite_not_allowed')
    })

    it('is for people on the project only', async () => {
      const { id, owner, collaborate } = await setup()
      await collaborate(owner.id, [person()])
      const [p] = await rows(id)
      const stranger = await makeUser('Stranger')
      expect((await refusal(resendInvitation(db, { userId: stranger.id, projectId: id, personId: p.id, now: at(1e6) }))).code).toBe('forbidden')
    })

    it('reports a mail failure without losing the invitation', async () => {
      const { id, owner, collaborate } = await setup()
      await collaborate(owner.id, [person()])
      const [p] = await rows(id)
      const r = await resendInvitation(
        db,
        { userId: owner.id, projectId: id, personId: p.id, now: at(1e6) },
        { send: async () => { throw new Error('smtp down') } },
      )
      expect(r.delivered).toBe(false)
      expect(r.invites[0].state).toBe('invited')
    })
  })

  it('a failing mail does not undo the save', async () => {
    const { id, owner } = await setup()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const r = await saveAnswers(
      db,
      { userId: owner.id, projectId: id, now: at(1), patch: { answers: { collaborators: [person()] } } },
      { send: async () => { throw new Error('smtp down') } },
    )
    expect(r.saved).toEqual(['collaborators'])
    expect(r.invitesFailed).toBe(1)
    expect((await rows(id))[0].invitedAt).toEqual(at(1))
  })
})
