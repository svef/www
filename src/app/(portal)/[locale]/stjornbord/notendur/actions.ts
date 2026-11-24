'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { setAdminRole } from '@/lib/awards/admin/roles'
import { requireAdmin } from '@/lib/awards/auth/viewer'
import { getAwardsDb } from '@/lib/awards/db/client'
import { DEFAULT_LOCALE, isLocale, localePath, type Locale } from '@/lib/i18n'
import { ADMIN } from '@/lib/portal/paths'

const text = (form: FormData, key: string) => {
  const v = form.get(key)
  return typeof v === 'string' ? v : ''
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Grants or removes the admin role from the user page, then goes back to it with the
 * outcome in the query string. The admin check is made again here (an action can be posted
 * to without loading the page); the rules, including "not your own", are `setAdminRole`'s.
 */
export async function setRoleAction(form: FormData): Promise<void> {
  const localeValue = text(form, 'locale')
  const locale: Locale = isLocale(localeValue) ? localeValue : DEFAULT_LOCALE
  const userId = text(form, 'userId')
  const change = text(form, 'change')
  const list = localePath(ADMIN.users, locale)
  const actor = await requireAdmin({ locale, next: list })
  if (!UUID.test(userId) || (change !== 'grant' && change !== 'remove')) redirect(list)

  const result = await setAdminRole(getAwardsDb(), {
    actorId: actor.id,
    targetId: userId,
    change,
    // The real time, not the admin clock: this is a record of when it happened.
    now: new Date(),
  })
  revalidatePath(localePath(ADMIN.user(userId), locale))
  const back = new URLSearchParams({
    role: result.ok ? (change === 'grant' ? 'granted' : 'removed') : `error:${result.reason}`,
  })
  redirect(`${localePath(ADMIN.user(userId), locale)}?${back}#role`)
}
