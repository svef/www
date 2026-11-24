'use server'

import { redirect } from 'next/navigation'
import { getAwardsDb } from '@/lib/awards/db/client'
import { requireAdmin } from '@/lib/awards/auth/viewer'
import { serverNow } from '@/lib/awards/staff/clock'
import { sendDueRequestReminders } from '@/lib/awards/requests/reminders'
import { sendDueDraftReminders } from '@/lib/awards/reminders/send'
import { DEFAULT_LOCALE, isLocale, localePath, type Locale } from '@/lib/i18n'
import { ADMIN } from '@/lib/portal/paths'

const text = (form: FormData, key: string) => {
  const v = form.get(key)
  return typeof v === 'string' ? v : ''
}

/**
 * "Send reminders now": runs the same two sweeps as the daily crons (request deadline
 * reminders and draft reminders) at once. Both are idempotent, so whatever this sends, the
 * next scheduled run skips, and pressing it twice sends nothing twice.
 */
export async function sendRemindersNowAction(form: FormData): Promise<void> {
  const localeValue = text(form, 'locale')
  const locale: Locale = isLocale(localeValue) ? localeValue : DEFAULT_LOCALE
  const here = localePath(ADMIN.tools, locale)
  await requireAdmin({ locale, next: here })

  const db = getAwardsDb()
  const now = serverNow()
  const requests = await sendDueRequestReminders(db, { now })
  const drafts = await sendDueDraftReminders(db, { now })
  const sent = (r: { result: string }) => r.result === 'sent' || r.result === 'partial'
  const failed = (r: { result: string }) => r.result === 'failed'

  const back = new URLSearchParams()
  const year = text(form, 'year')
  if (year) back.set('year', year)
  back.set(
    'reminders',
    [
      requests.reminded.filter(sent).length,
      drafts.reminded.filter(sent).length,
      requests.reminded.filter(failed).length + drafts.reminded.filter(failed).length,
    ].join('.'),
  )
  redirect(`${here}?${back}#staff-reminders`)
}
