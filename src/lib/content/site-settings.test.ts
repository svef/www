import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSiteChrome } from './site-settings'

/**
 * The chrome read, with Payload's Local API stubbed — same arrangement as
 * `news.test.ts`, and for the same reason: what is worth asserting is the shape
 * this hands the footer, not that Postgres works.
 *
 * `getSiteChrome` is wrapped in React's `cache`, which memoizes per request.
 * Outside a request there is no cache scope and each call runs the function, so
 * the tests below get a fresh read every time.
 */
const findGlobal = vi.fn()
vi.mock('@/lib/payload', async () => {
  const actual = await vi.importActual<typeof import('@/lib/payload')>('@/lib/payload')
  return { ...actual, getPayload: async () => ({ findGlobal }) }
})

const settings = {
  id: 1,
  tagline: { is: 'Samtök vefiðnaðarins', en: null },
  footerBlurb: { is: 'SVEF er félag fólks sem starfar við vefinn.', en: null },
  contactEmail: 'svef@svef.is',
  social: { facebook: null, instagram: null, x: null, linkedin: null },
}

beforeEach(() => {
  findGlobal.mockReset()
  findGlobal.mockResolvedValue(settings)
})

describe('getSiteChrome', () => {
  it('reads the global as an anonymous visitor, in every locale at once', async () => {
    await getSiteChrome('is')
    const args = findGlobal.mock.calls[0][0]
    expect(args.slug).toBe('site-settings')
    expect(args.locale).toBe('all')
    expect(args.overrideAccess).toBe(false)
  })

  it('returns the blurb written in the locale that was asked for', async () => {
    expect((await getSiteChrome('is')).footerBlurb).toBe(settings.footerBlurb.is)
  })

  it('reports no blurb rather than falling back to Icelandic', async () => {
    // The chrome is not the page's content: the caller has a real English
    // sentence of its own, which beats Icelandic under an English heading.
    expect((await getSiteChrome('en')).footerBlurb).toBeNull()
  })

  it('treats a field left blank in the admin as unwritten', async () => {
    findGlobal.mockResolvedValue({ ...settings, footerBlurb: { is: '   ', en: null } })
    expect((await getSiteChrome('is')).footerBlurb).toBeNull()
  })

  it('omits every social network while the URLs are unset', async () => {
    expect((await getSiteChrome('is')).socials).toEqual([])
  })

  it('keeps the networks that have a URL, in the design’s order', async () => {
    findGlobal.mockResolvedValue({
      ...settings,
      social: {
        facebook: 'https://www.facebook.com/svef',
        instagram: null,
        x: '',
        linkedin: 'https://www.linkedin.com/company/svef ',
      },
    })
    expect((await getSiteChrome('is')).socials).toEqual([
      { short: 'FB', name: 'Facebook', href: 'https://www.facebook.com/svef' },
      { short: 'LI', name: 'LinkedIn', href: 'https://www.linkedin.com/company/svef' },
    ])
  })

  it('drops anything that is not an absolute URL', async () => {
    // A half-typed profile is the placeholder this replaced, not a link.
    findGlobal.mockResolvedValue({
      ...settings,
      social: { facebook: 'facebook.com/svef', instagram: '#', x: '/x', linkedin: 'javascript:1' },
    })
    expect((await getSiteChrome('is')).socials).toEqual([])
  })

  it('falls back to the association address when the field is empty', async () => {
    findGlobal.mockResolvedValue({ ...settings, contactEmail: '  ' })
    expect((await getSiteChrome('is')).contactEmail).toBe('svef@svef.is')
  })

  it('uses the address an editor set', async () => {
    findGlobal.mockResolvedValue({ ...settings, contactEmail: 'hallo@svef.is' })
    expect((await getSiteChrome('is')).contactEmail).toBe('hallo@svef.is')
  })
})
