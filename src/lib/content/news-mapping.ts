import { pickLocalized, type AllLocales } from '@/lib/localized'
import { localePath, type Locale } from '@/lib/i18n'
import type { Media, News } from '@/payload-types'

/**
 * Shaping `news` documents into what a page renders.
 *
 * This layer is pure: it does no I/O, so `./news.ts` owns the Payload read and
 * calls in here, and pages import from `./news.ts` only.
 *
 * Two jobs justify the split. First, a `locale: 'all'` read comes back in a
 * shape Payload's generated types do not describe, so it has to be re-typed at
 * a boundary — `NewsAllLocales` below is that boundary, in one place per
 * collection instead of once per page. Second, resolving the fallback is a
 * decision, not a lookup: which locale each field actually ended up in is what
 * the pages mark up with `lang`, and dropping every untranslated locale here
 * keeps the other language's copy out of the payload the client receives.
 *
 * Being pure is a consequence, not the reason — though it does mean this file
 * can be unit tested directly. `./news.ts` is equally testable: `vitest.config.ts`
 * aliases `@payload-config`, so importing the reading layer in a test works.
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
   * The language `title` is actually written in.
   *
   * On `/en` this is `is` for any article that has no English translation yet,
   * which is most of them — Icelandic is the source of truth and English is
   * filled in as it is written. Pages use it for `lang`, so fallback content is
   * presented as Icelandic rather than as broken English.
   *
   * Every localized field reports its own locale, because Payload localizes
   * them independently and a translator lands them one at a time. Assuming one
   * language for the whole document is how untranslated copy ends up announced
   * in the wrong voice.
   */
  contentLocale: Locale
  /**
   * The language `excerpt` is actually written in.
   *
   * `excerpt` is its own localized field: an article can have an English title
   * and no English excerpt, and then the Icelandic summary renders under an
   * English headline. With no excerpt at all there is nothing to mark, so this
   * follows `contentLocale`.
   */
  excerptLocale: Locale
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
  const excerpt = pickLocalized(doc.excerpt, locale)
  return {
    slug: doc.slug,
    href: localePath(`/frettir/${doc.slug}`, locale),
    publishedAt: doc.publishedAt,
    title: title.value ?? '',
    excerpt: excerpt.value,
    cover: toCover(doc.coverImage, locale),
    contentLocale: title.locale,
    excerptLocale: excerpt.value ? excerpt.locale : title.locale,
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
