import { LOCALES, type RouteKey } from '@/lib/i18n'
import type { CollectionSlug, GlobalSlug } from 'payload'

/**
 * Which cached pages a save has to flush, per collection and global.
 *
 * Kept pure and separate from the hook that calls it, because this is the part
 * that is easy to get wrong and quiet when it is: miss a page and an editor's
 * change sits invisible for five minutes with no sign anything is stale, which
 * looks exactly like the save not having worked.
 *
 * ## Directory names, not public names
 *
 * Pages are cached under the path they were *rendered* at, and that is the
 * directory on disk. `/en/news` is a rewrite in `src/proxy.ts` onto
 * `/en/frettir`, so the English news index is a cache entry tagged
 * `/en/frettir` — there is no entry called `/en/news` at all, and revalidating
 * that path does nothing. So unlike every link on the site, these paths are
 * deliberately **not** built with `localePath()`: they take the Icelandic
 * directory name (a key of the routes map) under each locale prefix.
 *
 * ## Detail pages by route, not by slug
 *
 * A news article or an event is flushed by its route pattern
 * (`/(app)/[locale]/vidburdir/[slug]`, type `page`), which reaches every page
 * of that route in both languages, whatever the slug. Three reasons, each of
 * which a slug-by-slug list gets wrong:
 *
 * - **An event page depends on the other events.** It marks the next event and
 *   lists the rest, so a change to one event changes pages that are not its own.
 * - **Slugs are localized** (svef/www#98) and can be renamed. The old URL keeps
 *   serving its cached page until it is flushed, and a hook only reliably knows
 *   the new slug — the pattern covers the old one without having to know it.
 * - **Other collections feed detail pages too**: a board member is an article's
 *   byline, an album is an event's photo link.
 *
 * Revalidation is lazy, so flushing a route costs nothing until a page of it is
 * next requested.
 */

/** One `revalidatePath` call: a concrete path, or a route pattern with its `type`. */
export interface RevalidationTarget {
  path: string
  type?: 'page' | 'layout'
}

/** The public routes with a dynamic segment, as they sit on disk. */
type DetailRoute = 'frettir/[slug]' | 'vidburdir/[slug]'

/** A page with no dynamic segment of its own, in every locale, under its directory name. */
function page(route: RouteKey | 'home'): RevalidationTarget[] {
  return LOCALES.map((locale) => ({
    path: route === 'home' ? `/${locale}` : `/${locale}/${route}`,
  }))
}

/** Every page of a dynamic route, in every locale and for every slug. */
function everyPageOf(route: DetailRoute): RevalidationTarget {
  return { path: `/(app)/[locale]/${route}`, type: 'page' }
}

/** `src/app/sitemap.ts` lists every article and event. */
const SITEMAP: RevalidationTarget = { path: '/sitemap.xml' }

/**
 * Everything, through the root layout every page sits under.
 *
 * For what reaches every page: site settings are in the header and footer of
 * the site, the landing page and the contact page, and an upload can be used
 * anywhere. Listing those pages by hand is a list that goes stale the next time
 * a page is added; the root layout does not.
 */
const WHOLE_SITE: RevalidationTarget = { path: '/', type: 'layout' }

/**
 * Collections and globals that feed no public page, so a save there flushes
 * nothing. Listed rather than left out, so that a new collection has to be put
 * in one table or the other (`revalidate-coverage.test.ts`).
 */
export const NOT_PUBLIC: readonly (CollectionSlug | GlobalSlug)[] = [
  // Admin accounts. Nothing on the site shows them.
  'users',
  // What readers send in through the forms; read access is closed.
  'feedback',
  'talk-proposals',
]

/**
 * What each collection and global appears on. Read off the loaders in
 * `src/lib/content/` and the routes that call them; when a page starts reading
 * something new, its entry here has to grow with it.
 */
export const REVALIDATE = {
  // The index, every article, and the sitemap.
  news: [...page('frettir'), everyPageOf('frettir/[slug]'), SITEMAP],
  // The home page's posters, the index, every event page (each one marks the
  // next event and lists the others), the albums' venue and link, the sitemap.
  events: [
    ...page('home'),
    ...page('vidburdir'),
    everyPageOf('vidburdir/[slug]'),
    ...page('myndir'),
    SITEMAP,
  ],
  // The albums page, and the "photos from this event" link on past events —
  // on the index, on the event's own page, and on the home page when it is
  // showing past events.
  galleries: [
    ...page('home'),
    ...page('vidburdir'),
    everyPageOf('vidburdir/[slug]'),
    ...page('myndir'),
  ],
  // The board page, and the byline on any article a board member wrote.
  'board-members': [...page('stjorn'), everyPageOf('frettir/[slug]')],
  'award-categories': page('vefverdlaunin'),
  // The ceremony line on the home page is chosen from the editions, and an
  // edition that has winners is passed over (svef/www#86), so winners count too.
  'award-editions': [...page('home'), ...page('vefverdlaunin')],
  'award-winners': [...page('home'), ...page('vefverdlaunin')],
  media: [WHOLE_SITE],
  'site-settings': [WHOLE_SITE],
  'home-page': page('home'),
  'about-page': [...page('um-svef'), ...page('spurt-og-svarad')],
  'awards-page': page('vefverdlaunin'),
  'membership-page': page('skraning'),
} as const satisfies Partial<
  Record<CollectionSlug | GlobalSlug, readonly RevalidationTarget[]>
>

export type RevalidatedSlug = keyof typeof REVALIDATE
