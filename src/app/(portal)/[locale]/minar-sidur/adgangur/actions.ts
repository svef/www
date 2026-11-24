'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { getViewer } from '@/lib/awards/auth/viewer'
import { getAwardsDb } from '@/lib/awards/db/client'
import { user } from '@/lib/awards/db/schema'
import { parseProfile, type ProfileErrors } from '@/lib/portal/profile'

export type ProfileResult = { ok: true } | { ok: false; errors?: ProfileErrors; signedOut?: true }

/**
 * Saves the account page's name, phone and email language on the signed-in user's own row.
 * The email is not editable (it is how one signs in). The whole portal is revalidated, so the
 * new name shows in the sidebar's avatar menu at once.
 */
export async function updateProfileAction(input: {
  name: string
  phone: string
  preferredLocale: string
}): Promise<ProfileResult> {
  const viewer = await getViewer()
  if (!viewer) return { ok: false, signedOut: true }
  const parsed = parseProfile({
    name: String(input?.name ?? ''),
    phone: String(input?.phone ?? ''),
    preferredLocale: String(input?.preferredLocale ?? ''),
  })
  if (!parsed.ok) return { ok: false, errors: parsed.errors }
  await getAwardsDb()
    .update(user)
    .set({ ...parsed.value, updatedAt: new Date() })
    .where(eq(user.id, viewer.id))
  revalidatePath('/[locale]/minar-sidur', 'layout')
  revalidatePath('/[locale]/stjornbord', 'layout')
  return { ok: true }
}
