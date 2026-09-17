import { cache } from 'react'
import { getPayload, publicReadArgs } from '@/lib/payload'
import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n'
import { pickLocalized, type AllLocales } from '@/lib/localized'
import type { SiteSetting } from '@/payload-types'

/**
 * Reading the `site-settings` global for the site chrome.
 *
 * The footer is on all sixteen pages, so what it shows is association-wide
 * content rather than page content: the blurb, the contact address and the
 * social profiles. Those belong to an editor, not to `layout.tsx`, which is
 * what this module moves them out of.
 *
 * Same split as `./news.ts` / `./news-mapping.ts`, collapsed into one file
 * because the shaping here is small: a `locale: 'all'` read has to be re-typed
 * at the boundary (Payload's generated types describe the resolved
 * single-locale shape), and the social group has to be turned into a list.
 */

/** The `site-settings` global as a `locale: 'all'` read actually returns it. */
type SiteSettingsAllLocales = Omit<SiteSetting, 'tagline' | 'footerBlurb'> & {
  tagline: AllLocales<string>
  footerBlurb: AllLocales<string>
}

export interface SocialLink {
  /** Two-letter mark the footer shows, as the design draws it. */
  short: string
  /** The network's name, for the accessible name. */
  name: string
  href: string
}

export interface SiteChrome {
  /**
   * The footer blurb, or `null` when the global has no blurb in any language.
   *
   * Resolved through `pickLocalized` like every other localized field, so an
   * English page with no English blurb shows the Icelandic one. Both languages
   * are seeded (`siteSettingsEn` in `seed-data.ts`), so in practice the
   * fallback is a safety net rather than the normal path — and that is the
   * point. The footer is on all sixteen pages; sourcing its English half from a
   * source file no editor can open would mean rewriting the blurb in the admin
   * changed every Icelandic page and silently changed nothing in English.
   *
   * `null` is the empty-database case only, and the caller substitutes the
   * dictionary's sentence so a fresh checkout still renders a footer.
   */
  footerBlurb: string | null
  /**
   * The language `footerBlurb` is actually written in.
   *
   * Reported for the same reason `NewsSummary.contentLocale` is: fallback copy
   * is marked with `lang` rather than presented as the page's language. There
   * is no `TranslationNote` to go with it — that belongs to the page's own
   * content, inside `<main>`, and the footer is chrome.
   */
  footerBlurbLocale: Locale
  contactEmail: string
  /** Only the networks that have a real URL; see `toSocialLink`. */
  socials: SocialLink[]
}

const NETWORKS = [
  { field: 'facebook', short: 'FB', name: 'Facebook' },
  { field: 'instagram', short: 'IG', name: 'Instagram' },
  { field: 'x', short: 'X', name: 'X' },
  { field: 'linkedin', short: 'LI', name: 'LinkedIn' },
] as const satisfies readonly { field: keyof NonNullable<SiteSetting['social']>; short: string; name: string }[]

/** Fallback address, matching the field's `defaultValue`. */
const FALLBACK_EMAIL = 'svef@svef.is'

/**
 * A social field is a link only when it is an absolute URL.
 *
 * The four fields are plain text and every one of them is empty today — the
 * design export draws FB / IG / X / LI but carries no URLs, so the seed leaves
 * them null rather than guessing at profiles. Anything that is not an
 * `http(s)` URL is therefore dropped rather than rendered: a blank field, a
 * stray space, or a half-typed `facebook.com/svef` would otherwise each become
 * a link that goes nowhere, which is the exact placeholder this replaces.
 */
function toSocialLink(network: (typeof NETWORKS)[number], raw: unknown): SocialLink | null {
  if (typeof raw !== 'string') return null
  const href = raw.trim()
  if (!/^https?:\/\/\S+$/i.test(href)) return null
  return { short: network.short, name: network.name, href }
}

/**
 * Site-wide chrome content, cached per request.
 *
 * One caller today — the `[locale]` layout — so the cache buys nothing yet. It
 * is here because this global is the natural home for anything association-wide
 * and the second caller is already named: the contact page repeats the footer's
 * address and social icons as `href="#"` placeholders, and svef/www#23 moves
 * them onto this read. When it does, the layout renders above the page, so the
 * two reads land in the same render and the cache is what keeps them one query.
 */
export const getSiteChrome = cache(async function getSiteChrome(
  locale: Locale,
): Promise<SiteChrome> {
  const payload = await getPayload()
  const settings = (await payload.findGlobal({
    slug: 'site-settings',
    ...publicReadArgs,
  })) as unknown as SiteSettingsAllLocales

  // `pickLocalized` already treats `''` — what Payload writes for a field
  // opened in the admin and left blank — as missing.
  const blurb = pickLocalized(settings.footerBlurb, locale)
  const email = settings.contactEmail?.trim()

  return {
    footerBlurb: blurb.value?.trim() ? blurb.value : null,
    footerBlurbLocale: blurb.value?.trim() ? blurb.locale : DEFAULT_LOCALE,
    contactEmail: email || FALLBACK_EMAIL,
    socials: NETWORKS.map((network) =>
      toSocialLink(network, settings.social?.[network.field]),
    ).filter((link): link is SocialLink => link !== null),
  }
})
