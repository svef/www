/**
 * Looks a key up in a plain record only if the record itself has it. A bare `record[key]`
 * with a key from a query string or a database row also finds what every object inherits:
 * `copy['__proto__']` is `Object.prototype` and `copy['constructor']` is a function, so a
 * crafted `?error=__proto__` would render an object (React throws) or pass an "is it known?"
 * check. Use this wherever the key is not a literal.
 */
export function ownValue<T>(record: Readonly<Record<string, T>>, key: string | null | undefined): T | undefined {
  return key != null && Object.hasOwn(record, key) ? record[key] : undefined
}

/** Narrows `key` to the record's own keys, for the same reason as `ownValue`. */
export function isOwnKey<R extends object>(record: R, key: string | null | undefined): key is Extract<keyof R, string> {
  return key != null && Object.hasOwn(record, key)
}
