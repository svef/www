/**
 * Fills a local, throwaway awards database with a realistic volume of data, to see how the
 * admin and the portal hold up at the size the Icelandic Web Awards actually reach: about 300
 * projects across the categories and every status, 150 accounts, collaborators, answers,
 * requests and a few thousand events.
 *
 *   npm run awards:seed-volume
 *
 * It never touches the database the app, the unit tests and the e2e suite use. It (re)creates
 * a database of its own next to it, `svef_awards_volume` on the same server
 * (`AWARDS_VOLUME_DATABASE` names another), drops whatever was there, migrates and seeds it,
 * then fills it. Point a server at it to look:
 *
 *   AWARDS_DATABASE_URL=postgresql://svef:svef@localhost:5433/svef_awards_volume npm start
 *
 * Local only: it refuses to run on Vercel (`VERCEL_ENV` set) or against any host that is not
 * this machine.
 */
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { and, asc, eq, isNull } from 'drizzle-orm'
import { Pool } from 'pg'
import { fileURLToPath } from 'node:url'
import { uuidv7 } from 'uuidv7'
import { runMigrations } from './migrate'
import { seedAwards } from './seed'
import * as schema from './schema'

type Env = Record<string, string | undefined>

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])

export const VOLUME = { projects: 300, users: 150, admins: 3, noCategory: 20 } as const

/** `AWARDS_VOLUME_SCALE=10` multiplies projects, accounts and everything hanging off them, for a headroom check. */
function scaled(env: Env) {
  const k = Math.max(1, Math.min(50, Number(env.AWARDS_VOLUME_SCALE) || 1))
  return { projects: VOLUME.projects * k, users: VOLUME.users * k, admins: VOLUME.admins, noCategory: VOLUME.noCategory * k, billing: 80 * k }
}

/** Where to write, or why not. Pure, so the guard is tested. */
export function volumeTarget(env: Env): { ok: true; url: string; admin: string; name: string } | { ok: false; reason: string } {
  if (env.VERCEL_ENV || env.VERCEL) return { ok: false, reason: 'Refusing to run on Vercel.' }
  const base = env.AWARDS_DATABASE_URL_UNPOOLED ?? env.AWARDS_DATABASE_URL
  if (!base) return { ok: false, reason: 'Set AWARDS_DATABASE_URL (a local Postgres) first.' }
  let url: URL
  try {
    url = new URL(base)
  } catch {
    return { ok: false, reason: 'AWARDS_DATABASE_URL is not a URL.' }
  }
  if (!LOCAL_HOSTS.has(url.hostname)) {
    return { ok: false, reason: `Refusing to run against ${url.hostname}: local databases only.` }
  }
  const name = env.AWARDS_VOLUME_DATABASE || 'svef_awards_volume'
  if (!/^[a-z0-9_]+$/.test(name)) return { ok: false, reason: 'AWARDS_VOLUME_DATABASE must be [a-z0-9_].' }
  if (`/${name}` === url.pathname) {
    return { ok: false, reason: 'The volume database must not be the one AWARDS_DATABASE_URL uses.' }
  }
  const admin = new URL(url)
  admin.pathname = '/postgres'
  url.pathname = `/${name}`
  return { ok: true, url: url.toString(), admin: admin.toString(), name }
}

/** A small seeded PRNG (mulberry32), so every run builds the same data. */
function rng(seed: number) {
  let a = seed
  const next = () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    pick: <T>(xs: readonly T[]): T => xs[Math.floor(next() * xs.length)],
    weighted: <T>(xs: readonly (readonly [T, number])[]): T => {
      const total = xs.reduce((n, [, w]) => n + w, 0)
      let r = next() * total
      for (const [x, w] of xs) if ((r -= w) < 0) return x
      return xs[xs.length - 1][0]
    },
  }
}

const FIRST = ['Anna', 'Guðrún', 'Jón', 'Sigurður', 'Helga', 'Kristín', 'Ólafur', 'Einar', 'María', 'Björn', 'Sara', 'Gunnar', 'Elín', 'Magnús', 'Hildur', 'Davíð', 'Katrín', 'Ari', 'Þóra', 'Bjarki']
const LAST = ['Jónsdóttir', 'Sigurðsson', 'Guðmundsdóttir', 'Ólafsson', 'Einarsdóttir', 'Magnússon', 'Björnsdóttir', 'Gunnarsson', 'Kristjánsdóttir', 'Stefánsson']
const AGENCIES = ['Vefstofan', 'Hugsmiðjan', 'Kóði', 'Brandenburg', 'Jökulá', 'Stefna', 'Hvíta húsið', 'Aranja', 'Tékkland', 'Pipar', 'Döðlur', 'Kolibri']
const WORDS = ['Nýr', 'vefur', 'fyrir', 'Landsbankann', 'smáforrit', 'verslun', 'bókasafn', 'safn', 'ferðaþjónusta', 'hönnunarkerfi', 'aðgengi', 'umhverfi', 'heilsa', 'skóli', 'Reykjavík', 'Akureyri', 'tónlist', 'leikhús', 'herferð', 'gagnasýn']
const STATUSES = [
  ['draft', 25],
  ['submitted', 30],
  ['eligibility_pending', 10],
  ['eligible', 15],
  ['ineligible', 5],
  ['needs_clarification', 5],
  ['withdrawn', 10],
] as const

