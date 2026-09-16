/**
 * Accepted, *tracked* dead links — the same shape, and the same bargain, as
 * `e2e/a11y/known-issues.ts`.
 *
 * `links.spec.ts` asserts that every internal link on every page goes somewhere
 * real. The site today has a number of links that do not, because the page they
 * should point at has not been built yet: event rows link to the events index
 * instead of the event, the awards year links go nowhere, and the social icons
 * are `href="#"` placeholders.
 *
 * The news cards used to be listed here too. #24 built the article route, the
 * guard test below went red, and the entry was deleted — which is exactly the
 * lifecycle this file is designed to force.
 *
 * Those were undocumented. Listing them here does two things: it makes them
 * visible, and — via the guard test that asserts each one *still reproduces* —
 * it forces the entry to be deleted when the issue is fixed, so the allowlist
 * cannot outlive its reason.
 */
export interface PageLink {
  /** The raw `href` attribute. */
  href: string
  /** Pathname for an internal link, `''` otherwise. */
  resolved: string
  /** Which landmark the link sits in. */
  where: 'header' | 'main' | 'footer' | 'other'
  /** Trimmed link text, for the failure message. */
  text: string
}

export type LinkProblem =
  /** `href="#"` — a placeholder that goes nowhere. */
  | 'placeholder-hash'
  /** An in-page `#anchor` with no matching element. */
  | 'dead-anchor'
  /** An internal path that is not a route the site has. */
  | 'unknown-route'
  /** A link inside `<main>` that points at the page it is already on. */
  | 'self-link'

export interface KnownDeadLink {
  /** GitHub issue on svef/www that tracks the fix. */
  issue: number
  why: string
  problem: LinkProblem
  /**
   * Visible URL → exactly how many such links are accepted there. A URL that is
   * not a key is not allowed to carry the problem at all.
   */
  urls: Readonly<Record<string, number>>
  matches: (link: PageLink) => boolean
}

/** Both locales of a path, mapped to the same expected count. */
function bothLocales(paths: readonly string[], count: number): Record<string, number> {
  const out: Record<string, number> = {}
  for (const p of paths) {
    out[p === '' ? '/' : p] = count
    out[`/en${p}`] = count
  }
  return out
}

const ALL_PAGE_PATHS = [
  '',
  '/vidburdir',
  '/vefverdlaunin',
  '/um-svef',
  '/skraning',
  '/hafa-samband',
  '/frettir',
  '/myndir',
] as const

// `vidburdir/page.tsx` does the same for every EventRow, plus the "about the
// event" CTA. The event detail route is #19, not yet started.
const EVENT_ROWS_SELF_LINK: KnownDeadLink = {
  issue: 19,
  why: 'Event rows and the event CTA link to the events index instead of the event; detail route is svef/www#19.',
  problem: 'self-link',
  urls: bothLocales(['/vidburdir'], 4),
  matches: (link) => link.where === 'main',
}

// The awards page lists past editions as links, but the winners archive has no
// route yet (#20 builds it, #31 imports the data).
const AWARDS_YEAR_SELF_LINK: KnownDeadLink = {
  issue: 20,
  why: 'Awards year links point at the awards index; the winners archive route is svef/www#20.',
  problem: 'self-link',
  urls: bothLocales(['/vefverdlaunin'], 3),
  matches: (link) => link.where === 'main',
}

// `layout.tsx` hard-codes four `href: '#'` social links into the footer. They
// come from SiteSettings once #26 lands.
const FOOTER_SOCIAL_PLACEHOLDERS: KnownDeadLink = {
  issue: 26,
  why: 'Footer social links are hard-coded `href="#"` placeholders; they come from SiteSettings in svef/www#26.',
  problem: 'placeholder-hash',
  urls: bothLocales(ALL_PAGE_PATHS, 4),
  matches: (link) => link.where === 'footer',
}

// `hafa-samband/page.tsx` repeats the same four placeholders in the page body.
const CONTACT_SOCIAL_PLACEHOLDERS: KnownDeadLink = {
  issue: 23,
  why: 'Contact page social links are `href="#"` placeholders; real URLs land with svef/www#23.',
  problem: 'placeholder-hash',
  urls: bothLocales(['/hafa-samband'], 4),
  matches: (link) => link.where === 'main',
}

export const KNOWN_DEAD_LINKS: readonly KnownDeadLink[] = [
  EVENT_ROWS_SELF_LINK,
  AWARDS_YEAR_SELF_LINK,
  FOOTER_SOCIAL_PLACEHOLDERS,
  CONTACT_SOCIAL_PLACEHOLDERS,
]

export function findKnownDeadLink(
  problem: LinkProblem,
  url: string,
  link: PageLink,
): KnownDeadLink | undefined {
  return KNOWN_DEAD_LINKS.find(
    (known) => known.problem === problem && url in known.urls && known.matches(link),
  )
}

export function describeLink(problem: LinkProblem, link: PageLink): string {
  return `[${problem}] href="${link.href}" in <${link.where}> — "${link.text}"`
}
