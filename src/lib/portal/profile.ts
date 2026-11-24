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
