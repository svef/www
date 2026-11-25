import { afterEach, describe, expect, it, vi } from 'vitest'
import robots from './robots'

afterEach(() => vi.unstubAllEnvs())

function disallowed(): string[] {
  const { rules } = robots()
  const rule = Array.isArray(rules) ? rules[0] : rules
  return ([] as string[]).concat(rule.disallow ?? [])
}

describe('robots.txt', () => {
  it("keeps Payload's admin and API out", () => {
    expect(disallowed()).toEqual(expect.arrayContaining(['/admin', '/api']))
  })

  it('disallows the signed-in portal and the admin in both languages', () => {
    expect(disallowed()).toEqual(
      expect.arrayContaining([
        '/is/minar-sidur',
        '/en/my-pages',
        '/is/stjornbord',
        '/en/admin',
      ]),
    )
  })

  it('leaves public pages and the account flows crawlable, so their noindex can be read', () => {
    const blocked = disallowed()
    for (const path of [
      '/is',
      '/en',
      '/is/innsendingar',
      '/en/submissions',
      '/is/innskraning',
      '/en/sign-in',
      '/is/nyskraning',
    ]) {
      expect(
        blocked.some((prefix) => path.startsWith(prefix)),
        path,
      ).toBe(false)
    }
  })

  it('advertises the sitemap on the site URL', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://svef.is')
    expect(robots().sitemap).toBe('https://svef.is/sitemap.xml')
  })
})
