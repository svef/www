import { describe, expect, it, vi } from 'vitest'

const revalidatePath = vi.fn()
vi.mock('next/cache', () => ({ revalidatePath: (p: string) => revalidatePath(p) }))

const { revalidateFixed } = await import('./revalidate')
const { boardPaths } = await import('./paths')

/**
 * In its own file because it is the one test that makes `revalidatePath`
 * throw. Left in `revalidate.test.ts` alongside the others, the throwing
 * implementation outlives the assertion and vitest attributes the error to the
 * test rather than to the mock, even though the hook catches it — which is the
 * opposite of what the test is trying to show. One file, one global mock
 * state, no bleed.
 */
describe('a failing revalidation', () => {
  it('is swallowed rather than failing the editor’s save', () => {
    // The document is already written by the time the hook runs. A stale page
    // corrects itself within the five-minute interval; a save that appears to
    // fail makes an editor retype their work.
    revalidatePath.mockImplementation(() => {
      throw new Error('revalidation unavailable')
    })
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})

    let threw = false
    try {
      // @ts-expect-error — the hook only reads `doc`.
      revalidateFixed('board-members', boardPaths)({ doc: { id: 1 } })
    } catch {
      threw = true
    }

    expect(threw).toBe(false)
    // Swallowed, but not silently: every failed path is reported.
    expect(logged).toHaveBeenCalled()
    logged.mockRestore()
  })
})
