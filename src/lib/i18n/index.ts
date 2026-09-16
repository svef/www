import { is } from './is'
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
 * Routing is asymmetric (see `src/proxy.ts`): Icelandic is served unprefixed at
 * the root and only carries the `/is` segment internally, English is served at
 * `/en/...`. Any `/is` prefix in the input is therefore stripped, never emitted
 * — so this accepts both the visible path and the internally rewritten one and
 * always returns the visible form.
 *
 * A query string and/or hash on the input is carried over unchanged.
 */
export function localePath(path: string, target: Locale): string {
  const hashAt = path.indexOf('#')
  const hash = hashAt === -1 ? '' : path.slice(hashAt)
  const withoutHash = hashAt === -1 ? path : path.slice(0, hashAt)

  const queryAt = withoutHash.indexOf('?')
  const query = queryAt === -1 ? '' : withoutHash.slice(queryAt)
  let pathname = queryAt === -1 ? withoutHash : withoutHash.slice(0, queryAt)

  if (!pathname.startsWith('/')) pathname = `/${pathname}`
  let rest = pathname.replace(LOCALE_PREFIX, '')
  if (rest === '/') rest = ''

  const localized = target === 'en' ? `/en${rest}` : rest || '/'
  return `${localized}${query}${hash}`
}
