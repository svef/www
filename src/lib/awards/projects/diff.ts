import { getField } from '../fields'

export type FieldChange = { fieldKey: string; before: unknown; after: unknown }

/** Stand-in written to the event log where a value is a credential. */
export const REDACTED = '[redacted]'

function canon(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canon)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => [k, canon(v)]),
    )
  }
  return value
}

/** Deep equality for answer values (key order and `undefined` members don't matter). */
export function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(canon(a ?? null)) === JSON.stringify(canon(b ?? null))
}

/** Changes between two answer maps, over `keys` only, in the order given. */
export function diffAnswers(
  keys: readonly string[],
  before: Readonly<Record<string, unknown>>,
  after: Readonly<Record<string, unknown>>,
): FieldChange[] {
  const out: FieldChange[] = []
  for (const key of keys) {
    const b = before[key]
    const a = after[key]
    if (!sameValue(b, a)) out.push({ fieldKey: key, before: b ?? null, after: a ?? null })
  }
  return out
}

/**
 * The change as it may be written to the append-only log. A credential field
 * (`encrypted` in the definition) never reaches the log: a set value becomes
 * `{ redacted, items }`, so the log still shows that something was set,
 * changed or cleared, and how many entries it held.
 */
export function redactChange(change: FieldChange): FieldChange {
  let encrypted = false
  try {
    encrypted = getField(change.fieldKey).encrypted === true
  } catch {
    // Unknown field keys are never written (the service rejects them first).
  }
  if (!encrypted) return change
  const mark = (v: unknown) =>
    v === null || v === undefined
      ? null
      : { redacted: REDACTED, items: Array.isArray(v) ? v.length : 1 }
  return { ...change, before: mark(change.before), after: mark(change.after) }
}
