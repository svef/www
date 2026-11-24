import type { Page } from '@playwright/test'
import { isHiddenPath, localePath, toInternalSegment } from '../src/lib/i18n'

export const LOCALES = ['is', 'en'] as const
export type Locale = (typeof LOCALES)[number]

/**
 * Every public route the site currently has, with the `<h1>` each one renders
 * in each locale. The path is written in its **Icelandic** form, which is also
 * the directory on disk; `urlFor` turns it into the visible URL for a locale,
 * so the English rows come out as `/en/events` and the like. `''` means the
 * front page.
 *
 * Adding a page to `src/app/(app)/[locale]/` means adding it here — that is the
 * point: the smoke, heading-outline and axe sweeps all iterate this table, so a
 * new page is covered the moment it is listed.
 *
 * A page switched off in `HIDDEN_PAGES` (src/lib/i18n/routes.ts) **stays in this
 * table** — it still exists on disk, which `routes.spec.ts` checks. What changes
 * is which sweep it is in: `VISIBLE_PAGES` / `everyPage()` leave it out, and
 * `HIDDEN_PAGE_SPECS` / `everyHiddenPage()` expect it to 404. Un-hiding it in the
 * app moves it back with no edit here.
 */
export const PAGES = [
  {
    path: '',
    name: 'home',
    h1: {
      is: 'Félag fólksins sem býr til vefinn á Íslandi.',
      en: 'The people who build the web in Iceland.',
    },
  },
  {
    path: '/vidburdir',
    name: 'events',
    h1: { is: 'Viðburðir', en: 'Events' },
  },
  {
    path: '/vefverdlaunin',
    name: 'awards',
    h1: { is: 'Íslensku vefverðlaunin', en: 'The Icelandic Web Awards' },
  },
  {
    path: '/um-svef',
    name: 'about',
    h1: { is: 'Um SVEF', en: 'About SVEF' },
  },
  {
    path: '/stjorn',
    name: 'board',
    h1: { is: 'Stjórn SVEF', en: 'The board' },
  },
  {
    path: '/log-svef',
    name: 'bylaws',
    h1: { is: 'Lög SVEF', en: 'Bylaws' },
  },
  {
    path: '/spurt-og-svarad',
    name: 'faq',
    h1: { is: 'Spurt og svarað', en: 'FAQ' },
  },
  {
    path: '/skraning',
    name: 'membership',
    h1: { is: 'Skráning', en: 'Membership' },
  },
  {
    path: '/hafa-samband',
    name: 'contact',
    h1: { is: 'Hafa samband', en: 'Contact' },
  },
  {
    path: '/frettir',
    name: 'news',
    h1: { is: 'Fréttir', en: 'News' },
  },
  {
    path: '/myndir',
    name: 'photos',
    h1: { is: 'Myndir', en: 'Photos' },
  },
  {
    path: '/innsendingar',
    name: 'submissions',
    h1: { is: 'Innsendingar', en: 'Submissions' },
  },
  // Starting a project. Signed out (as every sweep sees it) it shows the sign-in notice;
  // the signed-in flow is covered by `project-form.spec.ts`.
  {
    path: '/innsendingar/ny',
    name: 'new submission',
    h1: { is: 'Skráðu þig inn til að halda áfram', en: 'Sign in to continue' },
  },
  // The two public forms, linked from the footer. They are not in
  // `ROUTE_SEGMENTS`, so their path is the same in both locales
  // (`/en/abendingar`), and they are the pages that stay reachable while
  // `LANDING_ONLY` is set (see `LANDING_PAGES` in src/proxy.ts).
  {
    path: '/abendingar',
    name: 'feedback',
    h1: { is: 'Ábendingar', en: 'Feedback' },
  },
  {
    path: '/erindi',
    name: 'talk proposal',
    h1: { is: 'Bjóða fram erindi', en: 'Propose a talk' },
  },
  // Awards accounts (svef/www#158). Their own spec (account.spec.ts) drives the flows.
  {
    path: '/nyskraning',
    name: 'sign up',
    h1: { is: 'Nýskráning', en: 'Sign up' },
  },
  {
    path: '/innskraning',
    name: 'sign in',
    h1: { is: 'Innskráning', en: 'Sign in' },
  },
  {
    path: '/gleymt-lykilord',
    name: 'forgot password',
    h1: { is: 'Gleymt lykilorð', en: 'Forgot your password' },
  },
  {
    path: '/endurstilla-lykilord',
    name: 'reset password',
    h1: { is: 'Nýtt lykilorð', en: 'Choose a new password' },
  },
  {
    path: '/stadfesta-netfang',
    name: 'verify email',
    h1: { is: 'Staðfesting netfangs', en: 'Email confirmation' },
  },
] as const

