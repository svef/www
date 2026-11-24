'use server'

import { redirect } from 'next/navigation'
import { getAwardsDb } from '@/lib/awards/db/client'
import { requireAdmin } from '@/lib/awards/auth/viewer'
import { serverNow } from '@/lib/awards/staff/clock'
import { isEligibilityTarget, setEligibilityBulk } from '@/lib/awards/staff/eligibility'
import { DEFAULT_LOCALE, isLocale, localePath, type Locale } from '@/lib/i18n'
import { ADMIN } from '@/lib/portal/paths'

const text = (form: FormData, key: string) => {
  const v = form.get(key)
  return typeof v === 'string' ? v : ''
}

/**
 * One server action for both the per-row buttons (`single`, "<entryId>:<status>") and the
 * bulk form (`entry` checkboxes plus a `to`). The admin check is made again here: the
 * page's own check does not protect an action, which anyone can post to.
 */
export async function setEligibilityAction(form: FormData): Promise<void> {
  const localeValue = text(form, 'locale')
  const locale: Locale = isLocale(localeValue) ? localeValue : DEFAULT_LOCALE
  const back = new URLSearchParams()
  for (const key of ['year', 'category', 'status', 'billing', 'q', 'sort', 'dir', 'page']) {
    const v = text(form, key)
    if (v) back.set(key, v)
  }
  const here = localePath(ADMIN.projects, locale)
  const user = await requireAdmin({ locale, next: here })

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
