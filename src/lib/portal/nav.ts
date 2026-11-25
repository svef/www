import { localePath, type Locale } from '@/lib/i18n'
import { portalCopy } from './copy'
import { ADMIN, PORTAL } from './paths'

/**
 * The portal's navigation: groups of links, the admin group only for admins. Built on the
 * server, matched against the current path in the browser.
 *
 * Room is left for more sections (membership will be one): a group is just a label and its
 * links, so a new one is a new entry here, rendered only once it has pages.
 */
export type PortalNavItem = {
  href: string
  label: string
  /** Current only on this exact page, not on the pages under it (an overview). */
  exact?: boolean
}

export type PortalNavGroup = { id: string; label: string; items: PortalNavItem[] }

export function buildPortalNav(locale: Locale, isAdmin: boolean): PortalNavGroup[] {
  const c = portalCopy[locale]
  const href = (p: string) => localePath(p, locale)
  const groups: PortalNavGroup[] = [
    {
      id: 'awards',
      label: c.groups.awards,
      items: [
        { href: href(PORTAL.overview), label: c.items.overview, exact: true },
        { href: href(PORTAL.projects), label: c.items.projects },
        { href: href(PORTAL.newProject), label: c.items.newProject },
      ],
    },
  ]
  if (isAdmin) {
    groups.push({
      id: 'admin',
      label: c.groups.admin,
      items: [
        { href: href(ADMIN.overview), label: c.items.adminOverview, exact: true },
        { href: href(ADMIN.projects), label: c.items.adminProjects },
        { href: href(ADMIN.requests), label: c.items.adminRequests },
        { href: href(ADMIN.users), label: c.items.adminUsers },
        { href: href(ADMIN.tools), label: c.items.adminTools },
      ],
    })
  }
  return groups
}

/**
 * Which link marks where the reader is: the one whose page they are on (`page`), or else
 * the one whose section they are in (`section`), the deepest match winning, so a project's
 * own page marks "My projects" and the new-project page marks "New project", not both.
 * `pathname` may be in either language and carry a query; it is compared as the visible
 * path in `locale`.
 */
export function currentNavItem(
  groups: readonly PortalNavGroup[],
  pathname: string,
  locale: Locale,
): { href: string; kind: 'page' | 'section' } | null {
  const here = localePath(pathname.split(/[?#]/)[0], locale).replace(/\/+$/, '')
  let best: { href: string; kind: 'page' | 'section' } | null = null
  for (const item of groups.flatMap((g) => g.items)) {
    if (here === item.href) return { href: item.href, kind: 'page' }
    if (!item.exact && here.startsWith(`${item.href}/`)) {
      if (!best || item.href.length > best.href.length) best = { href: item.href, kind: 'section' }
    }
  }
  return best
}

/** Up to two letters for the avatar: first and last name, or the email's first letter. */
export function initialsOf(name: string, email: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const letters =
    words.length === 0
      ? [email.trim()[0] ?? '?']
      : words.length === 1
        ? [words[0][0]]
        : [words[0][0], words[words.length - 1][0]]
  return letters.join('').toLocaleUpperCase('is')
}

/**
 * The language link: the same page in the other locale, with the query string kept, so
 * switching language on a filtered, sorted or paged admin list stays on that view.
 * `search` is the query as `useSearchParams().toString()` gives it (no leading `?`).
 */
export function otherLanguageHref(pathname: string, search: string, locale: Locale): string {
  const query = search.replace(/^\?/, '')
  return localePath(`${pathname}${query ? `?${query}` : ''}`, locale === 'is' ? 'en' : 'is')
}