export type PageSpec = (typeof PAGES)[number]

/** Whether the app currently serves this page as a 404 (see `HIDDEN_PAGES`). */
export function isHiddenSpec(spec: PageSpec): boolean {
  return isHiddenPath(spec.path)
}

/** The pages the site serves. Every content sweep iterates these. */
export const VISIBLE_PAGES: readonly PageSpec[] = PAGES.filter((spec) => !isHiddenSpec(spec))

/** The pages that are built but switched off, and so must answer 404. */
export const HIDDEN_PAGE_SPECS: readonly PageSpec[] = PAGES.filter(isHiddenSpec)

/**
 * Routes with a dynamic segment. They cannot be listed in `PAGES` as a fixed
 * path, so they are declared here and covered by the spec that owns them
 * (`article.spec.ts` for the news article route), which resolves a real slug at
 * runtime rather than hard-coding one from the fixtures.
 *
 * Declaring one is not optional: `routes.spec.ts` walks the app directory and
 * fails on any route that is in neither table, and `links.spec.ts` treats a link
 * into an undeclared shape as a dead link.
 */
export interface DynamicRoute {
  /** The route as it appears on disk, e.g. `/frettir/[slug]`. */
  pattern: string
  name: string
  /** Does this locale-stripped path belong to this route? */
  matches: (path: string) => boolean
}

export const DYNAMIC_ROUTES: readonly DynamicRoute[] = [
  {
    pattern: '/frettir/[slug]',
    name: 'news article',
    matches: (path) => /^\/frettir\/[^/]+$/.test(path),
  },
  {
    pattern: '/vidburdir/[slug]',
    name: 'event',
    matches: (path) => /^\/vidburdir\/[^/]+$/.test(path),
  },
  // A signed-in person's project. Covered by `project-form.spec.ts`, which creates one.
  // `ny`/`new` and `minar`/`mine` are fixed sub-pages, not ids.
  {
    pattern: '/innsendingar/[id]',
    name: 'project form',
    matches: (path) => /^\/innsendingar\/(?!(ny|new|minar|mine)$)[^/]+$/.test(path),
  },
]

/**
 * Visible URL for a page in a locale.
 *
 * Deferred to the app's own `localePath` rather than reimplemented, so the
 * suite cannot disagree with the site about where a page lives — which it did
 * when both the locale prefix and the page names changed under it.
 */
export function urlFor(locale: Locale, path: string): string {
  return localePath(path === '' ? '/' : path, locale)
}

/**
 * The hrefs in `<main>` that belong to a dynamic route (`/frettir/[slug]`,
 * `/vidburdir/[slug]`), in document order.
 *
 * Matched by route rather than by a regex on the visible URL, because the
 * visible URL depends on the locale (`/is/vidburdir/x`, `/en/events/x`) and the
 * route table already knows how to undo that.
 */
export async function dynamicHrefsInMain(page: Page, pattern: string): Promise<string[]> {
  const hrefs = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLAnchorElement>('main#main a[href]')).map(
      (a) => a.getAttribute('href') ?? '',
    ),
  )
  return hrefs.filter((href) => dynamicRouteFor(href)?.pattern === pattern)
}

/** Every (locale, served page) pair, flattened for `for (const … of …)` in a spec. */
export function everyPage(): { locale: Locale; page: PageSpec; url: string }[] {
  return LOCALES.flatMap((locale) =>
    VISIBLE_PAGES.map((page) => ({ locale, page, url: urlFor(locale, page.path) })),
  )
}

