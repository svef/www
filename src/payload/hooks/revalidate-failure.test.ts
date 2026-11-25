import { describe, expect, it, vi } from 'vitest'

const revalidatePath = vi.fn()
vi.mock('next/cache', () => ({
  revalidatePath: (path: string, type?: string) => revalidatePath(path, type),
}))

const { revalidateCollection } = await import('./revalidate')

/**
 * In its own file because it is the one test that makes `revalidatePath`
 * throw. Left in `revalidate.test.ts` alongside the others, vitest attributes
 * the mock's error to the test even though the hook catches it — which is the
 * opposite of what the test is trying to show. One file, one mock state, no
 * bleed.
 */
describe('a failing revalidation', () => {
  it('is swallowed rather than failing the editor’s save, and reported once', () => {
    // The document is already written by the time the hook runs. A stale page
    // corrects itself within the five-minute interval; a save that appears to
    // fail makes an editor retype their work. This is also what a write from
    // outside a Next request looks like.
    revalidatePath.mockImplementation(() => {
      throw new Error('Invariant: static generation store missing')
    })
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})

    const doc = { id: 3 }
    const hook = revalidateCollection('events').afterChange[0] as unknown as (
      args: Record<string, unknown>,
    ) => unknown

    let result: unknown
    expect(() => {
      result = hook({ doc })
    }).not.toThrow()
    expect(result).toBe(doc)
    // Swallowed, but not silently — and once, not once per path.
    expect(logged).toHaveBeenCalledTimes(1)
    logged.mockRestore()
  })
})
