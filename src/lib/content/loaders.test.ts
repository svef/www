import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Every Payload read behind the public pages, with the Local API stubbed.
 *
 * The invariants worth pinning are the ones a page cannot see go wrong: each read runs as an
 * anonymous visitor (`overrideAccess: false`), in every locale at once (so a missing
 * translation can be told from a translation), and each collection read is unpaginated
 * (Payload's default `limit` is ten and would silently drop the eleventh row).
 */
const find = vi.fn()
const findGlobal = vi.fn()
vi.mock('@/lib/payload', async () => {
  const actual = await vi.importActual<typeof import('@/lib/payload')>('@/lib/payload')
  return { ...actual, getPayload: async () => ({ find, findGlobal }) }
})

import { listBoardMembers, getAboutContent } from './about'
import { getAwardsIntro, listAwardCategories, getCeremony, getWinnersArchive } from './awards'
import { listGalleries } from './galleries'
import { getHomeSettings } from './home'
import { getMembership } from './membership'

beforeEach(() => {
  find.mockReset().mockResolvedValue({ docs: [] })
  findGlobal.mockReset().mockResolvedValue({})
})

const collectionReads: [string, () => Promise<unknown>][] = [
  ['board-members', () => listBoardMembers('is')],
  ['award-categories', () => listAwardCategories('is')],
  ['award-editions', () => getCeremony('is')],
  ['award-winners', () => getWinnersArchive('is', null)],
  ['galleries', () => listGalleries('is')],
]

const globalReads: [string, () => Promise<unknown>][] = [
  ['about-page', () => getAboutContent('is')],
  ['awards-page', () => getAwardsIntro('is')],
  ['home-page', () => getHomeSettings('is')],
  ['membership-page', () => getMembership('is')],
]

describe.each(collectionReads)('collection read: %s', (collection, run) => {
  it('reads anonymously, in all locales, without pagination', async () => {
    await run()
    const call = find.mock.calls.map((c) => c[0]).find((a) => a.collection === collection)
    expect(call, `no find() for ${collection}`).toBeDefined()
    expect(call.overrideAccess).toBe(false)
    expect(call.locale).toBe('all')
    expect(call.pagination).toBe(false)
  })
})

describe.each(globalReads)('global read: %s', (slug, run) => {
  it('reads anonymously and in all locales', async () => {
    await run()
    const call = findGlobal.mock.calls.map((c) => c[0]).find((a) => a.slug === slug)
    expect(call, `no findGlobal() for ${slug}`).toBeDefined()
    expect(call.overrideAccess).toBe(false)
    expect(call.locale).toBe('all')
  })
})

describe('empty reads', () => {
  it('give empty lists, not errors', async () => {
    expect(await listBoardMembers('en')).toEqual([])
    expect(await listAwardCategories('en')).toEqual([])
    expect(await listGalleries('en')).toEqual([])
    expect(await getCeremony('en')).toBeNull()
    expect(await getWinnersArchive('en', null)).toEqual([])
  })
})
