import type { Metadata } from 'next'
import { getDictionary, isLocale, type Locale } from '@/lib/i18n'
import { CARDS, OG_SIZE, cardPagePath, cardUrl, type CardKey } from './cards'

const OG_LOCALE: Record<Locale, string> = { is: 'is_IS', en: 'en_GB' }

/**
 * The `openGraph` and `twitter` fields for a public page: its card, its title and a line to
 * go with it.
 *
 * Next merges metadata shallowly, so a page that sets `openGraph` replaces its layout's
 * whole object rather than adding to it. Every field a preview needs is therefore set here
 * every time, not left to the layout.
 */
export function socialMetadata({
  locale,
  card,
  title,
  description,
  path,
  image,
}: {
  locale: Locale
  card: CardKey
  /** The preview's headline. Defaults to the site's name. */
  title?: string
  /** The preview's line. Defaults to the site's description. */
  description?: string
  /** The page's visible URL, for `og:url`. Left out, scrapers use the URL they fetched. */
  path?: string
  /**
   * A picture of the page's own to use instead of the card: a news article's cover. A
   * size is passed on only when known; scrapers measure the image otherwise.
   */
  image?: { url: string; alt: string; width?: number | null; height?: number | null }
}): Pick<Metadata, 'openGraph' | 'twitter'> {
  const meta = getDictionary(locale).meta
  const ogTitle = title ? `${title} | SVEF` : meta.title
  const ogDescription = description ?? meta.description
  const picture = image
    ? {
        url: image.url,
        alt: image.alt || ogTitle,
        ...(image.width && image.height
          ? { width: image.width, height: image.height }
          : {}),
      }
    : { url: cardUrl(card, locale), ...OG_SIZE, alt: ogTitle }
  return {
    openGraph: {
      type: 'website',
      siteName: 'SVEF',
      locale: OG_LOCALE[locale],
      ...(path ? { url: path } : {}),
      title: ogTitle,
      description: ogDescription,
      images: [picture],
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description: ogDescription,
      images: [picture],
    },
  }
}

/**
 * `generateMetadata` for a fixed public page: its title, and its card.
 *
 *     export const generateMetadata = cardMetadata('vidburdir')
 *
 * The title is the card's headline, which is the page's own `<h1>` (`CARDS`).
 */
export function cardMetadata(card: Exclude<CardKey, 'forsida'>) {
  return async function generateMetadata({
    params,
  }: {
    params: Promise<{ locale: string }>
  }): Promise<Metadata> {
    const { locale } = await params
    if (!isLocale(locale)) return {}
    const title = CARDS[card].lines(locale).join(' ')
    return {
      title,
      ...socialMetadata({ locale, card, title, path: cardPagePath(card, locale) }),
    }
  }
}
