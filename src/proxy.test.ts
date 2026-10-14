import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * The routing contract, in both states of `LANDING_ONLY`.
 *
 * The flag is a compile-time constant, so a built app can only ever exercise
 * the state it was built with — which is why this mocks the module rather than
 * leaving it to `npm run e2e`. The branch that is *not* live is precisely the
 * one with no other safety net: `main` proves the landing path works every time
 * someone visits production today, and that stops at the cutover, after which
 * the flag lives on as a way to put the site behind one page (svef/www#35,
 * svef/www#118).
 */

const siteMode = vi.hoisted(() => ({ LANDING_ONLY: true }))
vi.mock('@/lib/site-mode', () => siteMode)

const { proxy } = await import('./proxy')

/** What the proxy decided, in the terms the proxy thinks in. */
function run(path: string) {
  const res = proxy(new NextRequest(new URL(`https://www.svef.is${path}`)))
  const location = res.headers.get('location')
  const rewrite = res.headers.get('x-middleware-rewrite')
  return {
    redirectedTo: location ? new URL(location).pathname : null,
    rewrittenTo: rewrite ? new URL(rewrite).pathname : null,
    passedThrough: !location && !rewrite,
  }
}

describe('proxy, with LANDING_ONLY on', () => {
  beforeEach(() => {
    siteMode.LANDING_ONLY = true
  })

  it('sends the root to Icelandic', () => {
    // Neither usual signal is trustworthy here, so the default is explicit.
    expect(run('/').redirectedTo).toBe('/is')
  })

  it('serves the landing page from an internal path, without changing the URL', () => {
    expect(run('/is').rewrittenTo).toBe('/landing/is')
    expect(run('/en').rewrittenTo).toBe('/landing/en')
    // A rewrite, never a redirect: /landing/* must not become a public URL.
    expect(run('/is').redirectedTo).toBeNull()
  })

  it('lets the allowlisted pages through, in both locales', () => {
    // These live where they will live after the cutover; the list is what
    // decides which pages stay reachable while the flag is on.
    for (const path of ['/is/abendingar', '/is/erindi', '/en/abendingar', '/en/erindi']) {
      expect(run(path).passedThrough, path).toBe(true)
    }
  })

  it('folds every other page back to the locale root', () => {
    // This is what keeps the half-finished site sealed in production.
    for (const path of ['/is/vidburdir', '/is/um-svef', '/is/frettir', '/is/skraning']) {
      expect(run(path).redirectedTo, path).toBe('/is')
    }
    expect(run('/en/about').redirectedTo).toBe('/en')
  })

  it('does not leak a page through a deeper path under an allowlisted name', () => {
    // The allowlist matches the whole path, not just the segment, so a nested
    // route cannot ride in on a permitted prefix.
    expect(run('/is/abendingar/eitthvad').redirectedTo).toBe('/is')
  })
})

describe('proxy, with LANDING_ONLY off', () => {
  beforeEach(() => {
    siteMode.LANDING_ONLY = false
  })

  it('still sends the root to Icelandic', () => {
    expect(run('/').redirectedTo).toBe('/is')
  })

  it('serves a real page', () => {
    expect(run('/is/vidburdir').passedThrough).toBe(true)
  })

  it('rewrites an English page name onto its directory, keeping the URL', () => {
    // /en/events is the public name; /en/vidburdir is where it lives on disk.
    expect(run('/en/events').rewrittenTo).toBe('/en/vidburdir')
    expect(run('/en/events').redirectedTo).toBeNull()
  })

  it('redirects a page asked for by the other language’s name', () => {
    // A real page under the wrong name, rather than the same page at two URLs.
    expect(run('/en/vidburdir').redirectedTo).toBe('/en/events')
    expect(run('/is/events').redirectedTo).toBe('/is/vidburdir')
  })

  it('leaves an unknown page alone so it can 404 honestly', () => {
    // Redirecting these to the front page tells a visitor their link worked
    // when it did not.
    expect(run('/is/ekkert-her').passedThrough).toBe(true)
  })
})

describe('proxy, regardless of the flag', () => {
  for (const landingOnly of [true, false]) {
    it(`keeps the path and adds a locale when one is missing (LANDING_ONLY=${landingOnly})`, () => {
      siteMode.LANDING_ONLY = landingOnly
      // An old link or a hand-typed address lands on the page it names rather
      // than being thrown away at the front door.
      expect(run('/vidburdir/eitthvad').redirectedTo).toBe('/is/vidburdir/eitthvad')
    })
  }
})
