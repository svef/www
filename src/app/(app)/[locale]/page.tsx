import { notFound } from 'next/navigation'
import Link from 'next/link'
import { isLocale } from '@/lib/i18n'
import { homeSeed } from '@/lib/homeSeed'
import { Hero } from '@/components/Hero/Hero'
import { Section } from '@/components/Section/Section'
import { SpotlightRow } from '@/components/SpotlightRow/SpotlightRow'
import { EventCard } from '@/components/EventCard/EventCard'
import { PhotoStrip } from '@/components/PhotoStrip/PhotoStrip'
import styles from './home.module.scss'

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const base = locale === 'en' ? '/en' : ''
  const withBase = (href: string) => `${base}${href}`
  const c = homeSeed[locale]

  return (
    <>
      <Hero
        eyebrow={c.hero.eyebrow}
        title={c.hero.title}
        lead={c.hero.lead}
        primary={{ label: c.hero.primary.label, href: withBase(c.hero.primary.href) }}
        secondary={{ label: c.hero.secondary.label, href: withBase(c.hero.secondary.href) }}
      />

      <Section eyebrow={c.spotlight.eyebrow}>
        <SpotlightRow
          title={c.spotlight.title}
          body={c.spotlight.body}
          primary={{ label: c.spotlight.primary.label, href: withBase(c.spotlight.primary.href) }}
          secondary={{
            label: c.spotlight.secondary.label,
            href: withBase(c.spotlight.secondary.href),
          }}
        />
      </Section>

      <Section title={c.sections.events}>
        <div className={styles.eventGrid}>
          {c.events.map((e, i) => (
            <EventCard
              key={e.title}
              title={e.title}
              dateLabel={e.dateLabel}
              location={e.location}
              href={withBase(e.href)}
              featured={i === 0}
            />
          ))}
        </div>
      </Section>

      <Section title={c.sections.photos}>
        <PhotoStrip />
        <p className={styles.photosMore}>
          <Link href={withBase('/myndir')} className={styles.moreLink}>
            {c.sections.allPhotos}
          </Link>
        </p>
      </Section>
    </>
  )
}
