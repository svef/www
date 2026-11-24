import { and, eq, inArray, isNotNull, isNull } from 'drizzle-orm'
import { getCategory } from '../categories'
import {
  category,
  entry,
  entryRequest,
  project,
  projectAnswer,
  projectPerson,
  user,
} from '../db/schema'
import {
  requestOpenedEmail,
  requestReminderEmail,
  sendEmail,
  type EmailContent,
  type OutgoingEmail,
  type RequestEmailInput,
} from '../email'
import { getField } from '../fields'
import type { Queryable } from '../projects/db-types'
import { localePath, type Locale } from '@/lib/i18n'
import { getSiteUrl } from '@/lib/site-url'
import { PORTAL } from '@/lib/portal/paths'

/**
 * Emails 4 and 5: "a request was opened" and the deadline reminder. Both go to the
 * project's creator and its accepted editors, each in their own language (their account's
 * preferred locale, else the language the project was created in).
 */

export type NotifyDeps = {
  send?: (message: OutgoingEmail) => Promise<void>
  siteUrl?: string
}

/** `sent`: every recipient was reached. `partial`: some. `failed`: none. `none`: nobody to write to. */
export type NotifyResult = 'sent' | 'partial' | 'failed' | 'none'

export type Recipient = { userId: string; email: string; name: string; locale: Locale }

const asLocale = (v: string | null | undefined): Locale | null => (v === 'is' || v === 'en' ? v : null)

/** The creator plus every editor who accepted their invitation, once each. */
export async function projectRecipients(q: Queryable, projectId: string): Promise<Recipient[]> {
  const [p] = await q
    .select({ createdBy: project.createdBy, locale: project.locale })
    .from(project)
    .where(and(eq(project.id, projectId), isNull(project.deletedAt)))
  if (!p) return []
  const editors = await q
    .select({ userId: projectPerson.userId })
    .from(projectPerson)
    .where(
      and(
        eq(projectPerson.projectId, projectId),
        eq(projectPerson.canEdit, true),
        isNotNull(projectPerson.userId),
        isNotNull(projectPerson.acceptedAt),
        isNull(projectPerson.deletedAt),
      ),
    )
  const ids = [...new Set([p.createdBy, ...editors.map((e) => e.userId as string)])]
  const users = await q
    .select({
      id: user.id,
      email: user.email,
      name: user.name,
      preferredLocale: user.preferredLocale,
    })
    .from(user)
    .where(inArray(user.id, ids))
  const projectLocale = asLocale(p.locale) ?? 'is'
  return ids
    .map((id) => users.find((u) => u.id === id))
    .filter((u): u is NonNullable<typeof u> => !!u && u.email !== '')
    .map((u) => ({
      userId: u.id,
      email: u.email,
      name: u.name,
      locale: asLocale(u.preferredLocale) ?? projectLocale,
    }))
}

async function loadRequestContext(q: Queryable, requestId: string) {
  const [row] = await q
    .select({
      message: entryRequest.message,
      fieldKeys: entryRequest.fieldKeys,
      deadlineAt: entryRequest.deadlineAt,
      projectId: entry.projectId,
      slug: category.slug,
      title: projectAnswer.value,
    })
    .from(entryRequest)
    .innerJoin(entry, eq(entry.id, entryRequest.entryId))
    .innerJoin(category, eq(category.id, entry.categoryId))
    .leftJoin(
      projectAnswer,
      and(
        eq(projectAnswer.projectId, entry.projectId),
        eq(projectAnswer.fieldKey, 'title'),
        isNull(projectAnswer.deletedAt),
      ),
    )
    .where(eq(entryRequest.id, requestId))
  return row ?? null
}

async function notify(
  q: Queryable,
  requestId: string,
  render: (input: RequestEmailInput) => EmailContent,
  deps: NotifyDeps,
): Promise<NotifyResult> {
  try {
    const ctx = await loadRequestContext(q, requestId)
    if (!ctx) return 'none'
    const recipients = await projectRecipients(q, ctx.projectId)
    if (recipients.length === 0) return 'none'
    const send = deps.send ?? sendEmail
    const base = deps.siteUrl ?? getSiteUrl()
    const title = typeof ctx.title === 'string' && ctx.title ? ctx.title : '—'
    let ok = 0
    for (const r of recipients) {
      try {
        const content = render({
          locale: r.locale,
          name: r.name,
          projectTitle: title,
          category: getCategory(ctx.slug)?.name[r.locale] ?? ctx.slug,
          message: ctx.message,
          fields: ctx.fieldKeys.map((k) => {
            try {
              return getField(k).label[r.locale]
            } catch {
              return k
            }
          }),
          deadlineAt: ctx.deadlineAt,
          url: `${base}${localePath(PORTAL.project(ctx.projectId), r.locale)}#requests`,
        })
        await send({ to: r.email, ...content })
        ok++
      } catch (e) {
        console.error('[awards] request email failed', e)
      }
    }
    return ok === recipients.length ? 'sent' : ok === 0 ? 'failed' : 'partial'
  } catch (e) {
    console.error('[awards] request email failed', e)
    return 'failed'
  }
}

export const notifyRequestOpened = (q: Queryable, requestId: string, deps: NotifyDeps = {}) =>
  notify(q, requestId, requestOpenedEmail, deps)

export const notifyRequestReminder = (q: Queryable, requestId: string, deps: NotifyDeps = {}) =>
  notify(q, requestId, requestReminderEmail, deps)
