import { NextRequest, NextResponse } from 'next/server'
import { LANDING_ONLY } from '@/lib/site-mode'

// Next.js 16 Proxy (formerly middleware). Icelandic is served at the root
// (unprefixed); English lives under /en. Internally every request maps to a
// `[locale]` segment: /foo → rewrite to /is/foo (URL stays clean), /en/foo →
// served as-is. /is/* is canonicalised back to /*.
//
// Because the rewrite changes the shape of the path, a URL here does not
// describe its own route, and the App Router client cannot work one out
// without asking the server. That is why `experimental.optimisticRouting` is
// turned off in `next.config.ts` — see the comment there (svef/www#60).
//
// Note that this cannot be handled by branching on the request instead: Next
// strips the Flight headers (`RSC`, `Next-Router-Prefetch`,
// `Next-Router-Segment-Prefetch`) from `request.headers` in Proxy by design, so
// an RSC prefetch is indistinguishable from a document request in here.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Landing mode (main branch): serve the one-pager at `/`, hide the WIP full site by
  // redirecting every other (non-asset) path to `/`. `dev` sets LANDING_ONLY=false.
  if (LANDING_ONLY) {
    if (pathname === '/') return NextResponse.next()
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  if (pathname === '/en' || pathname.startsWith('/en/')) {
    return NextResponse.next()
  }

  // Never expose the internal /is prefix — redirect to the clean root form.
  if (pathname === '/is' || pathname.startsWith('/is/')) {
    const url = request.nextUrl.clone()
    url.pathname = pathname.replace(/^\/is/, '') || '/'
    return NextResponse.redirect(url)
  }

  const url = request.nextUrl.clone()
  url.pathname = `/is${pathname === '/' ? '' : pathname}`
  return NextResponse.rewrite(url)
}

export const config = {
  // Skip Payload admin/api, Next internals, and static files.
  matcher: ['/((?!admin|api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
