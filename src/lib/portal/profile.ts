/**
 * Validating the account page's profile form. Pure, so the rules are tested apart from the
 * action that applies them.
 */
export type ProfileInput = { name: string; phone: string; preferredLocale: string }
export type ProfileErrors = Partial<Record<'name' | 'phone' | 'preferredLocale', 'required' | 'nameLong' | 'phone'>>
export type Profile = { name: string; phone: string | null; preferredLocale: 'is' | 'en' }

export const MAX_NAME = 200
// Digits with the separators people type: spaces, hyphens, dots, brackets and a leading +.
const PHONE = /^\+?[0-9(][0-9 ().-]{2,30}$/

export function parseProfile(
  input: ProfileInput,
): { ok: true; value: Profile } | { ok: false; errors: ProfileErrors } {
  const name = input.name.trim().replace(/\s+/g, ' ')
  const phone = input.phone.trim()
  const errors: ProfileErrors = {}
  if (!name) errors.name = 'required'
  else if (name.length > MAX_NAME) errors.name = 'nameLong'
  if (phone && !PHONE.test(phone)) errors.phone = 'phone'
  const preferredLocale = input.preferredLocale === 'en' ? 'en' : 'is'
  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return { ok: true, value: { name, phone: phone || null, preferredLocale } }
}

/** What sign-up refuses, as Better Auth error codes (the form maps them to its own copy). */
export type SignUpProfileCode = 'NAME_REQUIRED' | 'NAME_TOO_LONG' | 'INVALID_PHONE'

/**
 * The same rules for Better Auth's sign-up body, which arrives as untrusted JSON: fields that
 * are not strings count as empty, and the language is `is` unless it is exactly `en`. Used by
 * the sign-up hook in `auth.ts`, which writes the tidied values back before the user is
 * created, so sign-up and the account page store the same shapes.
 */
export function parseSignUpProfile(
  body: unknown,
): { ok: true; value: Profile } | { ok: false; code: SignUpProfileCode } {
  const b = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  const str = (v: unknown) => (typeof v === 'string' ? v : '')
  const parsed = parseProfile({ name: str(b.name), phone: str(b.phone), preferredLocale: str(b.preferredLocale) })
  if (parsed.ok) return parsed
  if (parsed.errors.name === 'required') return { ok: false, code: 'NAME_REQUIRED' }
  if (parsed.errors.name === 'nameLong') return { ok: false, code: 'NAME_TOO_LONG' }
  return { ok: false, code: 'INVALID_PHONE' }
}
