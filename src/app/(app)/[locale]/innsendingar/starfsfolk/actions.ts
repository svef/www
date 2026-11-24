'use server'

import { redirect } from 'next/navigation'
import { getAwardsDb } from '@/lib/awards/db/client'
import { requireStaff } from '@/lib/awards/auth/session'
import { serverNow } from '@/lib/awards/staff/clock'
import { sendDueRequestReminders } from '@/lib/awards/requests/reminders'
import { sendDueDraftReminders } from '@/lib/awards/reminders/send'
import { isEligibilityTarget, setEligibilityBulk } from '@/lib/awards/staff/eligibility'
import { DEFAULT_LOCALE, isLocale, localePath, type Locale } from '@/lib/i18n'

const text = (form: FormData, key: string) => {
  const v = form.get(key)
  return typeof v === 'string' ? v : ''
}

/**
 * One server action for both the per-row buttons (`single`, "<entryId>:<status>") and the
 * bulk form (`entry` checkboxes plus a `to`). The staff check is made again here: the
 * page's own check does not protect an action, which anyone can post to.
 */
export async function setEligibilityAction(form: FormData): Promise<void> {
  const localeValue = text(form, 'locale')
  const locale: Locale = isLocale(localeValue) ? localeValue : DEFAULT_LOCALE
  const back = new URLSearchParams()
  for (const key of ['year', 'category', 'status', 'q', 'sort', 'dir', 'page']) {
    const v = text(form, key)
    if (v) back.set(key, v)
  }
  const here = localePath('/innsendingar/starfsfolk', locale)
  const user = await requireStaff({ locale, next: here })

  const single = text(form, 'single')
  let entryIds: string[]
  let to: string
  if (single) {
    const [id, status] = single.split(':')
    entryIds = [id]
    to = status
  } else {
    entryIds = form.getAll('entry').filter((v): v is string => typeof v === 'string')
    to = text(form, 'to')
  }

  if (entryIds.length === 0 || !isEligibilityTarget(to)) {
    back.set('result', 'none')
    redirect(`${here}?${back}`)
  }

  const result = await setEligibilityBulk(getAwardsDb(), {
    entryIds,
    to,
    actor: { userId: user.id, roles: ['staff'] },
    now: serverNow(),
  })
  back.set('changed', String(result.changed.length))
  for (const s of result.skipped) back.append('skip', `${s.entryId}:${s.reason}`)
  redirect(`${here}?${back}`)
}

/**
 * "Send reminders now": runs the same two sweeps as the daily crons (request deadline
 * reminders and draft reminders) at once. Both are idempotent, so whatever this sends, the
 * next scheduled run skips, and pressing it twice sends nothing twice.
 */
export async function sendRemindersNowAction(form: FormData): Promise<void> {
  const localeValue = text(form, 'locale')
  const locale: Locale = isLocale(localeValue) ? localeValue : DEFAULT_LOCALE
  const here = localePath('/innsendingar/starfsfolk', locale)
  await requireStaff({ locale, next: here })

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
