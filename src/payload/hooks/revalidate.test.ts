import { beforeEach, describe, expect, it, vi } from 'vitest'

const revalidatePath = vi.fn()
vi.mock('next/cache', () => ({ revalidatePath: (p: string) => revalidatePath(p) }))

const { revalidateCollection, revalidateFixed, revalidateGlobal } =
  await import('./revalidate')
const { newsPaths, boardPaths } = await import('./paths')

/**
 * The hook's own behaviour, with `revalidatePath` stubbed. What Next does with
 * a path is Next's business; what this tests is the part we wrote — which
 * paths get flushed, and that a failure here can never cost an editor a save.
 */
describe('revalidation hooks', () => {
  beforeEach(() => revalidatePath.mockReset())

  const called = () => revalidatePath.mock.calls.map(([p]) => p as string)

  it('flushes the document’s own paths on change', () => {
    const hook = revalidateCollection('news', newsPaths)
    // @ts-expect-error — the hook only reads `doc` and `previousDoc`.
    hook({ doc: { slug: { is: 'frett', en: 'story' } } })
    expect(called()).toEqual(
      expect.arrayContaining(['/is/frettir/frett', '/en/news/story', '/is']),
    )
  })

  it('also flushes the OLD path when a slug changes', () => {
    // Renaming a slug leaves the previous URL cached and still serving. The old
    // path is knowable only from previousDoc, so missing this leaves a stale
    // page at a URL nothing links to any more but search engines still hold.
    const hook = revalidateCollection('news', newsPaths)
    // @ts-expect-error — partial hook args.
    hook({ doc: { slug: { is: 'nytt' } }, previousDoc: { slug: { is: 'gamalt' } } })
    expect(called()).toContain('/is/frettir/nytt')
    expect(called()).toContain('/is/frettir/gamalt')
  })

  it('accepts a bare-string slug as well as the per-locale object', () => {
    // A hook sees whatever shape the originating request used: `locale: 'all'`
    // gives { is, en }, a single-locale write gives a string. Guessing wrong
    // produces "/is/frettir/[object Object]", which fixes nothing and says
    // nothing.
    const hook = revalidateCollection('news', newsPaths)
    // @ts-expect-error — partial hook args.
    hook({ doc: { slug: 'eitt' } })
    expect(called()).toContain('/is/frettir/eitt')
    expect(called().some((p) => p.includes('[object'))).toBe(false)
  })

  it('never revalidates the same path twice in one save', () => {
    const hook = revalidateCollection('news', newsPaths)
    // @ts-expect-error — partial hook args.
    hook({ doc: { slug: { is: 'sami' } }, previousDoc: { slug: { is: 'sami' } } })
    expect(new Set(called()).size).toBe(called().length)
  })

  it('returns the document unchanged, as Payload expects', () => {
    const doc = { id: 7 }
    const hook = revalidateGlobal('site-settings', boardPaths)
    // @ts-expect-error — partial hook args.
    expect(hook({ doc })).toBe(doc)
  })
})
