import { describe, expect, it } from 'vitest'
import { isOwnKey, ownValue } from './own-key'

describe('ownValue', () => {
  const copy = { self: 'Not yourself', not_found: 'Not found' }

  it('finds the record’s own keys', () => {
    expect(ownValue(copy, 'self')).toBe('Not yourself')
  })

  it('finds nothing for unknown, missing or inherited keys', () => {
    for (const key of ['nope', '', null, undefined, '__proto__', 'constructor', 'toString', 'hasOwnProperty'])
      expect(ownValue(copy, key), String(key)).toBeUndefined()
  })
})

describe('isOwnKey', () => {
  it('accepts own keys only', () => {
    const reasons = { not_allowed: 'x' }
    expect(isOwnKey(reasons, 'not_allowed')).toBe(true)
    expect(isOwnKey(reasons, '__proto__')).toBe(false)
    expect(isOwnKey(reasons, 'valueOf')).toBe(false)
    expect(isOwnKey(reasons, undefined)).toBe(false)
  })
})
