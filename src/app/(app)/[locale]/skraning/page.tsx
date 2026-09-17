import { notFound } from 'next/navigation'
import { getDictionary, isLocale } from '@/lib/i18n'
import { resolveContentLocale } from '@/lib/localized'
import { getMembership } from '@/lib/content/membership'
import { TranslationNote } from '@/components/TranslationNote/TranslationNote'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { Section } from '@/components/Section/Section'
import { TierCard } from '@/components/TierCard/TierCard'
import { MembershipForm } from '@/components/MembershipForm/MembershipForm'
import { membershipLocales } from '@/lib/content/membership-mapping'
import styles from './membership.module.scss'

/**
 * Statically prerendered for both locales (`generateStaticParams` lives in the
 * `[locale]` layout) and refreshed by ISR. No dynamic segment of its own, so
 * there is nothing else to generate.
 *
 * Five minutes, the site-wide figure: the fee and the tier benefits change
 * about once a year, so this page is a cached file in practice, and the number
 * is only about how long a treasurer who has just corrected the fee has to look
 * at the old one. The application panel below is a client component, which does
 * not make the route dynamic — it is prerendered with the page and hydrated.
 */
export const revalidate = 300

/**
 * The tier CTAs jump here; the form panel carries the same id. A bare fragment
 * rather than a path: the form is on this page, so linking to `/skraning#umsokn`
 * from `/skraning` would be a self-link — a full navigation for a scroll, and a
 * different href in each locale for the same destination.
 */
const FORM_ANCHOR = 'umsokn'

export default async function MembershipPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const t = getDictionary(locale)
  const membership = await getMembership(locale)
  const contentLocale = resolveContentLocale(membershipLocales(membership), locale)

  return (
    <>
      <TranslationNote pageLocale={locale} contentLocale={contentLocale} />
      <PageHeader title={t.membership.title} lead={membership.intro ?? undefined} />
      <Section>
        <div className={styles.tiers}>
          {membership.tiers.map((tier) => (
            <TierCard
              key={tier.name}
              name={tier.name}
              price={tier.price}
              priceNote={t.membership.perYear}
              benefits={tier.benefits.map((benefit) => benefit.text)}
              featured={tier.featured}
              ctaLabel={membership.ctaLabel ?? t.membership.form.title}
              ctaHref={`#${FORM_ANCHOR}`}
            />
          ))}
        </div>
      </Section>
      <Section className={styles.apply}>
        <MembershipForm
          id={FORM_ANCHOR}
          labels={t.membership.form}
          // `site-settings.contactEmail` is the source of truth and defaults to
          // this address; reading that global here would be a second query for
          // one string, so it is passed in and swapped for the read when the
          // site settings get a content module of their own.
          contactEmail="svef@svef.is"
        />
      </Section>
    </>
  )
}
