// @vitest-environment node
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import * as schema from '../db/schema'
import { AwardsError } from '../projects/errors'
import { LOCK_TTL_MS } from '../projects/lock-rules'
import {
  acquireEditLock,
  createProject,
  loadProject,
  setCategories,
  setProjectBillingProfile,
} from '../projects/service'
import {
  createBillingProfile,
  deleteBillingProfile,
  listBillingProfiles,
  updateBillingProfile,
} from './service'

/**
 * Billing profiles and choosing one for a project, against a real Postgres (migrated and
 * seeded, as for the project service; skipped when AWARDS_DATABASE_URL is unset).
 *
 * Every test runs inside a transaction that is rolled back at the end, so nothing is left
 * in the database: users, profiles and projects included (the event log refuses deletes,
 * so cleaning up afterwards would not be possible).
 */
const url = process.env.AWARDS_DATABASE_URL_UNPOOLED ?? process.env.AWARDS_DATABASE_URL

const valid = {
  companyName: 'Acme ehf.',
  kennitala: '471003-1239',
  invoiceEmail: 'invoices@acme.is',
  address: 'Laugavegur 1, 101 Reykjavík',
}

class Rollback extends Error {}

describe.skipIf(!url)('billing profiles', () => {
  let pool: Pool
  let db: ReturnType<typeof drizzle<typeof schema>>
  const T0 = new Date()

  beforeAll(() => {
    pool = new Pool({ connectionString: url, max: 4 })
    db = drizzle(pool, { schema })
  })
  afterAll(async () => {
    await pool?.end()
  })

  /** Runs `fn` against a transaction and rolls it back, whatever happens. */
  async function rolledBack(fn: (tx: typeof db) => Promise<void>) {
    try {
      await db.transaction(async (tx) => {
        await fn(tx as unknown as typeof db)
        throw new Rollback()
      })
    } catch (e) {
      if (!(e instanceof Rollback)) throw e
    }
  }
  let n = 0
  const makeUser = async (tx: typeof db, name = 'Test') =>
    (
      await tx
        .insert(schema.user)
        .values({
          name,
          email: `bill-${Date.now()}-${n++}-${Math.random().toString(36).slice(2)}@example.com`,
        })
        .returning({ id: schema.user.id })
    )[0].id
  const refusal = async (p: Promise<unknown>) => {
    try {
      await p
    } catch (e) {
      if (e instanceof AwardsError) return e
      throw e
    }
    throw new Error('expected an AwardsError')
  }
  async function editing(tx: typeof db, userId: string) {
    const [ed] = await tx
      .select({ id: schema.edition.id })
      .from(schema.edition)
      .where(eq(schema.edition.year, 2026))
    const { id } = await createProject(tx, { userId, locale: 'en', editionId: ed.id })
    await acquireEditLock(tx, { userId, projectId: id, now: T0 })
    return id
  }

  describe('the profiles themselves', () => {
    it('are created for the signed-in user, validated, with the kennitala stored as ten digits', async () => {
      await rolledBack(async (tx) => {
        const anna = await makeUser(tx)
        const p = await createBillingProfile(tx, {
          userId: anna,
          input: { ...valid, reference: 'PO-7' },
        })
        expect(p).toMatchObject({
          companyName: 'Acme ehf.',
          kennitala: '4710031239',
          reference: 'PO-7',
          inUse: 0,
        })
        const [row] = await tx
          .select()
          .from(schema.billingProfile)
          .where(eq(schema.billingProfile.id, p.id))
        expect(row.ownerUserId).toBe(anna)
      })
    })

    it('are refused with per-field errors when invalid', async () => {
      await rolledBack(async (tx) => {
        const anna = await makeUser(tx)
        const e = await refusal(
          createBillingProfile(tx, {
            userId: anna,
            input: { ...valid, kennitala: '4110021299' },
          }),
        )
        expect(e.code).toBe('invalid_input')
        expect(e.details.fieldErrors?.map((f) => [f.fieldKey, f.code])).toEqual([
          ['kennitala', 'kennitalaInvalid'],
        ])
        expect(await listBillingProfiles(tx, { userId: anna })).toEqual([])
      })
    })

    it('are listed for their owner only', async () => {
      await rolledBack(async (tx) => {
        const anna = await makeUser(tx)
        const bjarni = await makeUser(tx)
        await createBillingProfile(tx, { userId: anna, input: valid })
        await createBillingProfile(tx, {
          userId: bjarni,
          input: { ...valid, companyName: 'Bjarni ehf.' },
        })
        expect((await listBillingProfiles(tx, { userId: anna })).map((p) => p.companyName)).toEqual(
          ['Acme ehf.'],
        )
        expect(
          (await listBillingProfiles(tx, { userId: bjarni })).map((p) => p.companyName),
        ).toEqual(['Bjarni ehf.'])
      })
    })

    it('can be edited by their owner, and not by anyone else', async () => {
      await rolledBack(async (tx) => {
        const anna = await makeUser(tx)
        const bjarni = await makeUser(tx)
        const p = await createBillingProfile(tx, { userId: anna, input: valid })
        const edited = await updateBillingProfile(tx, {
          userId: anna,
          id: p.id,
          input: { ...valid, address: 'Elsewhere 2' },
        })
        expect(edited.address).toBe('Elsewhere 2')
        const e = await refusal(
          updateBillingProfile(tx, { userId: bjarni, id: p.id, input: valid }),
        )
        expect(e.code).toBe('not_found')
        const [row] = await tx
          .select()
          .from(schema.billingProfile)
          .where(eq(schema.billingProfile.id, p.id))
        expect(row.address).toBe('Elsewhere 2')
      })
    })

    it('can be deleted by their owner when no project uses them, and not by anyone else', async () => {
      await rolledBack(async (tx) => {
        const anna = await makeUser(tx)
        const bjarni = await makeUser(tx)
        const p = await createBillingProfile(tx, { userId: anna, input: valid })
        expect((await refusal(deleteBillingProfile(tx, { userId: bjarni, id: p.id }))).code).toBe(
          'not_found',
        )
        await deleteBillingProfile(tx, { userId: anna, id: p.id })
        expect(await listBillingProfiles(tx, { userId: anna })).toEqual([])
        expect((await refusal(deleteBillingProfile(tx, { userId: anna, id: p.id }))).code).toBe(
          'not_found',
        )
      })
    })

    it('stay while a project is invoiced to them', async () => {
      await rolledBack(async (tx) => {
        const anna = await makeUser(tx)
        const p = await createBillingProfile(tx, { userId: anna, input: valid })
        const projectId = await editing(tx, anna)
        await setProjectBillingProfile(tx, {
          userId: anna,
          projectId,
          billingProfileId: p.id,
          now: T0,
        })
        expect((await refusal(deleteBillingProfile(tx, { userId: anna, id: p.id }))).code).toBe(
          'billing_in_use',
        )
        expect((await listBillingProfiles(tx, { userId: anna }))[0].inUse).toBe(1)
      })
    })
  })

  describe('choosing one for a project', () => {
    it('sets it, shows it in the loaded project, and logs the change', async () => {
      await rolledBack(async (tx) => {
        const anna = await makeUser(tx)
        const p = await createBillingProfile(tx, { userId: anna, input: valid })
        const projectId = await editing(tx, anna)
        expect((await loadProject(tx, { userId: anna, projectId, now: T0 })).billing).toBeNull()

        await setProjectBillingProfile(tx, {
          userId: anna,
          projectId,
          billingProfileId: p.id,
          now: T0,
        })
        const view = await loadProject(tx, { userId: anna, projectId, now: T0 })
        expect(view.billing).toEqual({
          id: p.id,
          companyName: 'Acme ehf.',
          kennitala: '4710031239',
        })

        const events = await tx
          .select()
          .from(schema.entryEvent)
          .where(eq(schema.entryEvent.projectId, projectId))
        const e = events.find((x) => x.type === 'billing_profile_changed')!
        expect(e.actorUserId).toBe(anna)
        expect(e.before).toEqual({ billingProfileId: null })
        expect(e.after).toEqual({ billingProfileId: p.id })
      })
    })

    it('can be cleared, and choosing the same one again logs nothing', async () => {
      await rolledBack(async (tx) => {
        const anna = await makeUser(tx)
        const p = await createBillingProfile(tx, { userId: anna, input: valid })
        const projectId = await editing(tx, anna)
        const args = { userId: anna, projectId, now: T0 }
        await setProjectBillingProfile(tx, { ...args, billingProfileId: p.id })
        await setProjectBillingProfile(tx, { ...args, billingProfileId: p.id })
        await setProjectBillingProfile(tx, { ...args, billingProfileId: null })
        expect((await loadProject(tx, args)).billing).toBeNull()
        const events = await tx
          .select()
          .from(schema.entryEvent)
          .where(eq(schema.entryEvent.projectId, projectId))
        expect(events.filter((x) => x.type === 'billing_profile_changed')).toHaveLength(2)
      })
    })

    it('refuses someone else’s profile, as if it did not exist', async () => {
      await rolledBack(async (tx) => {
        const anna = await makeUser(tx)
        const bjarni = await makeUser(tx)
        const theirs = await createBillingProfile(tx, { userId: bjarni, input: valid })
        const projectId = await editing(tx, anna)
        const e = await refusal(
          setProjectBillingProfile(tx, {
            userId: anna,
            projectId,
            billingProfileId: theirs.id,
            now: T0,
          }),
        )
        expect(e.code).toBe('not_found')
        expect((await loadProject(tx, { userId: anna, projectId, now: T0 })).billing).toBeNull()
      })
    })

    it('needs the edit lock', async () => {
      await rolledBack(async (tx) => {
        const anna = await makeUser(tx)
        const p = await createBillingProfile(tx, { userId: anna, input: valid })
        const projectId = await editing(tx, anna)
        const e = await refusal(
          setProjectBillingProfile(tx, {
            userId: anna,
            projectId,
            billingProfileId: p.id,
            now: new Date(T0.getTime() + LOCK_TTL_MS + 1),
            // Expired, and nobody else holds it: the refusal says it can be taken again.
          }),
        )
        expect(e.code).toBe('lock_required')
      })
    })

    it('is closed once intake has closed', async () => {
      await rolledBack(async (tx) => {
        const anna = await makeUser(tx)
        const p = await createBillingProfile(tx, { userId: anna, input: valid })
        const projectId = await editing(tx, anna)
        const after = new Date('2027-02-02T00:00:00Z')
        await acquireEditLock(tx, { userId: anna, projectId, now: after })
        const e = await refusal(
          setProjectBillingProfile(tx, {
            userId: anna,
            projectId,
            billingProfileId: p.id,
            now: after,
          }),
        )
        expect(e.code).toBe('intake_closed')
      })
    })

    it('shows an editor the chosen profile’s company, though it is the creator’s', async () => {
      await rolledBack(async (tx) => {
        const anna = await makeUser(tx, 'Anna')
        const bjarni = await makeUser(tx, 'Bjarni')
        const p = await createBillingProfile(tx, { userId: anna, input: valid })
        const projectId = await editing(tx, anna)
        await setProjectBillingProfile(tx, {
          userId: anna,
          projectId,
          billingProfileId: p.id,
          now: T0,
        })
        await tx.insert(schema.projectPerson).values({
          projectId,
          kind: 'collaborator',
          name: 'B',
          email: 'b@example.com',
          canEdit: true,
          userId: bjarni,
          acceptedAt: T0,
        })
        const view = await loadProject(tx, { userId: bjarni, projectId, now: T0 })
        expect(view.billing?.companyName).toBe('Acme ehf.')
      })
    })
  })

  describe('the loaded project carries what the review needs', () => {
    it('has the early-bird settings and no locked price for a draft', async () => {
      await rolledBack(async (tx) => {
        const anna = await makeUser(tx)
        const projectId = await editing(tx, anna)
        await setCategories(tx, { userId: anna, projectId, categories: ['app'], now: T0 })
        const view = await loadProject(tx, { userId: anna, projectId, now: T0 })
        expect(view.earlyBird).toEqual({
          endsBefore: '2027-01-05T00:00:00.000Z',
          discountPercent: 30,
          rounding: 'nearest-900',
        })
        expect(view.entries[0].price).toBeNull()
      })
    })
  })
})
