import { is } from './is'
import { toPublicSegment } from './routes'
import { en } from './en'

export const LOCALES = ['is', 'en'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'is'

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value)
}

const dictionaries = { is, en } as const
export type Dictionary = typeof is

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE]
}

const LOCALE_PREFIX = /^\/(is|en)(?=\/|$)/

/**
 * Map a path to its visible equivalent in another locale.
 *
 * Routing is symmetric (see `src/proxy.ts`): every page lives under an explicit
 * locale prefix, `/is/...` and `/en/...` alike, and the root is not a page but a
 * redirect to a language. An existing prefix on the input is replaced rather
 * than appended, so this accepts an already-localised path and is idempotent.
 *
 * The page's own name is translated with it: `/is/vidburdir` becomes
 * `/en/events`, not `/en/vidburdir`. Anything after that first segment — a news
 * or event slug — is carried across unchanged, because those are not localized
 * yet (svef/www#98).
 *
 * A query string and/or hash on the input is carried over unchanged.
 *
 * The result is always a single-slash-rooted path: a leading `//` would be a
 * protocol-relative URL, so `<a href>` would leave the site entirely. Next
 * normalises `//` away before a page renders, so no caller reaches this today —
 * the guard is here so a future localised `not-found.tsx`, which would render
 * the header for arbitrary unnormalised paths, cannot make it reachable.
 */
export function localePath(path: string, target: Locale): string {
  const hashAt = path.indexOf('#')
  const hash = hashAt === -1 ? '' : path.slice(hashAt)
  const withoutHash = hashAt === -1 ? path : path.slice(0, hashAt)

  const queryAt = withoutHash.indexOf('?')
  const query = queryAt === -1 ? '' : withoutHash.slice(queryAt)
  let pathname = queryAt === -1 ? withoutHash : withoutHash.slice(0, queryAt)

  pathname = `/${pathname.replace(/^\/+/, '')}`
  let rest = pathname.replace(LOCALE_PREFIX, '').replace(/^\/+/, '/')
  if (rest === '/') rest = ''

  // Translate the page's own name. The input may be in either language, since
  // this takes the path a reader is on as readily as one written in code.
  const [, head = '', ...tail] = rest.split('/')
  const translated = head ? `/${[toPublicSegment(head, target), ...tail].join('/')}` : rest

  return `/${target}${translated}${query}${hash}`
}

export { ROUTE_SEGMENTS, toInternalSegment, toPublicSegment, type RouteKey } from './routes'
