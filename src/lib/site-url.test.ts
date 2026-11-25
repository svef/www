import { describe, it, expect, afterEach } from 'vitest'
import { getSiteUrl, getTrustedOrigins } from './site-url'

const saved = { ...process.env }
afterEach(() => {
  process.env = { ...saved }
})

describe('getSiteUrl', () => {
  it('prefers an explicit site URL', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://svef.is'
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'www.svef.is'
    expect(getSiteUrl()).toBe('https://svef.is')
  })

  it('trims a trailing slash so metadataBase joins cleanly', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://svef.is/'
    expect(getSiteUrl()).toBe('https://svef.is')
  })

  // The case that put localhost canonicals into production: the explicit value
  // is unreadable at build time, so the Vercel-provided domain has to cover it.
  it('falls back to the Vercel production domain when the explicit value is absent', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'www.svef.is'
    expect(getSiteUrl()).toBe('https://www.svef.is')
  })

  it('treats an empty explicit value as absent', () => {
    process.env.NEXT_PUBLIC_SITE_URL = ''
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'www.svef.is'
    expect(getSiteUrl()).toBe('https://www.svef.is')
  })

  it('falls back to localhost off Vercel', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL
    expect(getSiteUrl()).toBe('http://localhost:3000')
  })
})

describe('getTrustedOrigins', () => {
  it('is empty off Vercel, so a local server on any port is not locked out', () => {
    delete process.env.VERCEL
    process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000'
    expect(getTrustedOrigins()).toEqual([])
  })

  it('on a preview, lets in the site’s domains and the deployment’s own URLs', () => {
    process.env.VERCEL = '1'
    delete process.env.NEXT_PUBLIC_SITE_URL // Sensitive: unreadable at build
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'svef.is'
    process.env.VERCEL_URL = 'www-abc123.vercel.app'
    process.env.VERCEL_BRANCH_URL = 'www-git-dev-team.vercel.app'
    expect(getTrustedOrigins()).toEqual([
      'https://svef.is',
      'https://www.svef.is',
      'https://dev.svef.is',
      'https://www-abc123.vercel.app',
      'https://www-git-dev-team.vercel.app',
    ])
  })

  it('never contains localhost on Vercel, and puts an explicit site URL first', () => {
    process.env.VERCEL = '1'
    process.env.NEXT_PUBLIC_SITE_URL = 'https://svef.is/'
    delete process.env.VERCEL_URL
    delete process.env.VERCEL_BRANCH_URL
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL
    const origins = getTrustedOrigins()
    expect(origins[0]).toBe('https://svef.is')
    expect(origins).toContain('https://dev.svef.is')
    expect(origins.some((o) => o.includes('localhost'))).toBe(false)
  })
})
