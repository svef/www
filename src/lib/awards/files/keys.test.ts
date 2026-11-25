import { describe, expect, it } from 'vitest'
import { cleanFileName, extensionFor, newObjectKey } from './keys'

describe('object keys', () => {
  it('builds awards/<year>/<project>/<uuid>.<ext>', () => {
    expect(
      newObjectKey({ editionYear: 2026, projectId: 'p1', contentType: 'image/png', uuid: 'u1' }),
    ).toBe('awards/2026/p1/u1.png')
    expect(
      newObjectKey({ editionYear: 2026, projectId: 'p1', contentType: 'image/jpeg', uuid: 'u2' }),
    ).toBe('awards/2026/p1/u2.jpg')
  })

  it('is random per call and never carries the file name', () => {
    const a = newObjectKey({ editionYear: 2026, projectId: 'p', contentType: 'image/png' })
    const b = newObjectKey({ editionYear: 2026, projectId: 'p', contentType: 'image/png' })
    expect(a).not.toBe(b)
    expect(a).toMatch(/^awards\/2026\/p\/[0-9a-f-]{36}\.png$/)
  })

  it('refuses a type it has no extension for', () => {
    expect(extensionFor('image/gif')).toBeNull()
    // Not an inherited property either: a crafted content type cannot pass as accepted.
    for (const t of ['__proto__', 'constructor', 'toString']) expect(extensionFor(t)).toBeNull()
    expect(() => newObjectKey({ editionYear: 1, projectId: 'p', contentType: '__proto__' })).toThrow()
    expect(() => newObjectKey({ editionYear: 1, projectId: 'p', contentType: 'image/gif' })).toThrow()
  })

  it('cleans file names', () => {
    expect(cleanFileName('C:\\fakepath\\my logo.png')).toBe('my logo.png')
    expect(cleanFileName('../../etc/passwd')).toBe('passwd')
    expect(cleanFileName('a\u0000b\n.png')).toBe('ab.png')
    expect(cleanFileName('   ')).toBe('image')
    expect(cleanFileName('x'.repeat(300))).toHaveLength(200)
  })
})
