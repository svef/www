import { pickLocalized, type AllLocales } from '@/lib/localized'
import { localePath, type Locale } from '@/lib/i18n'
import type { Media, News } from '@/payload-types'

/**
 * Shaping `news` documents into what a page renders.
 *
 * Pure on purpose — no Payload import, so the mapping that every news page
 * depends on is unit tested without a database. `./news.ts` does the reading
 * and calls in here; pages import from `./news.ts`.
 */

/** A `news` document as a `locale: 'all'` read actually returns it. */
export type NewsAllLocales = Omit<
  News,
  'title' | 'excerpt' | 'body' | 'coverImage'
> & {
  title: AllLocales<string>
  excerpt: AllLocales<string>
  body: AllLocales<News['body']>
  coverImage?: number | MediaAllLocales | null
}

type MediaAllLocales = Omit<Media, 'alt' | 'caption'> & {
  alt: AllLocales<string>
  caption: AllLocales<string>
}

export type NewsCover = {
  url: string
  alt: string
  width: number | null
  height: number | null
}

export type NewsSummary = {
  slug: string
  href: string
  /** ISO instant; formatted for display with `formatLongDate`. */
  publishedAt: string
  title: string
  excerpt: string | null
  cover: NewsCover | null
  /**
   * The language the copy above is actually written in.
   *
   * On `/en` this is `is` for any article that has no English translation yet,
   * which is most of them — Icelandic is the source of truth and English is
   * filled in as it is written. Pages use it for `lang` and for the design's
   * "English copy is not available for this page yet" note, so fallback content
   * is presented as Icelandic rather than as broken English.
   *
   * Resolved from `title`, and it covers the excerpt with it: both are one
   * short editorial line, written and translated together. The body is long
   * enough to lag behind, so it reports its language separately — see
   * `NewsArticle.bodyLocale`.
   */
  contentLocale: Locale
}

export type NewsArticle = NewsSummary & {
  body: News['body'] | null
  /**
   * The language of `body`.
   *
   * Separate from `contentLocale` because a translator can land the headline
   * before the article: an English title over an Icelandic body is a real
   * state, and marking the whole page as one language would misdescribe half
   * of it. With no body at all, the page shows the excerpt instead, so this
   * follows `contentLocale`.
   */
  bodyLocale: Locale
}

function toCover(
  coverImage: NewsAllLocales['coverImage'],
  locale: Locale,
): NewsCover | null {
  // depth 0 (or an unresolved relationship) leaves an id behind — nothing to render.
  if (!coverImage || typeof coverImage === 'number') return null
  if (!coverImage.url) return null
  return {
    url: coverImage.url,
    alt: pickLocalized(coverImage.alt, locale).value ?? '',
    width: coverImage.width ?? null,
    height: coverImage.height ?? null,
  }
}

export function toNewsSummary(doc: NewsAllLocales, locale: Locale): NewsSummary {
  const title = pickLocalized(doc.title, locale)
  return {
    slug: doc.slug,
    href: localePath(`/frettir/${doc.slug}`, locale),
    publishedAt: doc.publishedAt,
    title: title.value ?? '',
    excerpt: pickLocalized(doc.excerpt, locale).value,
    cover: toCover(doc.coverImage, locale),
    contentLocale: title.locale,
  }
}

export function toNewsArticle(doc: NewsAllLocales, locale: Locale): NewsArticle {
  const summary = toNewsSummary(doc, locale)
  const body = pickLocalized(doc.body, locale)
  return {
    ...summary,
    body: body.value,
    bodyLocale: body.value ? body.locale : summary.contentLocale,
  }
}
