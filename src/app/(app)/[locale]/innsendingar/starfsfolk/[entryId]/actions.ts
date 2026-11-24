'use server'

import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { requireStaff } from '@/lib/awards/auth/session'
import { getAwardsDb } from '@/lib/awards/db/client'
import { entry } from '@/lib/awards/db/schema'
import {
  openRequest,
  replyToRequest,
  resolveRequestAsStaff,
} from '@/lib/awards/requests/service'
import { serverNow } from '@/lib/awards/staff/clock'
import { viewCredentials, type DecryptedCredential } from '@/lib/awards/staff/credentials'
import { transferProject } from '@/lib/awards/staff/transfer'
import { DEFAULT_LOCALE, isLocale, localePath, type Locale } from '@/lib/i18n'

export type RevealResult = { ok: true; items: DecryptedCredential[] } | { ok: false }

/**
 * Decrypts the entry's login details for the signed-in staff member. Each call writes a
 * `credentials_viewed` event (see `viewCredentials`); the values go back to the one caller
 * and are neither logged nor cached. The staff check is made here too: an action can be
 * posted to without ever loading the page.
 */
export async function revealCredentialsAction(entryId: string, localeValue: string): Promise<RevealResult> {
  const locale: Locale = isLocale(localeValue) ? localeValue : DEFAULT_LOCALE
  const user = await requireStaff({ locale, next: localePath('/innsendingar/starfsfolk', locale) })
  try {
    const items = await viewCredentials(getAwardsDb(), { entryId, actorUserId: user.id })
    return { ok: true, items }
  } catch {
    // Not-found and decryption failures look the same to the page, and carry nothing secret.
    return { ok: false }
  }
}

const text = (form: FormData, key: string) => {
  const v = form.get(key)
  return typeof v === 'string' ? v : ''
}

/** Transfers the entry's project to the account with the given email, then returns to the entry. */
export async function transferProjectAction(form: FormData): Promise<void> {
  const localeValue = text(form, 'locale')
  const locale: Locale = isLocale(localeValue) ? localeValue : DEFAULT_LOCALE
  const entryId = text(form, 'entryId')
  const here = localePath(`/innsendingar/starfsfolk/${encodeURIComponent(entryId)}`, locale)
  const user = await requireStaff({ locale, next: here })

  const db = getAwardsDb()
  const [row] = await db
    .select({ projectId: entry.projectId })
    .from(entry)
    .where(eq(entry.id, entryId))
  const result = row
    ? await transferProject(db, {
        projectId: row.projectId,
        toEmail: text(form, 'email'),
        actorUserId: user.id,
      })
    : ({ ok: false, error: 'project_not_found' } as const)

  redirect(
    result.ok
      ? `${here}?transferred=${encodeURIComponent(result.to.email)}`
      : `${here}?transfer_error=${result.error}`,
  )
}

// ── Requests (svef/www#169) ─────────────────────────────────────────────────

/** Where the entry page shows the outcome of the last request action. */
function backTo(locale: Locale, entryId: string, params: Record<string, string>): never {
  const base = localePath(`/innsendingar/starfsfolk/${encodeURIComponent(entryId)}`, locale)
  redirect(`${base}?${new URLSearchParams(params)}#requests`)
}

/** A `datetime-local` value is wall-clock time with no zone; the awards run on UTC (Iceland, all year). */
function parseDeadline(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null
  const at = new Date(`${value}:00Z`)
  return Number.isNaN(at.getTime()) ? null : at
}

/**
 * Opens a request on the entry: message, the fields it unlocks and its own deadline. The
 * staff check is made here too (an action can be posted to without loading the page), and
 * the time is the staff clock, like every other staff action.
 */
export async function openRequestAction(form: FormData): Promise<void> {
  const localeValue = text(form, 'locale')
  const locale: Locale = isLocale(localeValue) ? localeValue : DEFAULT_LOCALE
  const entryId = text(form, 'entryId')
  const here = localePath(`/innsendingar/starfsfolk/${encodeURIComponent(entryId)}`, locale)
  const user = await requireStaff({ locale, next: here })

  const result = await openRequest(getAwardsDb(), {
    entryId,
    actor: { userId: user.id, roles: ['staff'] },
    message: text(form, 'message'),
    fieldKeys: form.getAll('field').filter((v): v is string => typeof v === 'string'),
    deadlineAt: parseDeadline(text(form, 'deadline')),
    now: serverNow(),
  })
  if (result.ok) backTo(locale, entryId, { request: 'opened', mail: result.mail })
  backTo(locale, entryId, {
    request_error: result.reason === 'invalid' ? (result.invalid ?? []).join(',') || 'invalid' : result.reason,
  })
}

/** A staff message in a request's thread. */
export async function staffReplyAction(form: FormData): Promise<void> {
  const localeValue = text(form, 'locale')
  const locale: Locale = isLocale(localeValue) ? localeValue : DEFAULT_LOCALE
  const entryId = text(form, 'entryId')
  const here = localePath(`/innsendingar/starfsfolk/${encodeURIComponent(entryId)}`, locale)
  const user = await requireStaff({ locale, next: here })
  const result = await replyToRequest(getAwardsDb(), {
    requestId: text(form, 'requestId'),
    side: 'staff',
    actor: { userId: user.id, roles: ['staff'] },
    message: text(form, 'reply'),
    now: serverNow(),
  })
  backTo(locale, entryId, result.ok ? { request: 'replied' } : { request_error: result.reason })
}

/** Staff close a request (open or overdue); the entry goes back when none is left. */
export async function resolveRequestAction(form: FormData): Promise<void> {
  const localeValue = text(form, 'locale')
  const locale: Locale = isLocale(localeValue) ? localeValue : DEFAULT_LOCALE
  const entryId = text(form, 'entryId')
  const here = localePath(`/innsendingar/starfsfolk/${encodeURIComponent(entryId)}`, locale)
  const user = await requireStaff({ locale, next: here })
  const result = await resolveRequestAsStaff(getAwardsDb(), {
    requestId: text(form, 'requestId'),
    actor: { userId: user.id, roles: ['staff'] },
    now: serverNow(),
  })
  backTo(locale, entryId, result.ok ? { request: 'resolved' } : { request_error: result.reason })
}
