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

  it('rewrites a nested English name, keeping an id as it is', async () => {
    expect((await run('/en/submissions/mine', false)).rewrite).toBe(
      'http://localhost/en/innsendingar/minar',
    )
    expect((await run('/en/submissions/abc-123', false)).rewrite).toBe(
      'http://localhost/en/innsendingar/abc-123',
    )
  })

  it('rewrites a third level: the staff entry view keeps its id', async () => {
    const id = '0198c7a0-1111-7222-8333-444455556666'
    expect((await run(`/en/submissions/staff/${id}`, false)).rewrite).toBe(
      `http://localhost/en/innsendingar/starfsfolk/${id}`,
    )
    const back = await run(`/en/innsendingar/starfsfolk/${id}`, false)
    expect(new URL(back.location!).pathname).toBe(`/en/submissions/staff/${id}`)
  })

  it('redirects the other language’s names to the right ones', async () => {
    const r = await run('/en/innsendingar/minar', false)
    expect(r.status).toBe(307)
    expect(new URL(r.location!).pathname).toBe('/en/submissions/mine')
    const back = await run('/is/submissions/mine', false)
    expect(new URL(back.location!).pathname).toBe('/is/innsendingar/minar')
  })

  it('serves the Icelandic form directly', async () => {
    expect((await run('/is/innsendingar/minar', false)).next).toBe(true)
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
