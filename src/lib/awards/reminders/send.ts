import { and, desc, eq, inArray, isNotNull, isNull, or } from 'drizzle-orm'
import type { AwardsDb } from '../db/client'
import { edition, entry, project, projectPerson, reminderLog, user, type ReminderWave } from '../db/schema'
import { draftReminderEmail, sendEmail, type OutgoingEmail } from '../email'
import { loadDashboard } from '../dashboard/queries'
import { localePath, type Locale } from '@/lib/i18n'
import { getSiteUrl } from '@/lib/site-url'
import { dueWave } from './rules'

export type DraftReminderDeps = {
  send?: (message: OutgoingEmail) => Promise<void>
  siteUrl?: string
}

export type DraftReminderSweep = {
  /** The wave that is open at `now`, or null when it is outside both. */
  wave: ReminderWave | null
  /** One per person the sweep sent (or tried to send) to. */
  reminded: { userId: string; result: 'sent' | 'failed' }[]
}

const asLocale = (v: string | null | undefined): Locale | null => (v === 'is' || v === 'en' ? v : null)

/**
 * Sends the draft reminders that are due at `now`: to everyone who created
 * or may edit a project in the latest edition that still has draft entries, one email per
 * person covering all their projects. Nothing is sent outside the two waves (`dueWave`), and
 * people with no drafts are skipped.
 *
 * Idempotent per (user, edition, wave): the `reminder_log` row is *claimed* by an insert that
 * the unique key lets only one of any overlapping runs win, before the send. If the send fails
 * the claim is deleted so the next run retries; it is otherwise kept for good.
 *
 * Meant to run daily from the cron route; running it more often is harmless.
 */
export async function sendDueDraftReminders(
  db: AwardsDb,
  input: { now: Date },
  deps: DraftReminderDeps = {},
): Promise<DraftReminderSweep> {
  const { now } = input
  const [ed] = await db
    .select()
    .from(edition)
    .where(isNull(edition.deletedAt))
    .orderBy(desc(edition.year))
    .limit(1)
  if (!ed) return { wave: null, reminded: [] }
  const wave = dueWave(now, ed)
  if (!wave) return { wave: null, reminded: [] }

  // Everyone with a draft in a live project: creators, and accepted editors.
  const drafts = db
    .select({ projectId: entry.projectId })
    .from(entry)
    .where(and(eq(entry.status, 'draft'), isNull(entry.deletedAt)))
  const live = and(
    eq(project.editionId, ed.id),
    isNull(project.deletedAt),
    inArray(project.id, drafts),
  )
  const creators = await db
    .selectDistinct({ userId: project.createdBy, projectLocale: project.locale })
    .from(project)
    .where(live)
  const editors = await db
    .selectDistinct({ userId: projectPerson.userId, projectLocale: project.locale })
    .from(projectPerson)
    .innerJoin(project, eq(project.id, projectPerson.projectId))
    .where(
      and(
        live,
        eq(projectPerson.canEdit, true),
        isNotNull(projectPerson.userId),
        isNotNull(projectPerson.acceptedAt),
        isNull(projectPerson.deletedAt),
      ),
    )
  const fallback = new Map<string, Locale>()
  for (const r of [...creators, ...editors])
    if (r.userId && !fallback.has(r.userId)) fallback.set(r.userId, asLocale(r.projectLocale) ?? 'is')
  const ids = [...fallback.keys()]
  if (ids.length === 0) return { wave, reminded: [] }

  const already = new Set(
    (
      await db
        .select({ userId: reminderLog.userId })
        .from(reminderLog)
        .where(and(eq(reminderLog.editionId, ed.id), eq(reminderLog.wave, wave)))
    ).map((r) => r.userId),
  )
  const users = await db
    .select({ id: user.id, email: user.email, name: user.name, preferredLocale: user.preferredLocale })
    .from(user)
    .where(inArray(user.id, ids))

  const send = deps.send ?? sendEmail
  const base = deps.siteUrl ?? getSiteUrl()
  const bound = wave === 'early_bird' ? ed.earlyBirdEndsBefore : ed.intakeClosesBefore
  const reminded: DraftReminderSweep['reminded'] = []

  for (const u of users) {
    if (already.has(u.id) || u.email === '') continue
    const locale = asLocale(u.preferredLocale) ?? fallback.get(u.id) ?? 'is'
    const board = await loadDashboard(db, { userId: u.id, now })
    const projects = (board?.projects ?? [])
      .map((p) => ({
        title: p.title,
        entries: p.entries
          .filter((e) => e.status === 'draft')
          .map((e) => ({
            category: e.categoryName[locale],
            price: e.price,
            priceRegular: e.priceRegular,
            missing: e.missing.map((m) => m.label[locale]),
          })),
      }))
      .filter((p) => p.entries.length > 0)
    if (projects.length === 0) continue

    const claimed = await db
      .insert(reminderLog)
      .values({ userId: u.id, editionId: ed.id, wave, sentAt: now })
      .onConflictDoNothing()
      .returning({ id: reminderLog.id })
    if (claimed.length === 0) continue // another run got it

    try {
      await send({
        to: u.email,
        ...draftReminderEmail({
          locale,
          name: u.name,
          wave,
          boundAt: bound,
          projects,
          url: `${base}${localePath('/innsendingar/minar', locale)}`,
        }),
      })
      reminded.push({ userId: u.id, result: 'sent' })
    } catch (e) {
      console.error('[awards] draft reminder failed', e)
      await db.delete(reminderLog).where(eq(reminderLog.id, claimed[0].id))
      reminded.push({ userId: u.id, result: 'failed' })
    }
  }
  return { wave, reminded }
}
