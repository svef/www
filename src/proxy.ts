import { NextRequest, NextResponse } from 'next/server'
import { LANDING_ONLY } from '@/lib/site-mode'
import { DEFAULT_LOCALE, isLocale } from '@/lib/i18n'

// Next.js 16 Proxy (formerly middleware).
//
// Every page lives under an explicit locale prefix: /is for Icelandic, /en for
// English. The root is not a page — it only decides which language to send you
// to. That decision is permanent routing: `LANDING_ONLY` changes *what* renders
// at a locale, never *where* things live, so these URLs survive the cutover from
// the landing page to the full site untouched.
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

  // Anything not under a known locale goes to the default one.
  if (!isLocale(segment)) return redirectTo(`/${DEFAULT_LOCALE}`)

  // Landing mode (main branch): the one-pager is the only page that exists, so
  // any deeper path falls back to the locale root. The page itself is rendered
  // from /landing/<locale>, an internal path reached only by this rewrite — the
  // public URL stays /is or /en. When the full site ships, this block and the
  // (landing) route group go away together and `(app)/[locale]` serves the very
  // same URLs.
  if (LANDING_ONLY) {
    if (pathname !== `/${segment}`) return redirectTo(`/${segment}`)
    const url = request.nextUrl.clone()
    url.pathname = `/landing/${segment}`
    return NextResponse.rewrite(url)
  }

  return NextResponse.next()
}

export const config = {
  // Skip Payload admin/api, Next internals, and static files.
  matcher: ['/((?!admin|api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
