'use server'

import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { requireStaff } from '@/lib/awards/auth/session'
import { getAwardsDb } from '@/lib/awards/db/client'
import { entry } from '@/lib/awards/db/schema'
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
