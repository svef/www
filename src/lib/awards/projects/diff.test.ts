import { describe, expect, it } from 'vitest'
import { diffAnswers, redactChange, REDACTED, sameValue } from './diff'
import { decryptCredential, encryptCredential } from './crypto'

describe('sameValue', () => {
  it('ignores key order and undefined members, treats null and undefined alike', () => {
    expect(sameValue({ a: 1, b: 2 }, { b: 2, a: 1, c: undefined })).toBe(true)
    expect(sameValue(undefined, null)).toBe(true)
    expect(sameValue(['a'], ['a', 'b'])).toBe(false)
  })
})

describe('diffAnswers', () => {
  it('reports only changed keys among the ones asked about, with before and after', () => {
    const changes = diffAnswers(
      ['title', 'description', 'links'],
      { title: 'Old', description: 'Same', links: ['https://a.is'] },
      { title: 'New', description: 'Same' },
    )
    expect(changes).toEqual([
      { fieldKey: 'title', before: 'Old', after: 'New' },
      { fieldKey: 'links', before: ['https://a.is'], after: null },
    ])
  })

  it('does not look at keys it was not asked about', () => {
    expect(diffAnswers(['title'], { title: 'a', other: 1 }, { title: 'a', other: 2 })).toEqual([])
  })
})

describe('redactChange', () => {
  it('leaves ordinary fields alone', () => {
    const c = { fieldKey: 'title', before: 'a', after: 'b' }
    expect(redactChange(c)).toEqual(c)
  })

  it('never lets login details through, but keeps what happened', () => {
    const secret = 'hunter2'
    const r = redactChange({
      fieldKey: 'loginInformation',
      before: null,
      after: [{ value: secret, notes: secret }, { value: secret }],
    })
    expect(r.before).toBeNull()
    expect(r.after).toEqual({ redacted: REDACTED, items: 2 })
    expect(JSON.stringify(r)).not.toContain(secret)
  })
})

describe('credential encryption', () => {
  it('round-trips, and does not store the plaintext', () => {
    const blob = encryptCredential('user: demo / pass: s3cret')
    expect(blob.toString('utf8')).not.toContain('s3cret')
    expect(decryptCredential(blob)).toBe('user: demo / pass: s3cret')
  })

  it('uses a fresh IV each time and rejects tampering', () => {
    const a = encryptCredential('x')
    const b = encryptCredential('x')
    expect(a.equals(b)).toBe(false)
    a[a.length - 1] ^= 1
    expect(() => decryptCredential(a)).toThrow()
  })
})