async function chunked<T>(rows: T[], size: number, insert: (part: T[]) => Promise<unknown>) {
  for (let i = 0; i < rows.length; i += size) await insert(rows.slice(i, i + size))
}

export async function fillVolume(
  db: NodePgDatabase<typeof schema>,
  size: ReturnType<typeof scaled> = scaled({}),
): Promise<Record<string, number>> {
  const r = rng(20261125)
  const [ed] = await db.select().from(schema.edition).where(and(eq(schema.edition.year, 2026), isNull(schema.edition.deletedAt)))
  if (!ed) throw new Error('No 2026 edition after seeding.')
  const cats = await db
    .select({ id: schema.category.id })
    .from(schema.category)
    .where(and(eq(schema.category.editionId, ed.id), isNull(schema.category.deletedAt)))
    .orderBy(asc(schema.category.sortOrder))
  const base = new Date('2026-09-01T09:00:00Z').getTime()
  const at = (dayOffset: number) => new Date(base + dayOffset * 86_400_000 + r.int(0, 86_399) * 1000)

  // Accounts.
  const users = Array.from({ length: size.users }, (_, i) => {
    const name = `${r.pick(FIRST)} ${r.pick(LAST)}`
    return {
      id: uuidv7(),
      name,
      email: `vol-${String(i).padStart(3, '0')}@example.test`,
      emailVerified: r.next() < 0.85,
      phone: r.next() < 0.6 ? `${r.int(500, 899)} ${r.int(1000, 9999)}` : null,
      preferredLocale: r.next() < 0.85 ? 'is' : 'en',
      createdAt: at(r.int(0, 60)),
    }
  })
  await chunked(users, 500, (part) => db.insert(schema.user).values(part))
  const admins = users.slice(0, size.admins)
  await db.insert(schema.userRole).values(admins.map((u, i) => ({ userId: u.id, role: i === 0 ? 'superadmin' : 'admin' })))
  await db.insert(schema.userEvent).values(
    admins.map((u, i) => ({ userId: u.id, actorUserId: i === 0 ? null : admins[0].id, type: 'role_granted', data: { role: i === 0 ? 'superadmin' : 'admin' }, createdAt: at(1) })),
  )

  // Billing profiles, about one for every two accounts.
  const billing = users.slice(0, size.billing).map((u, i) => ({
    id: uuidv7(),
    ownerUserId: u.id,
    kennitala: String(4000000000 + i * 1337).slice(0, 10),
    companyName: `${r.pick(AGENCIES)} ${i} ehf.`,
    invoiceEmail: `reikningar-${i}@example.test`,
    address: 'Aðalstræti 1, 101 Reykjavík',
  }))
  await db.insert(schema.billingProfile).values(billing)

  const projects: (typeof schema.project.$inferInsert)[] = []
  const answers: (typeof schema.projectAnswer.$inferInsert)[] = []
  const people: (typeof schema.projectPerson.$inferInsert)[] = []
  const entries: (typeof schema.entry.$inferInsert)[] = []
  const entryAnswers: (typeof schema.entryAnswer.$inferInsert)[] = []
  const events: (typeof schema.entryEvent.$inferInsert)[] = []
  const requests: (typeof schema.entryRequest.$inferInsert)[] = []

  for (let i = 0; i < size.projects; i++) {
    const creator = r.pick(users.slice(size.admins))
    const own = billing.find((b) => b.ownerUserId === creator.id)
    const id = uuidv7()
    const created = at(r.int(5, 80))
    projects.push({ id, editionId: ed.id, createdBy: creator.id, billingProfileId: own && r.next() < 0.8 ? own.id : null, locale: creator.preferredLocale, createdAt: created, updatedAt: created })
    const title = Array.from({ length: r.int(2, 5) }, () => r.pick(WORDS)).join(' ') + ` ${i}`
    answers.push(
      { projectId: id, fieldKey: 'title', value: title },
      { projectId: id, fieldKey: 'description', value: Array.from({ length: 60 }, () => r.pick(WORDS)).join(' ') },
      { projectId: id, fieldKey: 'links', value: [`https://example-${i}.is`] },
      { projectId: id, fieldKey: 'technicalAchievement', value: Array.from({ length: 40 }, () => r.pick(WORDS)).join(' ') },
      { projectId: id, fieldKey: 'publicCredit', value: r.pick(AGENCIES) },
      { projectId: id, fieldKey: 'requiresLogin', value: false },
    )
    people.push({ projectId: id, kind: 'owner', name: creator.name, email: creator.email, company: r.pick(AGENCIES), userId: creator.id, sortOrder: 0 })
    for (let k = 0; k < r.int(0, 4); k++) {
      const linked = r.next() < 0.4 ? r.pick(users) : null
      if (linked && (linked.id === creator.id || people.some((p) => p.projectId === id && p.userId === linked.id))) continue
      people.push({
        projectId: id,
        kind: 'collaborator',
        name: linked?.name ?? `${r.pick(FIRST)} ${r.pick(LAST)}`,
        email: linked?.email ?? `samstarf-${i}-${k}@example.test`,
        role: r.pick(['Hönnun', 'Forritun', 'Verkefnastjórn', 'Texti']),
        canEdit: !!linked,
        userId: linked?.id ?? null,
        invitedAt: linked ? created : null,
        acceptedAt: linked && r.next() < 0.8 ? created : null,
        sortOrder: k + 1,
      })
    }
    events.push({ projectId: id, actorUserId: creator.id, type: 'project_created', createdAt: created })
    for (let k = 0; k < r.int(3, 12); k++) {
      events.push({ projectId: id, actorUserId: creator.id, type: 'field_changed', fieldKey: r.pick(['title', 'description', 'links', 'technicalAchievement']), before: null, after: 'x', createdAt: at(r.int(10, 85)) })
    }

    if (i < size.noCategory) continue
    const chosen = new Set<string>()
    const n = r.weighted([[1, 60], [2, 30], [3, 10]] as const)
    while (chosen.size < n) chosen.add(r.pick(cats).id)
    for (const categoryId of chosen) {
      const status = r.weighted(STATUSES)
      const entryId = uuidv7()
      const priced = status !== 'draft' && status !== 'withdrawn'
      const submittedAt = priced ? at(r.int(40, 90)) : null
      entries.push({
        id: entryId,
        projectId: id,
        categoryId,
        status,
        statusBeforeClarification: status === 'needs_clarification' ? 'eligibility_pending' : null,
        submittedAt,
        ...(priced ? { priceRegular: 26900, discountPercent: r.pick([0, 30]), priceAmount: 18900, priceLockedAt: submittedAt } : {}),
        createdAt: created,
        updatedAt: created,
      })
      entryAnswers.push({ entryId, fieldKey: 'categoryPitch', value: Array.from({ length: 50 }, () => r.pick(WORDS)).join(' ') })
      events.push({ projectId: id, entryId, actorUserId: creator.id, type: 'category_added', createdAt: created })
      if (submittedAt) {
        events.push({ projectId: id, entryId, actorUserId: creator.id, type: 'entry_submitted', createdAt: submittedAt })
        if (status !== 'submitted') {
          events.push({ projectId: id, entryId, actorUserId: admins[1].id, type: 'eligibility_changed', before: { status: 'submitted' }, after: { status }, createdAt: at(92) })
        }
        if (r.next() < 0.3) events.push({ projectId: id, entryId, actorUserId: admins[1].id, type: 'invoicing_exported', data: { format: 'xlsx' }, createdAt: at(95) })
      }
      if (status === 'withdrawn') events.push({ projectId: id, entryId, actorUserId: creator.id, type: 'entry_withdrawn', createdAt: at(70) })
      if (status === 'needs_clarification') {
        requests.push({ entryId, authorUserId: admins[1].id, message: 'Vinsamlegast bætið við tengli.', fieldKeys: ['links'], deadlineAt: at(r.int(95, 110)) })
        events.push({ projectId: id, entryId, actorUserId: admins[1].id, type: 'request_opened', data: { requestId: uuidv7() }, createdAt: at(93) })
      }
    }
  }

  await chunked(projects, 500, (part) => db.insert(schema.project).values(part))
  await chunked(answers, 1000, (part) => db.insert(schema.projectAnswer).values(part))
  await chunked(people, 1000, (part) => db.insert(schema.projectPerson).values(part))
  await chunked(entries, 1000, (part) => db.insert(schema.entry).values(part))
  await chunked(entryAnswers, 1000, (part) => db.insert(schema.entryAnswer).values(part))
  await chunked(requests, 1000, (part) => db.insert(schema.entryRequest).values(part))
  await chunked(events, 1000, (part) => db.insert(schema.entryEvent).values(part))
  return {
    users: users.length,
    billingProfiles: billing.length,
    projects: projects.length,
    projectAnswers: answers.length,
    projectPeople: people.length,
    entries: entries.length,
    entryAnswers: entryAnswers.length,
    requests: requests.length,
    entryEvents: events.length,
  }
}

async function main() {
  const target = volumeTarget(process.env)
  if (!target.ok) throw new Error(target.reason)
  const admin = new Pool({ connectionString: target.admin, max: 1 })
  try {
    await admin.query(`drop database if exists "${target.name}" with (force)`)
    await admin.query(`create database "${target.name}"`)
  } finally {
    await admin.end()
  }
  await runMigrations(target.url)
  const pool = new Pool({ connectionString: target.url, max: 2 })
  try {
    const db = drizzle(pool, { schema })
    await seedAwards(db)
    const counts = await fillVolume(db, scaled(process.env))
    await pool.query('analyze')
    console.log(`awards: filled ${target.name}`, counts)
    console.log(`Serve it with AWARDS_DATABASE_URL=${target.url.replace(/:[^:@/]*@/, ':***@')}`)
  } finally {
    await pool.end()
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
