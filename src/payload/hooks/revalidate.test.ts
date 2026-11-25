import { beforeEach, describe, expect, it, vi } from 'vitest'

const revalidatePath = vi.fn()
vi.mock('next/cache', () => ({
  revalidatePath: (path: string, type?: string) => revalidatePath(path, type),
}))

const { revalidateCollection, revalidateGlobal, REVALIDATE_HOOK, SKIP_REVALIDATE } =
  await import('./revalidate')
const { REVALIDATE, NOT_PUBLIC } = await import('./paths')
const config = await (await import('@payload-config')).default

type Slug = keyof typeof REVALIDATE
type AnyHook = ((args: Record<string, unknown>) => unknown) & { [REVALIDATE_HOOK]?: Slug }

const calls = () => revalidatePath.mock.calls.map(([path, type]) => ({ path, type }))
const expected = (slug: Slug) =>
  REVALIDATE[slug].map((t: { path: string; type?: string }) => ({
    path: t.path,
    type: t.type,
  }))

/**
 * The hooks' own behaviour, with `revalidatePath` stubbed. What Next does with a
 * path is Next's business; what this tests is the part we wrote — that every
 * collection and global that feeds a page is wired up and flushes what the map
 * says. (That a failure cannot cost an editor a save is in its own file.)
 */
describe('revalidation hooks', () => {
  beforeEach(() => revalidatePath.mockReset())

  it('flushes exactly what the map lists for a collection, on change and on delete', () => {
    const { afterChange, afterDelete } = revalidateCollection('news')
    ;(afterChange[0] as unknown as AnyHook)({ doc: { id: 1 } })
    expect(calls()).toEqual(expected('news'))

    revalidatePath.mockReset()
    ;(afterDelete[0] as unknown as AnyHook)({ doc: { id: 1 } })
    expect(calls()).toEqual(expected('news'))
  })

  it('returns the document unchanged, as Payload expects', () => {
    const doc = { id: 7 }
    const { afterChange } = revalidateGlobal('home-page')
    expect((afterChange[0] as unknown as AnyHook)({ doc })).toBe(doc)
  })

  it('does nothing when the write asks it not to (seed:dev runs outside Next)', () => {
    const { afterChange } = revalidateCollection('events')
    ;(afterChange[0] as unknown as AnyHook)({
      doc: {},
      context: { [SKIP_REVALIDATE]: true },
    })
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})

describe('every collection and global is accounted for', () => {
  beforeEach(() => revalidatePath.mockReset())

  const entities = [
    ...config.collections.map((c) => ({
      slug: c.slug,
      kind: 'collection',
      afterChange: c.hooks?.afterChange,
      afterDelete: c.hooks?.afterDelete,
    })),
    ...config.globals.map((g) => ({
      slug: g.slug,
      kind: 'global',
      afterChange: g.hooks?.afterChange,
      afterDelete: undefined,
    })),
    // Payload's own internal collections (preferences, migrations, locked documents).
  ].filter((e) => !e.slug.startsWith('payload-'))

  /** This module's hooks only — plugins add their own (the storage plugin's on `media`). */
  const ours = (hooks: unknown[] | undefined) =>
    ((hooks ?? []) as AnyHook[]).filter((hook) => REVALIDATE_HOOK in hook)

  it('each one is either revalidated or listed as feeding no page', () => {
    // A new collection has to be put in one table or the other. Left out of
    // both, its saves would sit stale for the interval and nobody would know.
    const unaccounted = entities
      .map((e) => e.slug)
      .filter((slug) => !(slug in REVALIDATE) && !(NOT_PUBLIC as string[]).includes(slug))
    expect(unaccounted).toEqual([])
  })

  it('nothing listed as feeding no page revalidates anyway', () => {
    for (const entity of entities.filter((e) =>
      (NOT_PUBLIC as string[]).includes(e.slug),
    )) {
      expect(ours(entity.afterChange), entity.slug).toEqual([])
    }
  })

  for (const entity of entities.filter((e) => e.slug in REVALIDATE)) {
    const slug = entity.slug as Slug

    it(`${entity.kind} ${slug} flushes its own pages on save`, () => {
      const hooks = ours(entity.afterChange)
      expect(hooks.map((hook) => hook[REVALIDATE_HOOK])).toEqual([slug])
      for (const hook of hooks) hook({ doc: {}, context: {} })
      expect(calls()).toEqual(expected(slug))
    })

    if (entity.kind === 'collection') {
      it(`collection ${slug} flushes its own pages on delete`, () => {
        const hooks = ours(entity.afterDelete)
        expect(hooks.map((hook) => hook[REVALIDATE_HOOK])).toEqual([slug])
        for (const hook of hooks) hook({ doc: {}, context: {} })
        expect(calls()).toEqual(expected(slug))
      })
    }
  }
})
