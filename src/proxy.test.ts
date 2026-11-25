// @vitest-environment node
import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * The routing contract, in both states of `LANDING_ONLY` (svef/www#118).
 *
 * The flag is a compile-time constant, so a built app can only ever exercise the state it
 * was built with, which is why this mocks the module rather than leaving it to `npm run
 * e2e`. The state that is *not* live is precisely the one with no other safety net: once
 * the flag is off in production nothing exercises the landing path in normal use, and the
 * flag lives on as a way to put the site behind one page (svef/www#35). Each case loads a
 * fresh copy of the proxy with the flag pinned.
 */
async function run(path: string, landingOnly: boolean) {
  vi.resetModules()
  vi.doMock('@/lib/site-mode', () => ({ LANDING_ONLY: landingOnly }))
  const { proxy } = await import('./proxy')
  const res = proxy(new NextRequest(`http://localhost${path}`))
  const location = res.headers.get('location')
  const rewrite = res.headers.get('x-middleware-rewrite')
  return {
    status: res.status,
    location,
    /** Where a redirect sends the reader: path and query. */
    redirectedTo: location ? new URL(location).pathname + new URL(location).search : null,
    /** What a rewrite serves instead, while the address bar keeps the original. */
    rewrittenTo: rewrite ? new URL(rewrite).pathname : null,
    rewrite,
    next: res.headers.get('x-middleware-next') === '1',
  }
}

afterEach(() => vi.doUnmock('@/lib/site-mode'))

const ID = '0198c7a0-1111-7222-8333-444455556666'

describe('proxy, whatever the flag', () => {
  for (const landingOnly of [true, false]) {
    describe(`LANDING_ONLY=${landingOnly}`, () => {
      it('sends the root to Icelandic', async () => {
        // Neither usual signal is trustworthy here, so the default is explicit.
        expect((await run('/', landingOnly)).redirectedTo).toBe('/is')
      })

      it('keeps the path and adds a locale when one is missing', async () => {
        // An old link or a hand-typed address lands on the page it names rather than
        // being thrown away at the front door.
        expect((await run('/vidburdir/eitthvad', landingOnly)).redirectedTo).toBe(
          '/is/vidburdir/eitthvad',
        )
      })

      it('does not serve the landing page’s internal path from outside', async () => {
        // `/landing/<locale>` is only ever reached by the proxy's own rewrite.
        const r = await run('/landing/is', landingOnly)
        expect(r.redirectedTo).toBe('/is/landing/is')
        expect(r.rewrite).toBeNull()
      })
    })
  }
})

describe('proxy, with LANDING_ONLY on', () => {
  it('serves the landing page from an internal path, without changing the URL', async () => {
    for (const locale of ['is', 'en']) {
      const r = await run(`/${locale}`, true)
      expect(r.rewrittenTo).toBe(`/landing/${locale}`)
      // A rewrite, never a redirect: /landing/* must not become a public URL.
      expect(r.location).toBeNull()
    }
  })

  it('lets the allowlisted pages through, in both locales', async () => {
    // These live where they will live after the cutover; the list is what decides which
    // pages stay reachable while the flag is on.
    for (const path of ['/is/abendingar', '/is/erindi', '/en/abendingar', '/en/erindi']) {
      expect((await run(path, true)).next, path).toBe(true)
    }
  })

  it('lets the submissions page through in both languages, by the right name', async () => {
    expect((await run('/is/innsendingar', true)).next).toBe(true)
    expect((await run('/en/submissions', true)).rewrite).toBe(
      'http://localhost/en/innsendingar',
    )
    expect((await run('/en/innsendingar', true)).redirectedTo).toBe('/en/submissions')
  })

  it('folds every other page back to the locale root', async () => {
    // This is what keeps the half-finished site sealed.
    for (const path of ['/is/vidburdir', '/is/um-svef', '/is/frettir', '/is/skraning']) {
      expect((await run(path, true)).redirectedTo, path).toBe('/is')
    }
    expect((await run('/en/about', true)).redirectedTo).toBe('/en')
    expect((await run('/en/events', true)).redirectedTo).toBe('/en')
  })

  it('does not leak a page through a deeper path under an allowlisted name', async () => {
    // The allowlist matches the whole path, not just the first segment, so a nested
    // route cannot ride in on a permitted prefix.
    expect((await run('/is/abendingar/eitthvad', true)).redirectedTo).toBe('/is')
    expect((await run('/is/innsendingar/minar', true)).redirectedTo).toBe('/is')
  })

  it('keeps the signed-in portal and the admin behind the landing page too', async () => {
    // Neither is on today's allowlist, so the old addresses fold back rather than
    // redirecting to pages that would themselves fold back.
    for (const path of [
      '/is/minar-sidur',
      '/en/my-pages',
      '/en/admin',
      '/is/stjornbord',
    ]) {
      expect((await run(path, true)).redirectedTo, path).toBe(path.slice(0, 3))
    }
    expect((await run('/en/submissions/mine', true)).redirectedTo).toBe('/en')
  })
})

describe('proxy, with LANDING_ONLY off', () => {
  it('serves the front pages as they are, not the landing page', async () => {
    for (const path of ['/is', '/en']) {
      const r = await run(path, false)
      expect(r.next, path).toBe(true)
      expect(r.rewrite, path).toBeNull()
    }
  })

  it('serves the Icelandic form directly', async () => {
    expect((await run('/is/vidburdir', false)).next).toBe(true)
    expect((await run('/is/minar-sidur', false)).next).toBe(true)
    expect((await run('/is/stjornbord/notendur', false)).next).toBe(true)
  })

  it('rewrites an English page name onto its directory, keeping the URL', async () => {
    // /en/events is the public name; /en/vidburdir is where it lives on disk.
    const r = await run('/en/events', false)
    expect(r.rewrittenTo).toBe('/en/vidburdir')
    expect(r.location).toBeNull()
    expect((await run('/en/submissions', false)).rewrittenTo).toBe('/en/innsendingar')
  })

  it('rewrites nested English names, keeping an id as it is', async () => {
    expect((await run('/en/my-pages', false)).rewrittenTo).toBe('/en/minar-sidur')
    expect((await run('/en/my-pages/projects/new', false)).rewrittenTo).toBe(
      '/en/minar-sidur/verkefni/nytt',
    )
    expect((await run(`/en/admin/projects/${ID}`, false)).rewrittenTo).toBe(
      `/en/stjornbord/verkefni/${ID}`,
    )
  })

  it('redirects a page asked for by the other language’s name', async () => {
    // A real page under the wrong name, rather than the same page at two URLs. A naming
    // redirect is temporary (307); only the moved portal pages are permanent.
    const cases: [string, string][] = [
      ['/en/vidburdir', '/en/events'],
      ['/is/events', '/is/vidburdir'],
      ['/en/minar-sidur/adgangur', '/en/my-pages/account'],
      ['/is/my-pages/account', '/is/minar-sidur/adgangur'],
      [`/en/stjornbord/verkefni/${ID}`, `/en/admin/projects/${ID}`],
    ]
    for (const [from, to] of cases) {
      const r = await run(from, false)
      expect(r.status, from).toBe(307)
      expect(r.redirectedTo, from).toBe(to)
    }
  })

  it('leaves an unknown page alone so it can 404 honestly', async () => {
    // Redirecting these to the front page tells a visitor their link worked when it did not.
    expect((await run('/is/ekkert-her', false)).next).toBe(true)
    expect((await run('/en/nothing-here', false)).next).toBe(true)
  })

  /**
   * `/en/admin` is the site's admin area (Stjórnborð, `/is/stjornbord`), named in English.
   * Payload's CMS admin is `/admin`, with no locale, and the proxy never sees it (see the
   * matcher below). The two must not be confused in either direction.
   */
  it('treats /en/admin as the site’s admin and /is/admin as its English name', async () => {
    expect((await run('/en/admin', false)).rewrittenTo).toBe('/en/stjornbord')
    const is = await run('/is/admin', false)
    expect(is.status).toBe(307)
    expect(is.redirectedTo).toBe('/is/stjornbord')
  })

  describe('the old signed-in addresses', () => {
    // The awards' signed-in pages moved from /innsendingar to the portal (/minar-sidur) and
    // the admin (/stjornbord). Emails already sent and bookmarks point at the old ones.
    const moved: [string, string][] = [
      ['/is/innsendingar/minar', '/is/minar-sidur'],
      ['/en/submissions/mine', '/en/my-pages'],
      ['/en/innsendingar/minar', '/en/my-pages'],
      ['/is/submissions/mine', '/is/minar-sidur'],
      ['/is/innsendingar/ny', '/is/minar-sidur/verkefni/nytt'],
      ['/en/submissions/new', '/en/my-pages/projects/new'],
      [`/is/innsendingar/${ID}`, `/is/minar-sidur/verkefni/${ID}`],
      [`/en/submissions/${ID}`, `/en/my-pages/projects/${ID}`],
      ['/is/innsendingar/bod/tok_1', '/is/minar-sidur/bod/tok_1'],
      ['/en/submissions/invite/tok_1', '/en/my-pages/invite/tok_1'],
      ['/is/innsendingar/starfsfolk', '/is/stjornbord/verkefni'],
      ['/en/submissions/staff', '/en/admin/projects'],
      [`/is/innsendingar/starfsfolk/${ID}`, `/is/stjornbord/verkefni/${ID}`],
      [`/en/submissions/staff/${ID}`, `/en/admin/projects/${ID}`],
    ]

    it('redirect permanently to the portal and the admin, in both languages', async () => {
      for (const [from, to] of moved) {
        const r = await run(from, false)
        expect(r.status, from).toBe(308)
        expect(r.redirectedTo, from).toBe(to)
      }
    })

    it('redirect the same with a trailing slash', async () => {
      // In a running app Next strips a trailing slash with its own 308 before the proxy
      // runs (checked against a build: `/is/innsendingar/bod/tok_1/` → `…/tok_1`), so this
      // is belt and braces: the proxy gives the same answer either way. NextURL carries the
      // slash onto the new address, and Next drops it there on the next hop.
      for (const [from, to] of moved) {
        const r = await run(`${from}/`, false)
        expect(r.status, `${from}/`).toBe(308)
        expect(r.redirectedTo, `${from}/`).toBe(`${to}/`)
      }
    })

    it('keep the query string, in both languages', async () => {
      expect(
        (await run('/is/innsendingar/starfsfolk?status=all&page=2', false)).redirectedTo,
      ).toBe('/is/stjornbord/verkefni?status=all&page=2')
      expect((await run('/en/submissions/staff/?status=all', false)).redirectedTo).toBe(
        '/en/admin/projects/?status=all',
      )
      expect((await run(`/en/submissions/${ID}?step=2`, false)).redirectedTo).toBe(
        `/en/my-pages/projects/${ID}?step=2`,
      )
    })

    it('leave the public submissions page, and anything never real, alone', async () => {
      expect((await run('/is/innsendingar', false)).next).toBe(true)
      expect((await run('/is/innsendingar/', false)).next).toBe(true)
      // Deeper than any old address: not a moved page, so it 404s rather than guessing.
      const deep = await run('/is/innsendingar/minar/eitthvad', false)
      expect(deep.location).toBeNull()
      // An invitation needs its token.
      expect((await run('/is/innsendingar/bod', false)).location).toBeNull()
    })
  })
})

/**
 * Which paths reach the proxy at all. Next applies the matcher before the proxy runs, so
 * this is read the way Next reads it: anchored, as a regular expression. It is the same in
 * both flag states, which is what keeps Payload's admin and API, and every static file
 * (the Open Graph cards among them), out of the routing above.
 */
describe('proxy matcher', () => {
  it('lets every page through and keeps Payload, Next internals and files out', async () => {
    const { config } = await import('./proxy')
    const matchers = config.matcher.map((m) => new RegExp(`^${m}$`))
    const matched = (path: string) => matchers.some((m) => m.test(path))

    for (const path of [
      '/',
      '/is',
      '/en/events',
      '/en/admin',
      '/en/admin/projects',
      '/is/stjornbord',
    ]) {
      expect(matched(path), path).toBe(true)
    }
    for (const path of [
      '/admin',
      '/admin/collections/users',
      '/api/graphql',
      '/_next/static/chunks/app.js',
      '/_next/image',
      '/favicon.ico',
      '/stickers/cool.svg',
    ]) {
      expect(matched(path), path).toBe(false)
    }
  })
})
