'use server'

import { redirect } from 'next/navigation'
import { getAwardsDb } from '@/lib/awards/db/client'
import { acceptInvitation } from '@/lib/awards/invitations/service'
import { getCurrentUserId, getRequestNow, NotSignedInError } from '@/lib/awards/session'
import { signInPath } from '@/lib/awards/auth/roles'
import { isLocale, localePath } from '@/lib/i18n'

/**
 * Accepts the invitation as the signed-in user, then opens the project. A refusal goes
 * back to the invitation page, which works out and shows the reason itself (expired,
 * withdrawn, used, another address) from the same state the service just read.
 */
export async function acceptInvitationAction(formData: FormData): Promise<void> {
  const locale = String(formData.get('locale') ?? '')
  const token = String(formData.get('token') ?? '')
  if (!isLocale(locale)) throw new Error('Unknown locale.')
  const page = localePath(`/innsendingar/bod/${token}`, locale)

  let userId: string
  try {
    userId = await getCurrentUserId()
  } catch (e) {
    if (e instanceof NotSignedInError) redirect(signInPath(locale, page))
    throw e
  }
  const result = await acceptInvitation(getAwardsDb(), {
    userId,
    token,
    now: await getRequestNow(),
    confirmDifferentEmail: formData.get('confirm') === '1',
  })
  redirect(result.ok ? localePath(`/innsendingar/${result.projectId}`, locale) : page)
}
