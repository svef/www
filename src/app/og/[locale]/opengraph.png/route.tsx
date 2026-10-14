import { notFound } from 'next/navigation'
import { LOCALES, isLocale } from '@/lib/i18n'
import { getLandingCopy } from '@/app/(landing)/content'
import { ogImage } from '@/lib/og'

/**
 * The Open Graph card, served from a real public URL.
 *
 * **Why a route handler and not Next's `opengraph-image` file convention.**
 * The convention puts the image beside the page that uses it, which for the
 * landing page means `/landing/<locale>/opengraph-image-<hash>`. That path is
 * internal — `/landing/*` is only ever reached by the proxy's rewrite — so the
 * proxy sees `landing` where it expects a locale and redirects the image away.
 * The card would have been a 307 to a page, which Slack and LinkedIn render as
 * no preview at all.
 *
 * This path survives because `src/proxy.ts` skips anything containing a dot, so
 * `/og/is/opengraph.png` reaches the handler untouched. That is also why the
 * segment is named with the extension rather than prettily.
 *
 * Pages point at it explicitly through `openGraph.images`, which means one
 * generator serves both the landing page now and the full site after the
 * cutover, with no second implementation and nothing to unpick.
 */
export const dynamicParams = false

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  // The meta title is the association's name, which the mark already says. The
  // description is the line worth reading in a feed.
  return ogImage({ title: getLandingCopy(locale).meta.description })
}
