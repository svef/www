import { cache } from 'react'
import { getPayload, publicReadArgs } from '@/lib/payload'
import type { Locale } from '@/lib/i18n'
import type { AllLocales } from '@/lib/localized'
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
   * The footer blurb for this locale, or `null` when the editor has not written
   * one in it.
   *
   * Deliberately *not* run through `pickLocalized`: everywhere else an
   * untranslated field falls back to Icelandic and the page says so with `lang`
   * and a `TranslationNote`. That is right for an article, and wrong for the
   * footer of every English page — the chrome is not the page's content, and
   * there is a perfectly good English sentence in the dictionary. So the caller
   * gets `null` and substitutes its own copy. The Icelandic text is still
   * reachable: it is what an Icelandic read returns.
   */
  footerBlurb: string | null
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
 * The cache matters here: this is called from the `[locale]` layout, which
 * renders above every page, and the contact page reads the same global for the
 * socials it shows in its body. One query per render either way.
 */
export const getSiteChrome = cache(async function getSiteChrome(
  locale: Locale,
): Promise<SiteChrome> {
  const payload = await getPayload()
  const settings = (await payload.findGlobal({
    slug: 'site-settings',
    ...publicReadArgs,
  })) as unknown as SiteSettingsAllLocales

  const blurb = settings.footerBlurb?.[locale]
  const email = settings.contactEmail?.trim()

  return {
    footerBlurb: typeof blurb === 'string' && blurb.trim() !== '' ? blurb : null,
    contactEmail: email || FALLBACK_EMAIL,
    socials: NETWORKS.map((network) =>
      toSocialLink(network, settings.social?.[network.field]),
    ).filter((link): link is SocialLink => link !== null),
  }
})
