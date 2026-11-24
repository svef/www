const blank = (v: unknown): boolean =>
  v === undefined ||
  v === null ||
  v === false ||
  (typeof v === 'string' && v.trim() === '') ||
  (Array.isArray(v) && v.every(blank)) ||
  (typeof v === 'object' &&
    v !== null &&
    !Array.isArray(v) &&
    Object.values(v as Record<string, unknown>).every(blank))

/**
 * What goes to the server for a field's local value. The form keeps half-filled rows
 * on screen (a new, empty link; a person with nothing typed yet); the server should
 * not see them, or one empty row would stop the whole list from saving. Blank rows are
 * dropped, and a wholly blank value becomes `null` (clear). A lone `false` is a real
 * answer for a toggle, so scalars are left alone.
 */
export function wireValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    const kept = value.filter((item) => !blank(item))
    return kept.length ? kept : null
  }
  if (value === undefined) return null
  return value
}
