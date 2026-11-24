import { DEFAULT_LOCALE, localePath, type Locale } from '@/lib/i18n'

export type Role = 'staff'

/** Whether a user's roles include staff. Pure, so the gate is testable. */
export function hasStaffRole(roles: readonly string[]): boolean {
  return roles.includes('staff')
}

/** Where signing in lands when no `next` is given: the entrant dashboard. */
export function dashboardPath(locale: Locale): string {
  return localePath('/innsendingar/minar', locale)
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
