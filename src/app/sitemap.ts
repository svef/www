import type { MetadataRoute } from 'next'
import { LOCALES, localePath, ROUTE_SEGMENTS, type Locale, type RouteKey } from '@/lib/i18n'
import { getSiteUrl } from '@/lib/site-url'
import { listEventSlugs } from '@/lib/content/events'
import { listNewsSlugs } from '@/lib/content/news'

/**
 * The sitemap, with every page in both languages.
 *
 * It carries more weight here than on most sites. `/is` and `/en` are reached
 * through a rewrite rather than being linked from a shared root, and a page is
 * named differently in each language — `/is/vidburdir` and `/en/events` — so
 * the two language trees share no URL a crawler could walk between. Without
 * this, the only routes into the English site are the root redirect and the
 * language link in the header.
 *
 * Every entry declares the other language as an alternate, which is what tells
 * a search engine the two are the same page rather than duplicates.
 */
export const revalidate = 300

/** Pages with fixed names, written as the route keys the segment map is keyed by. */
const STATIC_ROUTES = Object.keys(ROUTE_SEGMENTS) as RouteKey[]

/** `{ is: '…', en: '…' }` for one path, for the `alternates` field. */
function languages(path: string): Record<Locale, string> {
  const base = getSiteUrl()
  return Object.fromEntries(
    LOCALES.map((locale) => [locale, `${base}${localePath(path, locale)}`]),
  ) as Record<Locale, string>
}

function entry(path: string, extra?: Partial<MetadataRoute.Sitemap[number]>) {
  const base = getSiteUrl()
  return LOCALES.map((locale) => ({
    url: `${base}${localePath(path, locale)}`,
    alternates: { languages: languages(path) },
    ...extra,
  }))
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Slugs are localized, so each locale has its own list and the two are not
  // interchangeable. They are gathered per locale and paired by position:
  // `listEventSlugs` sorts by start date and returns one entry per document,
  // so index `i` is the same event in both languages.
  const [eventSlugs, newsSlugs] = await Promise.all([
    Promise.all(LOCALES.map((locale) => listEventSlugs(locale))),
    Promise.all(LOCALES.map((locale) => listNewsSlugs(locale))),
  ])

  const base = getSiteUrl()

  /** One document, as a URL per locale, each listing the others as alternates. */
  const documents = (route: RouteKey, perLocale: string[][]) =>
    perLocale[0].flatMap((_, index) => {
      const paths = Object.fromEntries(
        LOCALES.map((locale, i) => [locale, `/${route}/${perLocale[i][index]}`]),
      ) as Record<Locale, string>

      const urls = Object.fromEntries(
        LOCALES.map((locale) => [locale, `${base}${localePath(paths[locale], locale)}`]),
      ) as Record<Locale, string>

      return LOCALES.map((locale) => ({
        url: urls[locale],
        alternates: { languages: urls },
      }))
    })

  return [
    // The front page. `localePath('/')` gives `/is` and `/en`.
    ...entry('/', { priority: 1 }),
    ...STATIC_ROUTES.flatMap((route) => entry(`/${route}`)),
    ...documents('vidburdir', eventSlugs),
    // News is already filtered to what has actually been published — a
    // scheduled article must not appear here before its date, for the same
    // reason it 404s until then.
    ...documents('frettir', newsSlugs),
  ]
}
