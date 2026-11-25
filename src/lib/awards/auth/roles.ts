import { DEFAULT_LOCALE, localePath, type Locale } from '@/lib/i18n'
import { PORTAL } from '@/lib/portal/paths'

/**
 * The roles an account can hold (`user_role.role`):
 *
 * - `admin` opens the admin (Stjórnborð). The value was `staff` until the portal (#121); a
 *   data migration renamed the rows, and the database still accepts the old value so code
 *   from before the rename keeps working against the same tables.
 * - `superadmin` can do everything an admin can, and regular admins cannot manage it: they
 *   cannot change a super admin's roles, nor grant super admin. Nothing in the interface
 *   grants or removes it; it is set in the database (`npm run awards:grant-superadmin`). So
 *   there is always someone admins cannot demote, and the admin cannot be left without one.
 */
export const ADMIN_ROLE = 'admin'
export const SUPERADMIN_ROLE = 'superadmin'
export type Role = typeof ADMIN_ROLE | typeof SUPERADMIN_ROLE
/** Every role that opens the admin. */
export const ADMIN_ROLES: readonly Role[] = [ADMIN_ROLE, SUPERADMIN_ROLE]

/** Whether a user's roles open the admin (admin or super admin). Pure, so the gate is testable. */
export function hasAdminRole(roles: readonly string[]): boolean {
  return roles.some((r) => (ADMIN_ROLES as readonly string[]).includes(r))
}

/** Whether a user's roles include super admin. */
export function hasSuperAdminRole(roles: readonly string[]): boolean {
  return roles.includes(SUPERADMIN_ROLE)
}

/** Where signing in lands when no `next` is given: the portal's overview. */
export function dashboardPath(locale: Locale): string {
  return localePath(PORTAL.overview, locale)
}

/**
 * Accepts a `next` parameter only if it is a path on this site. Anything else
 * (an absolute URL, `//host`, a backslash trick) falls back to `fallback`, so a
 * crafted sign-in link cannot bounce the reader to another site.
 */
export function safeNext(next: string | null | undefined, fallback: string): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) {
    return fallback
  }
  if (/[\u0000-\u001f]/.test(next)) return fallback
  return next
}

export function signInPath(locale: Locale = DEFAULT_LOCALE, next?: string): string {
  const base = localePath('/innskraning', locale)
  return next ? `${base}?next=${encodeURIComponent(next)}` : base
}
