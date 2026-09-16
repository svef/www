import { cache } from 'react'
import { getPayload, publicReadArgs } from '@/lib/payload'
import type { Locale } from '@/lib/i18n'
import {
  toNewsArticle,
  toNewsSummary,
  type NewsAllLocales,
  type NewsArticle,
  type NewsSummary,
} from './news-mapping'

/**
 * Reading the `news` collection for the public site.
 *
 * Pages under `app/(app)/[locale]` stay layout and copy; this module owns the
 * Payload read and hands back plain view models. Shaping a document into those
 * view models is a separate concern with no I/O in it, so it lives in
 * `./news-mapping.ts` — see the note there for why that boundary is worth
 * having.
 */

export type { NewsArticle, NewsCover, NewsSummary } from './news-mapping'

/**
 * Fields a `news` read needs, and nothing else.
 *
 * Without this Payload returns the whole document, including the `body` rich
 * text in every locale. The index renders a card grid that never touches
 * `body`, so that is a jsonb column per article per request pulled across the
 * wire and thrown away.
 */
const SUMMARY_FIELDS = {
  slug: true,
  publishedAt: true,
  title: true,
  excerpt: true,
  coverImage: true,
} as const

/**
 * Only articles whose publication date has arrived.
 *
 * `publishedAt` is a date an editor sets, and setting it in the future is how
 * you schedule a post. Without this filter the post is live the moment it is
 * saved and the date reads as a lie. There is no cron here: the comparison is
 * against the time of the request, so a scheduled article appears on the first
 * request after its date passes.
 */
function publishedByNow() {
  return { publishedAt: { less_than_equal: new Date().toISOString() } }
}

/**
 * Every published article, newest first.
 *
 * Unpaginated on purpose: the association publishes a handful of posts a year,
 * and a cut-off list with no paging control would quietly make older articles
 * unreachable. Paging is worth adding the day the archive outgrows one page.
 *
 * Cached per request. The news index is currently the only caller, so today
 * that is one query either way; the cache is what lets a second reader — the
 * home page's latest-news block, a feed route — call this without anyone
 * having to thread the result through, and without it costing another query.
 */
export const listNews = cache(async function listNews(
  locale: Locale,
): Promise<NewsSummary[]> {
  const payload = await getPayload()
  const { docs } = await payload.find({
    collection: 'news',
    ...publicReadArgs,
    where: publishedByNow(),
    select: SUMMARY_FIELDS,
    sort: '-publishedAt',
    pagination: false,
    depth: 1,
  })
  return (docs as unknown as NewsAllLocales[]).map((doc) => toNewsSummary(doc, locale))
})

/**
 * One published article by slug, or `null` when there is no such article.
 *
 * An article dated in the future 404s rather than rendering, so a leaked link
 * to a scheduled post shows nothing before its date.
 *
 * Cached per request, and here that is load-bearing: `generateMetadata` and
 * the page body each resolve the article independently, so without the cache
 * every article view would query Postgres twice for the same document.
 */
export const findNewsArticle = cache(async function findNewsArticle(
  slug: string,
  locale: Locale,
): Promise<NewsArticle | null> {
  const payload = await getPayload()
  const { docs } = await payload.find({
    collection: 'news',
    ...publicReadArgs,
    where: { and: [{ slug: { equals: slug } }, publishedByNow()] },
    limit: 1,
    depth: 1,
  })
  const doc = docs[0] as unknown as NewsAllLocales | undefined
  return doc ? toNewsArticle(doc, locale) : null
})

/**
 * The slugs of every article whose publication date has arrived.
 *
 * Feeds `generateStaticParams` on `/frettir/[slug]`, so it deliberately applies
 * the same `publishedAt <= now` filter as every other read: a scheduled article
 * must not be prerendered into the build output, because a prerendered page is
 * a file that exists whether or not its date has passed. Leaving it out of this
 * list is what keeps it on the `dynamicParams` path, where the filter is
 * re-evaluated against the time of the request and it still 404s.
 *
 * `slug` is not localized, so this is one list for both locales.
 */
export const listNewsSlugs = cache(async function listNewsSlugs(): Promise<string[]> {
  const payload = await getPayload()
  const { docs } = await payload.find({
    collection: 'news',
    ...publicReadArgs,
    where: publishedByNow(),
    select: { slug: true },
    sort: '-publishedAt',
    pagination: false,
    depth: 0,
  })
  return docs.map((doc) => doc.slug).filter((slug): slug is string => Boolean(slug))
})
