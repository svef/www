import { pickLocalized, type AllLocales } from '@/lib/localized'
import type { Locale } from '@/lib/i18n'
import type { MembershipPage } from '@/payload-types'

/**
 * Shaping the `membership-page` global into what /skraning renders.
 *
 * Pure, for the same two reasons as `./news-mapping.ts`: a `locale: 'all'` read
 * comes back in a shape Payload's generated types do not describe and has to be
 * re-typed at one boundary, and resolving the fallback is a decision the page
 * marks up with `lang` rather than a lookup. See that file's header.
 */

type TierArray = NonNullable<MembershipPage['tiers']>[number]
type BenefitArray = NonNullable<TierArray['benefits']>[number]

/** The `membership-page` global as a `locale: 'all'` read actually returns it. */
export type MembershipAllLocales = Omit<
  MembershipPage,
  'intro' | 'signupCtaLabel' | 'tiers'
> & {
  intro: AllLocales<string>
  signupCtaLabel: AllLocales<string>
  tiers?:
    | (Omit<TierArray, 'name' | 'ctaLabel' | 'benefits'> & {
        name: AllLocales<string>
        ctaLabel: AllLocales<string>
        benefits?: (Omit<BenefitArray, 'benefit'> & { benefit: AllLocales<string> })[] | null
      })[]
    | null
}

export type MembershipBenefit = {
  text: string
  /** The language `text` is written in — `is` where English is missing. */
  locale: Locale
}

export type MembershipTier = {
  name: string
  nameLocale: Locale
  /** The tier's own CTA, or the page-wide one when the tier has none. */
  ctaLabel: string
  ctaLabelLocale: Locale
  /** Already formatted for the locale, e.g. `23.900 kr.` / `23,900 ISK`. */
  price: string
  benefits: MembershipBenefit[]
  featured: boolean
}

export type Membership = {
  intro: string | null
  introLocale: Locale
  ctaLabel: string | null
  ctaLabelLocale: Locale
  tiers: MembershipTier[]
}

/**
 * The annual fee, written the way each language writes money.
 *
 * `priceISK` is a plain number in the CMS rather than a string per locale,
 * because the fee is one fact and an editor changing it should not have to
 * remember to change it twice — and typing `23.900` into an English field is
 * exactly the kind of slip that produces a site quoting two different prices.
 * That means the grouping separator and the currency word are the site's job:
 * Icelandic writes `23.900 kr.`, English `23,900 ISK`.
 *
 * `Intl.NumberFormat` with `style: 'currency'` is deliberately not used. For
 * `is-IS` it produces `23.900 ISK` and for `en` a `ISK 23,900` with the symbol
 * leading — neither is what the design writes, and the currency word is not a
 * number-formatting decision here but a copy decision.
 */
export function formatFee(priceISK: number, locale: Locale): string {
  const amount = new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'is-IS', {
    maximumFractionDigits: 0,
  }).format(priceISK)
  return locale === 'en' ? `${amount} ISK` : `${amount} kr.`
}

export function toMembership(doc: MembershipAllLocales, locale: Locale): Membership {
  const intro = pickLocalized(doc.intro, locale)
  const ctaLabel = pickLocalized(doc.signupCtaLabel, locale)

  return {
    intro: intro.value,
    introLocale: intro.value ? intro.locale : locale,
    ctaLabel: ctaLabel.value,
    ctaLabelLocale: ctaLabel.value ? ctaLabel.locale : locale,
    tiers: (doc.tiers ?? []).map((tier) => {
      const name = pickLocalized(tier.name, locale)
      // A tier with no CTA of its own falls back to the page-wide label rather
      // than rendering a button with no words on it.
      const tierCta = pickLocalized(tier.ctaLabel, locale)
      const cta = tierCta.value ? tierCta : ctaLabel
      return {
        name: name.value ?? '',
        nameLocale: name.locale,
        ctaLabel: cta.value ?? '',
        ctaLabelLocale: cta.value ? cta.locale : locale,
        price: formatFee(tier.priceISK, locale),
        featured: Boolean(tier.featured),
        benefits: (tier.benefits ?? [])
          .map((row) => {
            const benefit = pickLocalized(row.benefit, locale)
            return { text: benefit.value ?? '', locale: benefit.locale }
          })
          .filter((benefit) => benefit.text !== ''),
      }
    }),
  }
}

/**
 * Every locale the resolved content actually ended up in.
 *
 * Fed to `resolveContentLocale`, which decides whether the page shows the
 * English reader the translation note. A tier name or a single benefit still
 * in Icelandic is enough: the note explains the whole page, and half a page of
 * untranslated bullet points needs it as much as all of it.
 */
export function membershipLocales(membership: Membership): Locale[] {
  return [
    membership.introLocale,
    membership.ctaLabelLocale,
    ...membership.tiers.flatMap((tier) => [
      tier.nameLocale,
      tier.ctaLabelLocale,
      ...tier.benefits.map((benefit) => benefit.locale),
    ]),
  ]
}
