import { describe, it, expect, afterEach } from 'vitest'
import { getSiteUrl } from './site-url'

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
