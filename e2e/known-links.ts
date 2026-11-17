/**
 * Accepted, *tracked* dead links — the same shape, and the same bargain, as
 * `e2e/a11y/known-issues.ts`.
 *
 * `links.spec.ts` asserts that every internal link on every page goes somewhere
 * real. The site today has a number of links that do not, because the page they
 * should point at has not been built yet: the contact page's social icons are
 * `href="#"` placeholders.
 *
 * Four entries have already been retired. #24 built the article route and the
 * news cards went; #19 built `/vidburdir/[slug]` and the event rows went; #26
 * sourced the footer's four social placeholders from the `site-settings`
 * global — omitting a network with no URL rather than linking it to nothing —
 * and they went too; #20 built the winners archive and the awards year links
 * went with it. Each time the guard test below went red first, which is
 * exactly the lifecycle this file is designed to force.
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

// Empty: the contact page's social placeholders (svef/www#23) are gone — the
// socials now come from the `site-settings` global and a network without a URL
// is omitted. The guard test in `links.spec.ts` went red, as designed, and the
// entry was deleted so those links are enforced. Add an entry here (with the
// issue that removes it) the next time a dead link is knowingly accepted.
export const KNOWN_DEAD_LINKS: readonly KnownDeadLink[] = []

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
