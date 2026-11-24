import { describe, expect, it } from 'vitest'
import { legacyPortalPath } from './legacy'

const id = '0198c7a0-1111-7222-8333-444455556666'

describe('legacyPortalPath', () => {
  it('maps every old signed-in page, in either language', () => {
    expect(legacyPortalPath(['innsendingar', 'minar'])).toBe('/minar-sidur')
    expect(legacyPortalPath(['submissions', 'mine'])).toBe('/minar-sidur')
    expect(legacyPortalPath(['innsendingar', 'ny'])).toBe('/minar-sidur/verkefni/nytt')
    expect(legacyPortalPath(['submissions', 'new'])).toBe('/minar-sidur/verkefni/nytt')
    expect(legacyPortalPath(['innsendingar', id])).toBe(`/minar-sidur/verkefni/${id}`)
    expect(legacyPortalPath(['submissions', id])).toBe(`/minar-sidur/verkefni/${id}`)
    expect(legacyPortalPath(['innsendingar', 'bod', 'tok'])).toBe('/minar-sidur/bod/tok')
    expect(legacyPortalPath(['submissions', 'invite', 'tok'])).toBe('/minar-sidur/bod/tok')
    expect(legacyPortalPath(['innsendingar', 'starfsfolk'])).toBe('/stjornbord/verkefni')
    expect(legacyPortalPath(['submissions', 'staff'])).toBe('/stjornbord/verkefni')
    expect(legacyPortalPath(['innsendingar', 'starfsfolk', id])).toBe(`/stjornbord/verkefni/${id}`)
    expect(legacyPortalPath(['submissions', 'staff', id])).toBe(`/stjornbord/verkefni/${id}`)
  })

  it('leaves the public page and everything else alone', () => {
    expect(legacyPortalPath(['innsendingar'])).toBeNull()
    expect(legacyPortalPath(['submissions'])).toBeNull()
    expect(legacyPortalPath(['innsendingar', ''])).toBeNull()
    expect(legacyPortalPath(['vidburdir', 'minar'])).toBeNull()
    expect(legacyPortalPath(['minar-sidur', 'verkefni'])).toBeNull()
    expect(legacyPortalPath([])).toBeNull()
  })

  it('does not invent pages that never existed', () => {
    expect(legacyPortalPath(['innsendingar', 'minar', 'x'])).toBeNull()
    expect(legacyPortalPath(['innsendingar', 'bod'])).toBeNull()
    expect(legacyPortalPath(['innsendingar', id, 'x'])).toBeNull()
    expect(legacyPortalPath(['innsendingar', 'starfsfolk', id, 'x'])).toBeNull()
  })
})
