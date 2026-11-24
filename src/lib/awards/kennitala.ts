const WEIGHTS = [3, 2, 7, 6, 5, 4, 3, 2]

export type KennitalaResult =
  | { valid: true; kind: 'person' | 'company'; normalized: string }
  | { valid: false; reason: 'format' | 'date' | 'checksum' | 'century' }

/**
 * Validates an Icelandic kennitala: 10 digits, optional hyphen after the sixth, checksum over the
 * first eight digits (weights 3,2,7,6,5,4,3,2; check digit = 11 - sum mod 11, 11 -> 0, 10 invalid),
 * century digit 8 (1800s), 9 (1900s) or 0 (2000s). Companies add 40 to the day of the month.
 */
export function validateKennitala(input: string): KennitalaResult {
  const m = /^(\d{6})-?(\d{4})$/.exec(input.trim())
  if (!m) return { valid: false, reason: 'format' }
  const digits = m[1] + m[2]
  const d = [...digits].map(Number)

  let day = Number(digits.slice(0, 2))
  const month = Number(digits.slice(2, 4))
  const kind = day > 40 ? 'company' : 'person'
  if (kind === 'company') day -= 40
  if (day < 1 || day > 31 || month < 1 || month > 12)
    return { valid: false, reason: 'date' }

  const sum = WEIGHTS.reduce((acc, w, i) => acc + w * d[i], 0)
  const check = 11 - (sum % 11)
  if (check === 10 || (check === 11 ? 0 : check) !== d[8])
    return { valid: false, reason: 'checksum' }

  if (![8, 9, 0].includes(d[9])) return { valid: false, reason: 'century' }
  return { valid: true, kind, normalized: digits }
}

export function isValidKennitala(input: string): boolean {
  return validateKennitala(input).valid
}
