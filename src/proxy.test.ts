// @vitest-environment node
import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * The proxy's routing by page name, with the site mode pinned each way. The
 * mode is a compile-time constant, so each case loads a fresh copy of the module.
 */
async function run(path: string, landingOnly: boolean) {
  vi.resetModules()
  vi.doMock('@/lib/site-mode', () => ({ LANDING_ONLY: landingOnly }))
  const { proxy } = await import('./proxy')
  const res = proxy(new NextRequest(`http://localhost${path}`))
  return {
    status: res.status,
    location: res.headers.get('location'),
    rewrite: res.headers.get('x-middleware-rewrite'),
    next: res.headers.get('x-middleware-next') === '1',
  }
}

afterEach(() => vi.doUnmock('@/lib/site-mode'))

describe('proxy: full site', () => {
  it('rewrites the English page name onto its directory', async () => {
    const r = await run('/en/submissions', false)
    expect(r.rewrite).toBe('http://localhost/en/innsendingar')
  })

  it('rewrites nested English names, keeping an id as it is', async () => {
    const id = '0198c7a0-1111-7222-8333-444455556666'
    expect((await run('/en/my-pages', false)).rewrite).toBe('http://localhost/en/minar-sidur')
    expect((await run('/en/my-pages/projects/new', false)).rewrite).toBe(
      'http://localhost/en/minar-sidur/verkefni/nytt',
    )
    expect((await run(`/en/admin/projects/${id}`, false)).rewrite).toBe(
      `http://localhost/en/stjornbord/verkefni/${id}`,
    )
    const back = await run(`/en/stjornbord/verkefni/${id}`, false)
    expect(new URL(back.location!).pathname).toBe(`/en/admin/projects/${id}`)
  })

  it('redirects the other language’s names to the right ones', async () => {
    const r = await run('/en/minar-sidur/adgangur', false)
    expect(r.status).toBe(307)
    expect(new URL(r.location!).pathname).toBe('/en/my-pages/account')
    const back = await run('/is/my-pages/account', false)
    expect(new URL(back.location!).pathname).toBe('/is/minar-sidur/adgangur')
  })

  it('serves the Icelandic form directly', async () => {
    expect((await run('/is/minar-sidur', false)).next).toBe(true)
    expect((await run('/is/stjornbord/notendur', false)).next).toBe(true)
  })

  it('sends the old signed-in addresses to the portal and the admin, permanently', async () => {
    const id = '0198c7a0-1111-7222-8333-444455556666'
    const cases: [string, string][] = [
      ['/is/innsendingar/minar', '/is/minar-sidur'],
      ['/en/submissions/mine', '/en/my-pages'],
      ['/en/innsendingar/minar', '/en/my-pages'],
      ['/is/innsendingar/ny', '/is/minar-sidur/verkefni/nytt'],
      ['/en/submissions/new', '/en/my-pages/projects/new'],
      [`/is/innsendingar/${id}`, `/is/minar-sidur/verkefni/${id}`],
      [`/en/submissions/${id}`, `/en/my-pages/projects/${id}`],
      ['/is/innsendingar/bod/tok_1', '/is/minar-sidur/bod/tok_1'],
      ['/en/submissions/invite/tok_1', '/en/my-pages/invite/tok_1'],
      ['/is/innsendingar/starfsfolk', '/is/stjornbord/verkefni'],
      ['/en/submissions/staff', '/en/admin/projects'],
      [`/is/innsendingar/starfsfolk/${id}`, `/is/stjornbord/verkefni/${id}`],
      [`/en/submissions/staff/${id}`, `/en/admin/projects/${id}`],
    ]
    for (const [from, to] of cases) {
      const r = await run(from, false)
      expect(r.status, from).toBe(308)
      expect(new URL(r.location!).pathname, from).toBe(to)
    }
  })

  it('keeps the query string and leaves the public page alone', async () => {
    const r = await run('/is/innsendingar/starfsfolk?status=all&page=2', false)
    expect(r.status).toBe(308)
    const url = new URL(r.location!)
    expect(url.pathname + url.search).toBe('/is/stjornbord/verkefni?status=all&page=2')
    expect((await run('/is/innsendingar', false)).next).toBe(true)
    expect((await run('/en/submissions', false)).rewrite).toBe('http://localhost/en/innsendingar')
  })
})

describe('proxy: landing mode', () => {
  it('lets the submissions page through in both languages', async () => {
    expect((await run('/is/innsendingar', true)).next).toBe(true)
    expect((await run('/en/submissions', true)).rewrite).toBe('http://localhost/en/innsendingar')
    const wrong = await run('/en/innsendingar', true)
    expect(new URL(wrong.location!).pathname).toBe('/en/submissions')
  })

  it('still sends every other page to the landing page', async () => {
    const r = await run('/en/events', true)
    expect(new URL(r.location!).pathname).toBe('/en')
    expect((await run('/is/abendingar', true)).next).toBe(true)
  })

  it('does not let sub-pages through yet', async () => {
    const r = await run('/is/innsendingar/minar', true)
    expect(new URL(r.location!).pathname).toBe('/is')
  })
})
