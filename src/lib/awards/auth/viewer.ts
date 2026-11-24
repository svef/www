import 'server-only'
import { cache } from 'react'
import { notFound, redirect } from 'next/navigation'
import { and, eq, isNull } from 'drizzle-orm'
import { getAwardsDb } from '@/lib/awards/db/client'
import { user as userTable } from '@/lib/awards/db/schema'
import { getCurrentUserId, NotSignedInError } from '@/lib/awards/session'
import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n'
import { getRoles } from './session'
import { hasAdminRole, signInPath } from './roles'

/**
 * The person looking at a portal page: who they are and whether they are an admin. The
 * shell (sidebar, avatar menu) and the page both ask, so it is read once per request
 * (`cache`).
 *
 * Built on `getCurrentUserId()`, the same "who is this?" the awards pages always used: the
 * Better Auth session, or in test mode the `awards-test-user` cookie, so an e2e acting as
 * someone sees the same shell they would. The row is read from the database rather than
 * from the session, so a name changed on the account page shows at once.
 */
export interface Viewer {
  id: string
  name: string
  email: string
  phone: string | null
  emailVerified: boolean
  isAdmin: boolean
}

export const getViewer = cache(async (): Promise<Viewer | null> => {
  let id: string
  try {
    id = await getCurrentUserId()
  } catch (e) {
    if (e instanceof NotSignedInError) return null
    throw e
  }
  const [row] = await getAwardsDb()
    .select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
      phone: userTable.phone,
      emailVerified: userTable.emailVerified,
    })
    .from(userTable)
    .where(and(eq(userTable.id, id), isNull(userTable.deletedAt)))
  if (!row) return null
  return { ...row, isAdmin: hasAdminRole(await getRoles(row.id)) }
})

/** The viewer, or a redirect to sign-in that comes back to `next` afterwards. */
export async function requireViewer(
  options: { locale?: Locale; next?: string } = {},
): Promise<Viewer> {
  const viewer = await getViewer()
  if (!viewer) redirect(signInPath(options.locale ?? DEFAULT_LOCALE, options.next))
  return viewer
}

/**
 * Like `requireViewer`, and the viewer must be an admin. A signed-in non-admin gets a 404,
 * not a 403: the admin's existence is not advertised. Server actions call it again
 * themselves, since an action can be posted to without loading the page.
 */
export async function requireAdmin(
  options: { locale?: Locale; next?: string } = {},
): Promise<Viewer> {
  const viewer = await requireViewer(options)
  if (!viewer.isAdmin) notFound()
  return viewer
}
