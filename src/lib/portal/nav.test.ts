import { describe, expect, it } from 'vitest'
import { buildPortalNav, currentNavItem, initialsOf } from './nav'

describe('buildPortalNav', () => {
  it('shows the awards to everyone and the admin only to admins', () => {
    expect(buildPortalNav('is', false).map((g) => g.id)).toEqual(['awards'])
    expect(buildPortalNav('is', true).map((g) => g.id)).toEqual(['awards', 'admin'])
  })

  it('links in the reader’s language', () => {
    const [awards, admin] = buildPortalNav('en', true)
    expect(awards.items.map((i) => i.href)).toEqual(['/en/my-pages', '/en/my-pages/projects', '/en/my-pages/projects/new'])
    expect(admin.items.map((i) => i.href)).toEqual([
      '/en/admin',
      '/en/admin/projects',
      '/en/admin/requests',
      '/en/admin/users',
      '/en/admin/tools',
    ])
    expect(buildPortalNav('is', false)[0].items.map((i) => i.label)).toEqual(['Yfirlit', 'Verkefnin mín', 'Nýtt verkefni'])
  })
})

describe('currentNavItem', () => {
  const groups = buildPortalNav('is', true)
  const id = '0198c7a0-1111-7222-8333-444455556666'

  it('marks the page the reader is on', () => {
    expect(currentNavItem(groups, '/is/minar-sidur', 'is')).toEqual({ href: '/is/minar-sidur', kind: 'page' })
    expect(currentNavItem(groups, '/is/minar-sidur/verkefni/nytt', 'is')).toEqual({
      href: '/is/minar-sidur/verkefni/nytt',
      kind: 'page',
    })
    expect(currentNavItem(groups, '/is/stjornbord/notendur?q=anna&page=2', 'is')).toEqual({
      href: '/is/stjornbord/notendur',
      kind: 'page',
    })
  })

  it('marks the section of a page that is not in the nav, deepest first', () => {
    expect(currentNavItem(groups, `/is/minar-sidur/verkefni/${id}`, 'is')).toEqual({
      href: '/is/minar-sidur/verkefni',
      kind: 'section',
    })
    expect(currentNavItem(groups, `/is/stjornbord/verkefni/${id}`, 'is')).toEqual({
      href: '/is/stjornbord/verkefni',
      kind: 'section',
    })
  })

  it('does not let an overview claim every page under it', () => {
    expect(currentNavItem(groups, '/is/minar-sidur/adgangur', 'is')).toBeNull()
    expect(currentNavItem(groups, '/is/minar-sidur/bod/abc', 'is')).toBeNull()
  })

  it('reads the English path, or the internal one, the same way', () => {
    const en = buildPortalNav('en', true)
    expect(currentNavItem(en, '/en/admin/users', 'en')).toEqual({ href: '/en/admin/users', kind: 'page' })
    // A hard load reports the rewritten (internal) path.
    expect(currentNavItem(en, '/en/stjornbord/notendur', 'en')).toEqual({ href: '/en/admin/users', kind: 'page' })
    expect(currentNavItem(en, '/en/my-pages/projects/', 'en')).toEqual({ href: '/en/my-pages/projects', kind: 'page' })
  })
})

describe('initialsOf', () => {
  it('takes the first and last name', () => {
    expect(initialsOf('Anna Sigríður Jónsdóttir', 'a@example.is')).toBe('AJ')
    expect(initialsOf('  þórir ', 't@example.is')).toBe('Þ')
    expect(initialsOf('', 'gudrun@example.is')).toBe('G')
  })
})
