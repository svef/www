'use server'

import { redirect } from 'next/navigation'
import { getAwardsDb } from '@/lib/awards/db/client'
import { createProject } from '@/lib/awards/projects/service'
import { getCurrentUserId } from '@/lib/awards/session'
import { isLocale, localePath } from '@/lib/i18n'

/** Creates an empty project for the signed-in user, in the language they are reading, and opens it. */
export async function createProjectAction(formData: FormData): Promise<void> {
  const locale = String(formData.get('locale') ?? '')
  if (!isLocale(locale)) throw new Error('Unknown locale.')
  const { id } = await createProject(getAwardsDb(), {
    userId: await getCurrentUserId(),
    locale,
  })
  redirect(localePath(`/innsendingar/${id}`, locale))
}
