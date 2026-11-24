import { describe, expect, it } from 'vitest'
import { dashboardPath, hasStaffRole, safeNext, signInPath } from './roles'

describe('hasStaffRole', () => {
  it('is true only when staff is held', () => {
    expect(hasStaffRole(['staff'])).toBe(true)
    expect(hasStaffRole(['other', 'staff'])).toBe(true)
    expect(hasStaffRole([])).toBe(false)
    expect(hasStaffRole(['other'])).toBe(false)
  })
})

describe('safeNext', () => {
  const fallback = '/is/innsendingar/minar'
  it('keeps site paths', () => {
    expect(safeNext('/en/submissions/mine?x=1', fallback)).toBe('/en/submissions/mine?x=1')
  })
  it.each([undefined, null, '', 'https://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)', '/a\nb'])(
    'rejects %j',
    (value) => {
      expect(safeNext(value, fallback)).toBe(fallback)
    },
  )
})

describe('paths', () => {
  it('names the dashboard and sign-in in the reader language', () => {
    expect(dashboardPath('is')).toBe('/is/innsendingar/minar')
    expect(signInPath('en')).toBe('/en/sign-in')
    expect(signInPath('is', '/is/x?y=1')).toBe('/is/innskraning?next=%2Fis%2Fx%3Fy%3D1')
  })
})
