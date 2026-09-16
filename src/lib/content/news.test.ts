import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listNews, findNewsArticle, listNewsSlugs } from './news'

/**
 * The reading layer, with Payload's Local API stubbed.
 *
 * This file imports `@/lib/payload`, which imports `@payload-config` — resolved
 * by the alias in `vitest.config.ts`. The stub stands in for a database, not
 * for the config: the point is to assert the query this module sends, which is
 * where the scheduling rule and the over-fetch guard live.
 */
const find = vi.fn()
vi.mock('@/lib/payload', async () => {
  const actual = await vi.importActual<typeof import('@/lib/payload')>('@/lib/payload')
  return { ...actual, getPayload: async () => ({ find }) }
})

const doc = {
  id: 1,
  slug: 'ny-stjorn-er-tekin-vid',
  publishedAt: '2026-05-22T12:00:00.000Z',
  title: { is: 'Ný stjórn er tekin við', en: null },
  excerpt: { is: 'Ný stjórn SVEF tók við.', en: null },
  body: { is: null, en: null },
  coverImage: null,
}

beforeEach(() => {
  find.mockReset()
  find.mockResolvedValue({ docs: [doc] })
})

/** The `publishedAt <= now` clause, wherever it sits in the query. */
function publishedAtClause(where: Record<string, unknown>) {
  const clauses = Array.isArray(where.and)
    ? (where.and as Record<string, { less_than_equal?: string }>[])
    : [where as Record<string, { less_than_equal?: string }>]
  return clauses.find((c) => c.publishedAt)?.publishedAt
}

describe('listNews', () => {
  it('reads as an anonymous visitor, in every locale at once', async () => {
    await listNews('is')
    const args = find.mock.calls[0][0]
    expect(args.collection).toBe('news')
    expect(args.locale).toBe('all')
    expect(args.overrideAccess).toBe(false)
    expect(args.sort).toBe('-publishedAt')
  })

  it('asks only for the fields a card renders', async () => {
    // Without `select` every request drags the full `body` rich text, in both
    // locales, across the wire for a grid that never shows it.
    await listNews('is')
    const { select } = find.mock.calls[0][0]
    expect(select).toBeDefined()
    expect(select).not.toHaveProperty('body')
    expect(select).toMatchObject({ title: true, excerpt: true, coverImage: true })
  })

  it('hides articles dated in the future', async () => {
    // `publishedAt` is how an editor schedules a post. Without this an article
    // is live the moment it is saved and its own date contradicts it.
    const before = Date.now()
    await listNews('en')
    const clause = publishedAtClause(find.mock.calls[0][0].where)
    expect(clause?.less_than_equal).toBeDefined()
    const at = Date.parse(clause!.less_than_equal!)
    expect(at).toBeGreaterThanOrEqual(before)
    expect(at).toBeLessThanOrEqual(Date.now())
  })

  it('maps documents into view models for the reading locale', async () => {
    const [article] = await listNews('en')
    expect(article.href).toBe('/en/frettir/ny-stjorn-er-tekin-vid')
    expect(article.contentLocale).toBe('is')
  })
})

describe('findNewsArticle', () => {
  it('matches the slug and the publication date together', async () => {
    await findNewsArticle('ny-stjorn-er-tekin-vid', 'is')
    const { where } = find.mock.calls[0][0]
    expect(where.and).toEqual(
      expect.arrayContaining([{ slug: { equals: 'ny-stjorn-er-tekin-vid' } }]),
    )
    expect(publishedAtClause(where)?.less_than_equal).toBeDefined()
  })

  it('is null when nothing matches, so the route can 404', async () => {
    find.mockResolvedValue({ docs: [] })
    expect(await findNewsArticle('ekki-til', 'is')).toBeNull()
  })
})

describe('listNewsSlugs', () => {
  it('applies the same publication-date filter as every other read', async () => {
    // This feeds `generateStaticParams`, so the filter is doing more work here
    // than elsewhere: a prerendered page is a file written at build time, and a
    // scheduled article listed here would go live when the build ran rather
    // than when its date arrived.
    await listNewsSlugs()
    const { where, collection } = find.mock.calls[0][0]
    expect(collection).toBe('news')
    expect(publishedAtClause(where)?.less_than_equal).toBeDefined()
  })

  it('asks for slugs and nothing else', async () => {
    await listNewsSlugs()
    const { select, depth } = find.mock.calls[0][0]
    expect(select).toEqual({ slug: true })
    expect(depth).toBe(0)
  })

  it('returns plain slugs', async () => {
    expect(await listNewsSlugs()).toEqual(['ny-stjorn-er-tekin-vid'])
  })

  it('drops a document with no slug rather than prerendering /undefined', async () => {
    find.mockResolvedValue({ docs: [doc, { id: 2, slug: null }] })
    expect(await listNewsSlugs()).toEqual(['ny-stjorn-er-tekin-vid'])
  })
})
