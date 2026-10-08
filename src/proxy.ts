import { NextRequest, NextResponse } from 'next/server'
import { LANDING_ONLY } from '@/lib/site-mode'
import { DEFAULT_LOCALE, isLocale, localePath, toInternalSegment, toPublicSegment } from '@/lib/i18n'

// Next.js 16 Proxy (formerly middleware).
//
// Every page lives under an explicit locale prefix: /is for Icelandic, /en for
// English. The root is not a page — it only decides which language to send you
// to. That decision is permanent routing: `LANDING_ONLY` changes *what* renders
// at a locale, never *where* things live, so these URLs survive the cutover from
// the landing page to the full site untouched.

/**
 * Pages that exist while `LANDING_ONLY` is set, beyond the landing page itself.
 *
 * Keyed on the directory name under `(app)/[locale]/`, which is also the path.
 * The list is what goes away at the cutover, not the pages — they already live
 * where they will live afterwards.
 */
const LANDING_PAGES = new Set(['abendingar', 'erindi'])

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone()
    url.pathname = path
    return NextResponse.redirect(url)
  }

  // The root's only job is choosing a language.
  //
  // For now that choice is always Icelandic. Neither of the usual signals is
  // trustworthy here: SVEF serves one country, so geolocation says nothing about
  // which language a reader wants, and Icelanders commonly run their browser and
  // OS in English, so Accept-Language would send native speakers to the English
  // page. Something better can replace this; until then the default is explicit.
  if (pathname === '/') return redirectTo(`/${DEFAULT_LOCALE}`)

  const segment = pathname.split('/')[1]

  // A path with no locale on the front keeps the path and gains one, rather
  // than being thrown away at the front door: /vidburdir/eitthvad becomes
  // /is/vidburdir/eitthvad, so an old link or a hand-typed address still lands
  // on the page it names.
  //
  // The locale cannot be inferred from the path, because both locales use the
  // same slugs — /vidburdir is the English route as much as the Icelandic one.
  // So this uses the default, and the language toggle is one click away.
  //
  // What it does not do is pretend a path exists. `/is/nonsense` matches no
  // route and 404s, which is the honest answer for a URL that was never real;
  // redirecting those to the front page told the visitor their link worked
  // when it did not.
  if (!isLocale(segment)) return redirectTo(localePath(pathname, DEFAULT_LOCALE))

  // Landing mode (main branch): the one-pager is the only page that exists, so
  // any deeper path falls back to the locale root. The page itself is rendered
  // from /landing/<locale>, an internal path reached only by this rewrite — the
  // public URL stays /is or /en. When the full site ships, this block and the
  // (landing) route group go away together and `(app)/[locale]` serves the very
  // same URLs.
  if (LANDING_ONLY) {
    // A few real pages are reachable before the rest of the site is. They live
    // where they will live afterwards, under `(app)/[locale]`, so the cutover
    // moves nothing — it only drops this check.
    const page = pathname.split('/')[2]
    if (page && LANDING_PAGES.has(page) && pathname === `/${segment}/${page}`) {
      return NextResponse.next()
    }

    if (pathname !== `/${segment}`) return redirectTo(`/${segment}`)
    const url = request.nextUrl.clone()
    url.pathname = `/landing/${segment}`
    return NextResponse.rewrite(url)
  }

  // Pages are named in the reader's language — /en/events, not /en/vidburdir —
  // while the directories on disk keep their Icelandic names. So the public name
  // is translated back to the directory and the request rewritten onto it; the
  // URL in the address bar does not change.
  const [, , page = '', ...rest] = pathname.split('/')
  const internal = toInternalSegment(page)

  if (internal) {
    // A page asked for by its name in the *other* language is a real page under
    // the wrong name. Send it to the right one rather than serving the same page
    // at two URLs.
    const expected = toPublicSegment(internal, segment)
    if (page !== expected) {
      return redirectTo(`/${segment}/${[expected, ...rest].join('/')}`)
    }

    if (internal !== page) {
      const url = request.nextUrl.clone()
      url.pathname = `/${segment}/${[internal, ...rest].join('/')}`
      return NextResponse.rewrite(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  // Skip Payload admin/api, Next internals, and static files.
  matcher: ['/((?!admin|api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
