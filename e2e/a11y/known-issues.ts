import type { Result } from 'axe-core'

type Node = Result['nodes'][number]

/**
 * Accepted, *tracked* axe violations.
 *
 * The rule here is deliberately narrow. A blanket `disableRules(['color-contrast'])`
 * would hide every future regression as well as the one being excused, and a
 * suite everybody learns to ignore is worse than no suite. So an entry names one
 * rule, one colour pair, *which elements* may carry it, the exact number of them
 * on each URL, and the issue that will remove it.
 *
 * The element predicate matters. Matching on a colour pair alone accepts that
 * pair anywhere, including on elements that had nothing to do with the issue —
 * a plain `<p>` in the site's brand colours would be waved through on any
 * allowlisted URL. The predicate pins the violation to the components that
 * actually produce it, and the count pins how many.
 *
 * Three tests enforce it (see `axe.spec.ts`):
 *
 *  1. Anything *not* matching an entry fails immediately.
 *  2. A URL carrying more (or fewer) matching nodes than declared fails too.
 *  3. Every entry must still reproduce on every URL it lists. Fix the issue and
 *     that third test goes red, which is the prompt to delete the entry.
 */
export interface KnownIssue {
  /** GitHub issue on svef/www that tracks the fix. */
  issue: number
  rule: string
  why: string
  /**
   * Visible URL → exactly how many nodes this issue is accepted for there.
   * A URL that is not a key is not allowed to carry the violation at all.
   */
  urls: Readonly<Record<string, number>>
  /** True when a single axe node is this known issue and not something new. */
  matches: (node: Node) => boolean
}

/**
 * Empty, and that is the point.
 *
 * The one entry this file ever held — svef/www#34, `--color-black` on
 * `--color-violet` in `Button.module.scss` `.primary` and
 * `ContactForm.module.scss` `.submit` — is gone because the violation is
 * fixed. It was never a design decision to make: the export writes those
 * buttons as `background:#8917E1;color:#FCFBFE`, so the implementation had
 * simply transcribed the wrong token. The guard tests in `axe.spec.ts` went
 * red the moment it was corrected, which is exactly what they are for.
 *
 * With nothing listed, every axe violation on every swept URL fails the run.
 * Keep it that way: an entry here is a debt, and it needs an issue number, a
 * predicate narrow enough to name the elements that produce it, and a count.
 */
export const KNOWN_ISSUES: readonly KnownIssue[] = []


export interface Triage {
  /** Violations that match a known, tracked issue on a URL that allows it. */
  known: KnownIssue[]
  /** Everything else, rendered for the failure message. */
  unexpected: string[]
}

/** Split an axe run into "tracked and accepted here" and "must fail the build". */
export function triage(violations: Result[], url: string): Triage {
  const known = new Set<KnownIssue>()
  const unexpected: string[] = []
  const seen = new Map<KnownIssue, number>()

  for (const violation of violations) {
    for (const node of violation.nodes) {
      const match = KNOWN_ISSUES.find(
        (issue) => issue.rule === violation.id && url in issue.urls && issue.matches(node),
      )
      if (match) {
        known.add(match)
        seen.set(match, (seen.get(match) ?? 0) + 1)
        continue
      }
      unexpected.push(describe(violation, node))
    }
  }

  // More matching nodes than declared means a new element picked up the same
  // colour pair — that is a new violation wearing the allowlist's clothes.
  for (const issue of KNOWN_ISSUES) {
    if (!(url in issue.urls)) continue
    const expected = issue.urls[url]
    const actual = seen.get(issue) ?? 0
    if (actual > expected) {
      unexpected.push(
        `[allowlist] svef/www#${issue.issue} (${issue.rule}) matched ${actual} nodes on ${url}, ` +
          `but only ${expected} ${expected === 1 ? 'is' : 'are'} accepted. A new element has ` +
          `picked up the same colour pair — fix it, or update the count in ` +
          `e2e/a11y/known-issues.ts with a reason.`,
      )
    }
  }

  return { known: [...known], unexpected }
}

function describe(violation: Result, node: Node): string {
  return [
    `[${violation.impact ?? 'unknown'}] ${violation.id}: ${violation.help}`,
    `  target: ${JSON.stringify(node.target)}`,
    `  html:   ${node.html.slice(0, 200)}`,
    `  more:   ${violation.helpUrl}`,
  ].join('\n')
}
