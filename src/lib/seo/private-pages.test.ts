import { describe, expect, it } from 'vitest'
import {
  ACCOUNT_ROUTES,
  PORTAL_ROUTES,
  isPrivatePage,
  publicPrefixes,
} from './private-pages'

describe('private pages', () => {
  it('writes each page under its name in both languages', () => {
    expect(publicPrefixes(PORTAL_ROUTES)).toEqual([
      '/is/minar-sidur',
      '/en/my-pages',
      '/is/stjornbord',
      '/en/admin',
    ])
    expect(publicPrefixes(ACCOUNT_ROUTES)).toContain('/en/forgot-password')
  })

  it('counts the portal and the account flows, and not the public awards catalogue', () => {
    expect(isPrivatePage('minar-sidur')).toBe(true)
    expect(isPrivatePage('innskraning')).toBe(true)
    expect(isPrivatePage('innsendingar')).toBe(false)
    expect(isPrivatePage('vidburdir')).toBe(false)
  })
})
