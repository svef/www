import type { Page } from '@playwright/test'

export const LOCALES = ['is', 'en'] as const
export type Locale = (typeof LOCALES)[number]

/**
 * Every public route the site currently has, with the `<h1>` each one renders
 * in each locale. The path is the *visible* one: Icelandic is unprefixed and
 * English lives under `/en` (see `src/proxy.ts`), so `''` means `/` in
 * Icelandic and `/en` in English.
 *
 * Adding a page to `src/app/(app)/[locale]/` means adding it here — that is the
 * point: the smoke, heading-outline and axe sweeps all iterate this table, so a
 * new page is covered the moment it is listed.
 */
export const PAGES = [
  {
    path: '',
    name: 'home',
    h1: {
      is: 'Félag fólksins sem býr til vefinn á Íslandi.',
      en: 'The association of people who build the web in Iceland.',
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
] as const

export type PageSpec = (typeof PAGES)[number]

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
]

/** Visible URL for a page in a locale. Never emits the internal `/is` prefix. */
export function urlFor(locale: Locale, path: string): string {
  if (locale === 'en') return `/en${path}`
  return path === '' ? '/' : path
}

/** Every (locale, page) pair, flattened for `for (const … of …)` in a spec. */
export function everyPage(): { locale: Locale; page: PageSpec; url: string }[] {
  return LOCALES.flatMap((locale) =>
    PAGES.map((page) => ({ locale, page, url: urlFor(locale, page.path) })),
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
}

/** Every visible URL the static route table claims exists, both locales. */
export function allKnownUrls(): string[] {
  return everyPage().map(({ url }) => url)
}

/** Strip the visible locale prefix, so `/en/frettir/x` and `/frettir/x` compare equal. */
export function stripLocale(path: string): string {
  if (path === '/en') return ''
  return path.startsWith('/en/') ? path.slice(3) : path
}

/** The dynamic route a path belongs to, if any. */
export function dynamicRouteFor(path: string): DynamicRoute | undefined {
  const bare = stripLocale(path)
  return DYNAMIC_ROUTES.find((route) => route.matches(bare))
}
