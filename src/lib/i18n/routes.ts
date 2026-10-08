import type { Locale } from './index'

/**
 * The public name of each page, per language.
 *
 * The key is the name on disk under `src/app/(app)/[locale]/`, which stays
 * Icelandic — renaming directories would be churn for no gain, and the proxy
 * rewrites the English form onto them. Only the URL a reader sees changes.
 *
 * The English names are the ones the interface already uses for these pages, so
 * the address bar and the navigation agree: the nav says "Web Awards" and the
 * URL says `/en/web-awards`.
 */
export const ROUTE_SEGMENTS = {
  vefverdlaunin: { is: 'vefverdlaunin', en: 'web-awards' },
  vidburdir: { is: 'vidburdir', en: 'events' },
  frettir: { is: 'frettir', en: 'news' },
  'um-svef': { is: 'um-svef', en: 'about' },
  myndir: { is: 'myndir', en: 'photos' },
  skraning: { is: 'skraning', en: 'membership' },
  'hafa-samband': { is: 'hafa-samband', en: 'contact' },
} as const

/** The directory name on disk, which is also the Icelandic public name. */
export type RouteKey = keyof typeof ROUTE_SEGMENTS

/**
 * Every public name back to its directory, in every language.
 *
 * Built once rather than searched each time, and it holds the Icelandic names
 * too, so a path that is already internal maps to itself.
 */
const TO_INTERNAL: ReadonlyMap<string, RouteKey> = new Map(
  (Object.keys(ROUTE_SEGMENTS) as RouteKey[]).flatMap((key) =>
    Object.values(ROUTE_SEGMENTS[key]).map((name) => [name, key] as const),
  ),
)

/** The directory a public segment belongs to, or `undefined` if it names no page. */
export function toInternalSegment(segment: string): RouteKey | undefined {
  return TO_INTERNAL.get(segment)
}

/** What a page is called in `locale`. Unknown segments are returned untouched. */
export function toPublicSegment(segment: string, locale: Locale): string {
  const key = toInternalSegment(segment)
  return key ? ROUTE_SEGMENTS[key][locale] : segment
}
