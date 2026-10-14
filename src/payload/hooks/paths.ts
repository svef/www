import { LOCALES, localePath, type Locale } from '@/lib/i18n'

/**
 * Which public paths a document appears on.
 *
 * Kept pure and separate from the hook that calls it, because this is the part
 * that is easy to get wrong and easy to test: miss a path and an editor's
 * change sits invisible for five minutes with no sign anything is stale, which
 * looks exactly like the save not having worked.
 *
 * Paths are written in Icelandic — the directory names on disk — and
 * `localePath` translates each into the reader's language, so `/frettir`
 * becomes `/is/frettir` and `/en/news`. This map never has to know the English
 * route names.
 *
 * **Slugs are localised** (svef/www#98), so a document sits at a different path
 * in each language and neither can be derived from the other. The slug
 * therefore arrives per locale, read with `locale: 'all'`.
 */

/** A document's slugs keyed by locale, as Payload returns them for `locale: 'all'`. */
export type LocalizedSlug = Partial<Record<Locale, string | null | undefined>>

/** Every locale's form of one Icelandic-named path. */
function allLocales(path: string): string[] {
  return LOCALES.map((locale) => localePath(path, locale))
}

/**
 * A list path plus the detail path in each language.
 *
 * A locale with no slug contributes nothing rather than a path ending in
 * `undefined`: Icelandic-only content is normal here, and revalidating a route
 * that was never generated is a wasted call at best.
 */
function listAndDetail(base: string, slug: LocalizedSlug | undefined): string[] {
  const paths = allLocales(base)
  if (!slug) return paths
  for (const locale of LOCALES) {
    const value = slug[locale]
    if (typeof value === 'string' && value !== '') {
      paths.push(localePath(`${base}/${value}`, locale))
    }
  }
  return paths
}

/**
 * The home page lists the next events and the latest news, so a change to
 * either invalidates it as well as its own section. Forgetting this is the
 * subtle version of the bug: the section page updates, the front page keeps
 * showing yesterday, and nobody connects the two.
 */
const HOME = allLocales('/')

export function newsPaths(slug?: LocalizedSlug): string[] {
  return [...listAndDetail('/frettir', slug), ...HOME]
}

export function eventPaths(slug?: LocalizedSlug): string[] {
  return [...listAndDetail('/vidburdir', slug), ...HOME]
}

/** Categories, editions and winners all render on the awards page. */
export function awardsPaths(): string[] {
  return allLocales('/vefverdlaunin')
}

/** The board appears on its own page and inside the About page. */
export function boardPaths(): string[] {
  return [...allLocales('/stjorn'), ...allLocales('/um-svef')]
}

export function galleryPaths(): string[] {
  return allLocales('/myndir')
}

export function homePagePaths(): string[] {
  return HOME
}

/** About carries the story, the board, the bylaws and the FAQ. */
export function aboutPagePaths(): string[] {
  return [
    ...allLocales('/um-svef'),
    ...allLocales('/stjorn'),
    ...allLocales('/log-svef'),
    ...allLocales('/spurt-og-svarad'),
  ]
}

export function awardsPagePaths(): string[] {
  return allLocales('/vefverdlaunin')
}

export function membershipPagePaths(): string[] {
  return allLocales('/skraning')
}

/**
 * Site settings reach every page, because the header and footer are on every
 * page. Listed explicitly rather than with a wildcard: `revalidatePath`'s
 * wildcard does not mean what people assume, and an explicit list is something
 * a reader can check against the route table.
 */
export function siteSettingsPaths(): string[] {
  return [
    ...HOME,
    ...allLocales('/frettir'),
    ...allLocales('/vidburdir'),
    ...allLocales('/vefverdlaunin'),
    ...allLocales('/um-svef'),
    ...allLocales('/stjorn'),
    ...allLocales('/log-svef'),
    ...allLocales('/spurt-og-svarad'),
    ...allLocales('/myndir'),
    ...allLocales('/skraning'),
  ]
}