/** Every (locale, hidden page) pair: the URLs that must 404 while hidden. */
export function everyHiddenPage(): { locale: Locale; page: PageSpec; url: string }[] {
  return LOCALES.flatMap((locale) =>
    HIDDEN_PAGE_SPECS.map((page) => ({ locale, page, url: urlFor(locale, page.path) })),
  )
}

/** One console error or uncaught page error, with where it came from. */
export interface PageProblem {
  kind: 'console' | 'pageerror'
  text: string
  /** The resource the message points at — for "Failed to load resource", the URL that failed. */
  url: string
}

/**
 * Collect console errors and uncaught page errors for the lifetime of a page.
 *
 * Attach this *before* the first navigation, otherwise anything logged during
 * the initial load is missed and the assertion passes for the wrong reason.
 *
 * Pair it with `settle()` before asserting. `page.goto()` resolves on `load`,
 * which is roughly 200ms into the page's life — an error thrown by a client
 * component a moment later would be logged *after* the assertion had already
 * run, so the test would pass for the wrong reason (and, being a race, would
 * pass or fail differently on CI than on a laptop).
 *
 * The source URL is captured as well as the text, because "Failed to load
 * resource: … 404" says nothing on its own about *which* resource — and an
 * allowlist that cannot tell them apart would accept every 404 on the page.
 */
export function collectPageErrors(page: Page): PageProblem[] {
  const errors: PageProblem[] = []
  page.on('console', (message) => {
    if (message.type() !== 'error') return
    errors.push({ kind: 'console', text: message.text(), url: message.location().url })
  })
  page.on('pageerror', (error) => {
    errors.push({ kind: 'pageerror', text: error.message, url: '' })
  })
  return errors
}

/** One-line rendering of a problem, for a failure message. */
export function describeProblem(problem: PageProblem): string {
  return `${problem.kind}: ${problem.text}${problem.url ? ` (${problem.url})` : ''}`
}

/** How long to give a page to go quiet before asserting anyway. */
const SETTLE_TIMEOUT_MS = 5_000

/**
 * Wait until the page has stopped doing things, so an assertion made after this
 * is about the settled page rather than about whatever had happened by `load`.
 *
 * `networkidle` covers hydration and any fetch a client component fires on
 * mount. It is explicitly *not* a fixed sleep: those are what make a suite pass
 * locally and fail on a slower CI runner.
 *
 * Reaching idle is deliberately **not** an assertion. A page that keeps retrying
 * a failing request never goes idle, and a bare `waitForLoadState` would then
 * fail the test with "Test timeout of 30000ms exceeded" — burying the actual
 * problem, which the next assertion is about to report precisely. So: give it a
 * bounded chance to settle, then get on with it either way.
 */
export async function settle(page: Page): Promise<void> {
  await page
    .waitForLoadState('networkidle', { timeout: SETTLE_TIMEOUT_MS })
    .catch(() => undefined)
  // The home hero's words fade in and morph for about three seconds; a check that runs
  // mid-animation measures half-transparent text. It marks itself settled when it is done.
  await page
    .locator('[data-hero]:not([data-hero="settled"])')
    .waitFor({ state: 'detached', timeout: SETTLE_TIMEOUT_MS })
    .catch(() => undefined)
}

/** Every visible URL the static route table claims exists and serves, both locales. */
export function allKnownUrls(): string[] {
  return everyPage().map(({ url }) => url)
}

/**
 * Reduce a visible URL to the Icelandic form the tables are written in, so
 * `/en/news/x` and `/is/frettir/x` compare equal. Pages are named in the
 * reader's language, so dropping the prefix is no longer enough — the page's
 * own name has to come back too.
 */
export function stripLocale(path: string): string {
  const withoutLocale = path.replace(/^\/(is|en)(?=\/|$)/, '')
  if (withoutLocale === '' || withoutLocale === '/') return ''
  const [, head = '', ...rest] = withoutLocale.split('/')
  return `/${[toInternalSegment(head) ?? head, ...rest].join('/')}`
}

/** The dynamic route a path belongs to, if any. */
export function dynamicRouteFor(path: string): DynamicRoute | undefined {
  const bare = stripLocale(path)
  return DYNAMIC_ROUTES.find((route) => route.matches(bare))
}
