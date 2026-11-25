import { describe, expect, it } from 'vitest'
import { dashboardPath, hasAdminRole, hasSuperAdminRole, safeNext, signInPath } from './roles'

describe('hasAdminRole', () => {
  it('is true only when admin is held', () => {
    expect(hasAdminRole(['admin'])).toBe(true)
    expect(hasAdminRole(['other', 'admin'])).toBe(true)
    expect(hasAdminRole([])).toBe(false)
    expect(hasAdminRole(['other'])).toBe(false)
  })

  it('does not treat the retired staff value as admin', () => {
    expect(hasAdminRole(['staff'])).toBe(false)
  })

  it('gives a super admin every admin permission', () => {
    expect(hasAdminRole(['superadmin'])).toBe(true)
  })
})

describe('hasSuperAdminRole', () => {
  it('is true only for superadmin, never for admin', () => {
    expect(hasSuperAdminRole(['superadmin'])).toBe(true)
    expect(hasSuperAdminRole(['admin', 'superadmin'])).toBe(true)
    expect(hasSuperAdminRole(['admin'])).toBe(false)
    expect(hasSuperAdminRole([])).toBe(false)
  })
})

describe('safeNext', () => {
  const fallback = '/is/minar-sidur'
  it('keeps site paths', () => {
    expect(safeNext('/en/my-pages/projects?x=1', fallback)).toBe('/en/my-pages/projects?x=1')
  })
  it.each([undefined, null, '', 'https://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)', '/a\nb'])(
    'rejects %j',
    (value) => {
      expect(safeNext(value, fallback)).toBe(fallback)
    },
  )
})

describe('paths', () => {
  it('names the portal and sign-in in the reader language', () => {
    expect(dashboardPath('is')).toBe('/is/minar-sidur')
    expect(dashboardPath('en')).toBe('/en/my-pages')
    expect(signInPath('en')).toBe('/en/sign-in')
    expect(signInPath('is', '/is/x?y=1')).toBe('/is/innskraning?next=%2Fis%2Fx%3Fy%3D1')
  })
})
