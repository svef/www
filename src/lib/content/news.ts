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
 * Pages under `app/(app)/[locale]` stay layout and copy; a content module owns
 * the Payload read and hands back plain view models. The mapping itself lives
 * in `./news-mapping.ts` so it can be tested without a database.
 */

export type { NewsArticle, NewsCover, NewsSummary } from './news-mapping'

/**
 * Every article, newest first.
 *
 * Unpaginated on purpose: the association publishes a handful of posts a year,
 * and a cut-off list with no paging control would quietly make older articles
 * unreachable. Paging is worth adding the day the archive outgrows one page.
 */
export async function listNews(locale: Locale): Promise<NewsSummary[]> {
  const payload = await getPayload()
  const { docs } = await payload.find({
    collection: 'news',
    ...publicReadArgs,
    sort: '-publishedAt',
    pagination: false,
    depth: 1,
  })
  return (docs as unknown as NewsAllLocales[]).map((doc) => toNewsSummary(doc, locale))
}

/**
 * One article by slug, or `null` when there is no such article.
 *
 * Cached per request: the route renders the article and generates its metadata
 * from the same document, and those are two separate calls into this module.
 */
export const findNewsArticle = cache(async function findNewsArticle(
  slug: string,
  locale: Locale,
): Promise<NewsArticle | null> {
  const payload = await getPayload()
  const { docs } = await payload.find({
    collection: 'news',
    ...publicReadArgs,
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 1,
  })
  const doc = docs[0] as unknown as NewsAllLocales | undefined
  return doc ? toNewsArticle(doc, locale) : null
})
