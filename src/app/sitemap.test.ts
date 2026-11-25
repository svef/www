import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Locale } from '@/lib/i18n'

// The documents come from Payload; what is under test is which pages are listed and how.
vi.mock('@/lib/content/events', () => ({
  listEventSlugs: async (locale: Locale) => (locale === 'is' ? ['vidburdur'] : ['event']),
}))
vi.mock('@/lib/content/news', () => ({
  listNewsSlugs: async (locale: Locale) => (locale === 'is' ? ['frett'] : ['story']),
}))

const { default: sitemap } = await import('./sitemap')

const BASE = 'https://svef.is'
beforeEach(() => vi.stubEnv('NEXT_PUBLIC_SITE_URL', BASE))
afterEach(() => vi.unstubAllEnvs())

async function paths(): Promise<string[]> {
  return (await sitemap()).map((entry) => entry.url.replace(BASE, ''))
}

describe('sitemap.xml', () => {
  it('lists the public pages in both languages, under their names in each', async () => {
    expect(await paths()).toEqual(
      expect.arrayContaining([
        '/is',
        '/en',
        '/is/vidburdir',
        '/en/events',
        '/is/frettir',
        '/en/news',
        '/is/innsendingar',
        '/en/submissions',
        '/is/abendingar',
        '/en/abendingar',
        '/is/erindi',
        '/en/erindi',
      ]),
    )
  })

  it('lists each document under its own slug in each language', async () => {
    expect(await paths()).toEqual(
      expect.arrayContaining([
        '/is/vidburdir/vidburdur',
        '/en/events/event',
        '/is/frettir/frett',
        '/en/news/story',
      ]),
    )
  })

  it('leaves out the portal, the admin and the account flows', async () => {
    const listed = await paths()
    for (const prefix of [
      '/is/minar-sidur',
      '/en/my-pages',
      '/is/stjornbord',
      '/en/admin',
      '/is/innskraning',
      '/en/sign-in',
      '/is/nyskraning',
      '/en/sign-up',
      '/is/gleymt-lykilord',
      '/en/forgot-password',
      '/is/endurstilla-lykilord',
      '/en/reset-password',
      '/is/stadfesta-netfang',
      '/en/verify-email',
    ]) {
      expect(
        listed.filter((p) => p.startsWith(prefix)),
        prefix,
      ).toEqual([])
    }
  })

  it('leaves out pages that are switched off', async () => {
    const listed = await paths()
    expect(
      listed.some((p) => /\/(vefverdlaunin|web-awards|skraning|membership)$/.test(p)),
    ).toBe(false)
  })

  it('never names an English page by its Icelandic directory', async () => {
    expect(
      (await paths()).filter(
        (p) => p.startsWith('/en/vidburdir') || p.startsWith('/en/frettir'),
      ),
    ).toEqual([])
  })

  it('pairs every entry with the same page in the other language', async () => {
    const entries = await sitemap()
    const events = entries.find((e) => e.url === `${BASE}/en/events`)
    expect(events?.alternates?.languages).toEqual({
      is: `${BASE}/is/vidburdir`,
      en: `${BASE}/en/events`,
    })
    const story = entries.find((e) => e.url === `${BASE}/is/frettir/frett`)
    expect(story?.alternates?.languages).toEqual({
      is: `${BASE}/is/frettir/frett`,
      en: `${BASE}/en/news/story`,
    })
  })

  it('lists no URL twice', async () => {
    const listed = await paths()
    expect(new Set(listed).size).toBe(listed.length)
  })
})
