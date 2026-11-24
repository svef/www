import 'server-only'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { and, eq, isNull } from 'drizzle-orm'
import { getAwardsDb } from '@/lib/awards/db/client'
import { userRole } from '@/lib/awards/db/tables'
import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n'
import { getAuth } from './auth'
import { signInPath } from './roles'

/** The signed-in user as the rest of the awards code sees them. */
export interface SessionUser {
  id: string
  email: string
  name: string
  emailVerified: boolean
  phone: string | null
  preferredLocale: Locale | null
}

/** The current user, or `null` when nobody is signed in. Reads the request cookies. */
export async function getUser(): Promise<SessionUser | null> {
  const result = await getAuth().api.getSession({ headers: await headers() })
  if (!result) return null
  const u = result.user as typeof result.user & {
    phone?: string | null
    preferredLocale?: string | null
  }
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    emailVerified: u.emailVerified,
    phone: u.phone ?? null,
    preferredLocale: u.preferredLocale === 'is' || u.preferredLocale === 'en' ? u.preferredLocale : null,
  }
}

export async function getRoles(userId: string): Promise<string[]> {
  const rows = await getAwardsDb()
    .select({ role: userRole.role })
    .from(userRole)
    .where(and(eq(userRole.userId, userId), isNull(userRole.deletedAt)))
  return rows.map((r) => r.role)
}

/**
 * For server components and actions: the signed-in user, or a redirect to the
 * sign-in page that returns here afterwards (`next`). Does not require a
 * verified email; gate submitting on `user.emailVerified` separately.
 */
export async function requireUser(
  options: { locale?: Locale; next?: string } = {},
): Promise<SessionUser> {
  const user = await getUser()
  if (!user) redirect(signInPath(options.locale ?? DEFAULT_LOCALE, options.next))
  return user
}
