import { ADMIN, PORTAL } from './paths'

/**
 * The awards' signed-in pages lived under `/innsendingar` until the portal (`/minar-sidur`)
 * and the admin (`/stjornbord`) took them over. Emails already sent and people's bookmarks
 * still point at the old addresses, so each one answers with a permanent redirect to where
 * the page is now. Only the public category page stays at `/innsendingar`.
 *
 * Takes the segments after the locale, in either language (`['submissions', 'mine']` as
 * readily as `['innsendingar', 'minar']`), and returns the new directory path, or `null`
 * when the path is not one of the old ones.
 *
 * | old                                   | new                                |
 * |---------------------------------------|------------------------------------|
 * | /innsendingar/minar · mine            | /minar-sidur                       |
 * | /innsendingar/ny · new                | /minar-sidur/verkefni/nytt         |
 * | /innsendingar/<id>                    | /minar-sidur/verkefni/<id>         |
 * | /innsendingar/bod · invite/<token>    | /minar-sidur/bod/<token>           |
 * | /innsendingar/starfsfolk · staff      | /stjornbord/verkefni               |
 * | /innsendingar/starfsfolk/<entryId>    | /stjornbord/verkefni/<entryId>     |
 */
export function legacyPortalPath(segments: readonly string[]): string | null {
  const [head, second, third, ...rest] = segments
  if (head !== 'innsendingar' && head !== 'submissions') return null
  if (second === undefined || second === '' || rest.length > 0) return null
  const one = third === undefined || third === ''

  if (second === 'minar' || second === 'mine') return one ? PORTAL.overview : null
  if (second === 'ny' || second === 'new') return one ? PORTAL.newProject : null
  if (second === 'starfsfolk' || second === 'staff') {
    return one ? ADMIN.projects : ADMIN.entry(third)
  }
  if (second === 'bod' || second === 'invite') return one ? null : PORTAL.invitation(third)
  // Anything else directly under the page was a project id.
  return one ? PORTAL.project(second) : null
}
