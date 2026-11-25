import type { Metadata } from 'next'
// Relative, not `@/lib/i18n`: `next.config.ts` imports this file, and the config is
// compiled without the path alias. `./routes` itself imports nothing but a type.
import { ROUTE_SEGMENTS, type RouteKey } from '../i18n/routes'

/**
 * Pages that are about one signed-in person, or are a step in signing in, and so have no
 * business in search results.
 *
 * - **The portal**: Mínar síður (`/is/minar-sidur`, `/en/my-pages`) and the admin,
 *   Stjórnborð (`/is/stjornbord`, `/en/admin`), and everything beneath them. Their root
 *   layout (`src/app/(portal)/[locale]/layout.tsx`) sets {@link NOINDEX} once for all of
 *   them; robots.txt also disallows them, and `next.config.ts` adds an `X-Robots-Tag`.
 * - **The account flows**: sign-up, sign-in, forgotten and reset password, and email
 *   confirmation. Each page sets {@link NOINDEX} itself, because they share the site's layout
 *   with the public pages. They are *not* disallowed in robots.txt, so a crawler can still
 *   fetch them and read the `noindex` (see `src/app/robots.ts` for why that matters).
 *
 * The public awards catalogue (`/is/innsendingar`) is neither, and stays indexable.
 */
export const PORTAL_ROUTES = [
  'minar-sidur',
  'stjornbord',
] as const satisfies readonly RouteKey[]

export const ACCOUNT_ROUTES = [
  'nyskraning',
  'innskraning',
  'gleymt-lykilord',
  'endurstilla-lykilord',
  'stadfesta-netfang',
] as const satisfies readonly RouteKey[]

const PRIVATE: ReadonlySet<RouteKey> = new Set<RouteKey>([
  ...PORTAL_ROUTES,
  ...ACCOUNT_ROUTES,
])

/** Whether the page with this directory name is one search engines should not index. */
export function isPrivatePage(key: RouteKey): boolean {
  return PRIVATE.has(key)
}

/** `robots` for a private page: not indexed, and its links not followed. */
export const NOINDEX = {
  index: false,
  follow: false,
} as const satisfies Metadata['robots']

/**
 * The visible path of each page in every language, `/is/minar-sidur` and `/en/my-pages`.
 * Matching it as a prefix covers every sub-page as well.
 */
export function publicPrefixes(keys: readonly RouteKey[]): string[] {
  return keys.flatMap((key) =>
    Object.entries(ROUTE_SEGMENTS[key]).map(([locale, name]) => `/${locale}/${name}`),
  )
}
