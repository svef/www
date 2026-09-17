import type { Result } from 'axe-core'

type Node = Result['nodes'][number]

/**
 * Accepted, *tracked* axe violations.
 *
 * The rule here is deliberately narrow. A blanket `disableRules(['color-contrast'])`
 * would hide every future contrast regression as well as this one, and a suite
 * everybody learns to ignore is worse than no suite. So an entry names one rule,
 * one colour pair, *which elements* may carry it, the exact number of them on each
 * URL, and the issue that will remove it.
 *
 * The element predicate matters. Matching on the colour pair alone would accept
 * `--color-black` on `--color-violet` anywhere — and that is the site's most-used
 * brand combination, so a plain `<p>` in those colours would have been waved
 * through on any allowlisted URL. The predicate pins the violation to the two
 * components that actually produce it, and the count pins how many.
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

// `.primary` in Button.module.scss — `color: var(--color-black)` on
// `background: var(--color-violet)`.
const PRIMARY_BUTTON = /\bButton-module[\w-]*__primary\b/
// `.submit` in ContactForm.module.scss — a *separate* component that happens to
// set the same two tokens by hand. Fixing Button.module.scss alone leaves this one.
const CONTACT_SUBMIT = /\bContactForm-module[\w-]*__submit\b/

// #09060C on #8917E1 is 3.13:1, short of the 4.5:1 AA needs for text this size.
// It is a design-token decision rather than a page bug, so it is fixed once in #34.
//
// It reproduces on 4 routes × 2 locales = 8 URLs, and it comes from *two*
// components, not one:
//   - Button.module.scss `.primary`  — /, /vidburdir, /skraning (twice)
//   - ContactForm.module.scss `.submit` — /hafa-samband
// A fix to Button.module.scss alone would not clear /hafa-samband.
const VIOLET_ON_BLACK_CONTRAST: KnownIssue = {
  issue: 34,
  rule: 'color-contrast',
  why:
    '#09060C on #8917E1 is 3.13:1 (needs 4.5:1), from Button.module.scss `.primary` ' +
    'and ContactForm.module.scss `.submit`. Design-token fix, tracked in svef/www#34.',
  urls: {
    // Home renders two primary buttons ("Ganga í SVEF" and "Kaupa miða").
    '/': 2,
    '/vidburdir': 1,
    // The featured tier's CTA and the application form's submit button.
    '/skraning': 2,
    '/hafa-samband': 1,
    '/en': 2,
    '/en/vidburdir': 1,
    '/en/skraning': 2,
    '/en/hafa-samband': 1,
  },
  matches: (node) =>
    (PRIMARY_BUTTON.test(node.html) || CONTACT_SUBMIT.test(node.html)) &&
    node.any.some(
      (check) =>
        check.id === 'color-contrast' &&
        normaliseColour(check.data?.fgColor) === '#09060c' &&
        normaliseColour(check.data?.bgColor) === '#8917e1',
    ),
}

export const KNOWN_ISSUES: readonly KnownIssue[] = [VIOLET_ON_BLACK_CONTRAST]

function normaliseColour(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

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
