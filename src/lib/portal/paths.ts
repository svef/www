import { localePath, type Locale } from '@/lib/i18n'

/**
 * Where everything in the signed-in portal lives, as directory paths (Icelandic, no
 * locale). Turn one into a link with `portalHref(path, locale)`, which names it in the
 * reader's language: `/is/minar-sidur/verkefni` and `/en/my-pages/projects`.
 *
 * The portal is SVEF's member area; the awards are one section of it, and the admin
 * (Stjórnborð) is another. Every link builder, email and redirect goes through here, so a
 * page that moves moves in one place.
 */
export const PORTAL = {
  /** The portal's overview: what needs attention, deadlines, a quick start. */
  overview: '/minar-sidur',
  /** The person's projects in the awards, with the bulk actions. */
  projects: '/minar-sidur/verkefni',
  newProject: '/minar-sidur/verkefni/nytt',
  project: (id: string) => `/minar-sidur/verkefni/${id}`,
  account: '/minar-sidur/adgangur',
  invitation: (token: string) => `/minar-sidur/bod/${token}`,
} as const

export const ADMIN = {
  overview: '/stjornbord',
  projects: '/stjornbord/verkefni',
  entry: (entryId: string) => `/stjornbord/verkefni/${entryId}`,
  requests: '/stjornbord/beidnir',
  users: '/stjornbord/notendur',
  user: (userId: string) => `/stjornbord/notendur/${userId}`,
  tools: '/stjornbord/verkfaeri',
} as const

/** A portal or admin path as a link in `locale`. */
export function portalHref(path: string, locale: Locale): string {
  return localePath(path, locale)
}
