import { notFound } from 'next/navigation'
import { LOCALES, isLocale } from '@/lib/i18n'
import { CARD_KEYS, isCardKey } from '@/lib/og/cards'
import { renderCard } from '@/lib/og/card'

/**
 * The Open Graph cards, at `/og/<locale>/<page>.png`: one per public page, per language.
 *
 * **Why a route handler and not Next's `opengraph-image` file convention.** The convention
 * puts the image beside the page that uses it. For the landing page that is
 * `/landing/<locale>/opengraph-image-<hash>`, an internal path only the proxy's rewrite
 * reaches, so the proxy reads `landing` where it expects a locale and redirects the image
 * away: a 307 to a page, which every scraper renders as no preview at all. For the English
 * pages it is `/en/vidburdir/opengraph-image-…`, the Icelandic directory name, which the
 * proxy also redirects. The build gives no hint of either.
 *
 * This path survives because `src/proxy.ts` skips any path containing a dot (its matcher),
 * in either state of `LANDING_ONLY`, so the card reaches this handler untouched. That is
 * why the last segment carries the extension. `src/lib/og/og.test.ts` holds the matcher to it.
 *
 * Every card is prerendered at build time; anything else is a 404.
 */
export const dynamicParams = false

export function generateStaticParams() {
  return LOCALES.flatMap((locale) =>
    CARD_KEYS.map((key) => ({ locale, card: `${key}.png` })),
  )
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string; card: string }> },
) {
  const { locale, card } = await params
  const key = card.replace(/\.png$/, '')
  if (!isLocale(locale) || !card.endsWith('.png') || !isCardKey(key)) notFound()
  return renderCard(key, locale)
}
