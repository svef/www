import { notFound } from 'next/navigation'
import { isLocale, type Locale } from '@/lib/i18n'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { Section } from '@/components/Section/Section'
import { TierCard } from '@/components/TierCard/TierCard'
import styles from './membership.module.scss'

const content: Record<
  Locale,
  {
    title: string
    lead: string
    perYear: string
    cta: string
    tiers: { name: string; price: string; benefits: string[]; featured?: boolean }[]
  }
> = {
  is: {
    title: 'Skráning',
    lead: 'Fyrirtæki og einstaklingar sem starfa í vefmálum á Íslandi geta gengið í SVEF. Félagsgjaldið stendur undir viðburðum og starfi samtakanna.',
    perYear: 'á ári',
    cta: 'Ganga í SVEF',
    tiers: [
      {
        name: 'Einstaklingsaðild',
        price: '23.900 kr.',
        benefits: [
          'Frítt á alla viðburði (nema vefverðlaunin)',
          '20% afsláttur af miðum á Íslensku vefverðlaunin',
        ],
      },
      {
        name: 'Fyrirtækjaaðild',
        price: '149.000 kr.',
        featured: true,
        benefits: [
          'Nær yfir alla starfsmenn fyrirtækisins',
          'Frítt á alla viðburði',
          '20% afsláttur af innsendingum og miðum',
          '5 frímiðar á Íslensku vefverðlaunin',
          'Forgangur á viðburði',
        ],
      },
    ],
  },
  en: {
    title: 'Membership',
    lead: 'Companies and individuals working with the web in Iceland can join SVEF. Membership fees fund the events and work of the association.',
    perYear: 'per year',
    cta: 'Join SVEF',
    tiers: [
      {
        name: 'Individual',
        price: '23,900 ISK',
        benefits: [
          'Free entry to all events (except the Web Awards)',
          '20% off Icelandic Web Awards tickets',
        ],
      },
      {
        name: 'Company',
        price: '149,000 ISK',
        featured: true,
        benefits: [
          'Covers all company employees',
          'Free entry to all events',
          '20% off submissions and tickets',
          '5 free Web Awards tickets',
          'Priority access to events',
        ],
      },
    ],
  },
}

export default async function MembershipPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const base = locale === 'en' ? '/en' : ''
  const c = content[locale]

  return (
    <>
      <PageHeader title={c.title} lead={c.lead} />
      <Section>
        <div className={styles.tiers}>
          {c.tiers.map((t) => (
            <TierCard
              key={t.name}
              name={t.name}
              price={t.price}
              priceNote={c.perYear}
              benefits={t.benefits}
              featured={t.featured}
              ctaLabel={c.cta}
              ctaHref={`${base}/hafa-samband`}
            />
          ))}
        </div>
      </Section>
    </>
  )
}
