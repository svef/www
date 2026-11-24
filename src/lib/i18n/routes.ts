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
  stjorn: { is: 'stjorn', en: 'board' },
  'log-svef': { is: 'log-svef', en: 'bylaws' },
  'spurt-og-svarad': { is: 'spurt-og-svarad', en: 'faq' },
  myndir: { is: 'myndir', en: 'photos' },
  skraning: { is: 'skraning', en: 'membership' },
  'hafa-samband': { is: 'hafa-samband', en: 'contact' },
  innsendingar: { is: 'innsendingar', en: 'submissions' },
  // Awards accounts (svef/www#158).
  nyskraning: { is: 'nyskraning', en: 'sign-up' },
  innskraning: { is: 'innskraning', en: 'sign-in' },
  'gleymt-lykilord': { is: 'gleymt-lykilord', en: 'forgot-password' },
  'endurstilla-lykilord': { is: 'endurstilla-lykilord', en: 'reset-password' },
  'stadfesta-netfang': { is: 'stadfesta-netfang', en: 'verify-email' },
} as const

/**
 * Names *under* a page, per language, for the pages that have fixed sub-pages
 * (`/is/innsendingar/minar` ↔ `/en/submissions/mine`). Keyed on the parent's
 * directory name, then on the child's Icelandic name.
 *
 * Only the second segment of a path is looked up here. Anything else after the
 * page name — a project id, a slug — is data, not a name, and travels untouched.
 */
export const NESTED_SEGMENTS: Readonly<
  Partial<Record<RouteKey, Readonly<Record<string, { is: string; en: string }>>>>
> = {
  innsendingar: {
    minar: { is: 'minar', en: 'mine' },
    ny: { is: 'ny', en: 'new' },
    // The staff area (svef/www#168 builds it out; the invoicing export and eligibility list live here for now).
    starfsfolk: { is: 'starfsfolk', en: 'staff' },
  },
}

/**
 * Pages that are built but switched off: they answer 404, and every link,
 * nav item and sitemap entry that points at them is dropped.
 *
 * Both are on hold for more design work (svef/www#128). This is the one switch —
 * the pages, components, collections and forms all stay, so un-hiding a page is
 * a one-line change: remove its key here. Everything else (the 404 in the page,
 * the nav, footer, home page, sitemap and the e2e route sweep) follows from this
 * set, so nothing else needs touching.
 *
 * #111 may later move the membership switch into the CMS; if so this set is the
 * place to read it from, and `isHiddenPage` stays the only thing callers use.
 */
export const HIDDEN_PAGES: ReadonlySet<RouteKey> = new Set<RouteKey>([
  'vefverdlaunin',
  'skraning',
])

/** Whether the page with this directory name is currently switched off. */
export function isHiddenPage(key: RouteKey): boolean {
  return HIDDEN_PAGES.has(key)
}

/**
 * Whether a path or href points at a hidden page, or at anything beneath one.
 *
 * Takes the path in either language, with or without a locale prefix, so it
 * works on the hrefs the site actually renders (`/en/web-awards`, `/skraning`)
 * as well as on directory names. A query string, hash or absolute URL is not a
 * concern of the caller's: only the first path segment is read. External and
 * `mailto:` links are never hidden pages.
 */
export function isHiddenPath(path: string): boolean {
  if (!path.startsWith('/')) return false
  const [, first = '', second = ''] = path.split(/[?#]/)[0].split('/')
  const segment = first === 'is' || first === 'en' ? second : first
  const key = toInternalSegment(segment)
  return key !== undefined && isHiddenPage(key)
}

/** Drops the entries whose `href` points at a hidden page. */
export function withoutHiddenLinks<T extends { href: string }>(links: readonly T[]): T[] {
  return links.filter((link) => !isHiddenPath(link.href))
}

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

/** The directory name of a nested child, in any language, under `parent`. */
function toInternalChild(parent: RouteKey, segment: string): string {
  const children = NESTED_SEGMENTS[parent]
  if (!children) return segment
  for (const [internal, names] of Object.entries(children)) {
    if (Object.values(names).includes(segment)) return internal
  }
  return segment
}

/**
 * The segments of a path (after the locale), with the page name and a known
 * sub-page name written in `locale`. Segments that name nothing are returned
 * as they came, so `['innsendingar', '<uuid>']` keeps its id.
 */
export function toPublicSegments(segments: readonly string[], locale: Locale): string[] {
  const [head, second, ...rest] = segments
  if (head === undefined) return []
  const key = toInternalSegment(head)
  if (!key) return [...segments]
  const out: string[] = [ROUTE_SEGMENTS[key][locale]]
  if (second === undefined) return out
  const child = NESTED_SEGMENTS[key]?.[toInternalChild(key, second)]
  out.push(child ? child[locale] : second)
  return [...out, ...rest]
}

/** The same path as directory names on disk: what the proxy rewrites onto. */
export function toInternalSegments(segments: readonly string[]): string[] {
  const [head, second, ...rest] = segments
  if (head === undefined) return []
  const key = toInternalSegment(head)
  if (!key) return [...segments]
  const out: string[] = [key]
  if (second === undefined) return out
  return [...out, toInternalChild(key, second), ...rest]
}
