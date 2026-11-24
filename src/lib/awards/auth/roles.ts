import { DEFAULT_LOCALE, localePath, type Locale } from '@/lib/i18n'
import { PORTAL } from '@/lib/portal/paths'

/**
 * The roles an account can hold (`user_role.role`). One today: `admin`, which opens the
 * admin (Stjórnborð). The value was `staff` until the portal (#121); a data migration
 * renamed the rows, and the database still accepts the old value so code from before the
 * rename keeps working against the same tables.
 */
export const ADMIN_ROLE = 'admin'
export type Role = typeof ADMIN_ROLE

/** Whether a user's roles include admin. Pure, so the gate is testable. */
export function hasAdminRole(roles: readonly string[]): boolean {
  return roles.includes(ADMIN_ROLE)
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
