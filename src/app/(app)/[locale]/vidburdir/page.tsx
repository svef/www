import { notFound } from 'next/navigation'
import { isLocale, type Locale } from '@/lib/i18n'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { Section } from '@/components/Section/Section'
import { SpotlightRow } from '@/components/SpotlightRow/SpotlightRow'
import { EventRow } from '@/components/EventRow/EventRow'

// Seed content — replaced by the Events collection once populated.
const content: Record<
  Locale,
  {
    title: string
    lead: string
    featuredEyebrow: string
    featured: { title: string; body: string; primary: string; secondary: string }
    upcomingTitle: string
    cta: string
    events: { day: string; month: string; title: string; description: string }[]
  }
> = {
  is: {
    title: 'Viðburðir',
    lead: 'Fyrirlestrar, vinnustofur og hátíðir fyrir fólkið í vefiðnaðinum. Félagar komast frítt á alla viðburði nema vefverðlaunin.',
    featuredEyebrow: 'Næsti viðburður',
    featured: {
      title: 'Íslensku vefverðlaunin 2026',
      body: '14. nóv 2026 · 19:30 · Harpa, Reykjavík — hátíðarkvöld og verðlaunaafhending í 13 flokkum.',
      primary: 'Kaupa miða',
      secondary: 'Um viðburðinn →',
    },
    upcomingTitle: 'Framundan',
    cta: 'Nánar',
    events: [
      { day: '09', month: 'okt', title: 'Klúðurkvöld', description: 'Grandi 101 · 20:00 — afslappað kvöld um að læra af mistökum.' },
      { day: '21', month: 'sep', title: 'Hádegisfyrirlestur: Aðgengi í raunheimum', description: 'Zoom · 12:00 — hvernig WCAG lítur út í daglegri vinnu.' },
      { day: '05', month: 'sep', title: 'Vinnustofa: Hönnunarkerfi frá grunni', description: 'Kvosin · 13:00 — hálfsdagsvinnustofa, 20 sæti.' },
    ],
  },
  en: {
    title: 'Events',
    lead: 'Talks, workshops and celebrations for the web industry. Members attend all events free, except the Web Awards.',
    featuredEyebrow: 'Next event',
    featured: {
      title: 'The Icelandic Web Awards 2026',
      body: 'Nov 14, 2026 · 19:30 · Harpa, Reykjavík — a gala evening and awards ceremony across 13 categories.',
      primary: 'Buy tickets',
      secondary: 'About the event →',
    },
    upcomingTitle: 'Upcoming',
    cta: 'Details',
    events: [
      { day: '09', month: 'oct', title: 'Klúðurkvöld (Mistakes Night)', description: 'Grandi 101 · 20:00 — a relaxed evening about learning from mistakes.' },
      { day: '21', month: 'sep', title: 'Lunch talk: Accessibility in the real world', description: 'Zoom · 12:00 — what WCAG looks like in daily work.' },
      { day: '05', month: 'sep', title: 'Workshop: Design systems from scratch', description: 'Kvosin · 13:00 — half-day workshop, 20 seats.' },
    ],
  },
}

export default async function EventsPage({
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
      <Section eyebrow={c.featuredEyebrow}>
        <SpotlightRow
          title={c.featured.title}
          body={c.featured.body}
          primary={{ label: c.featured.primary, href: `${base}/vefverdlaunin` }}
          secondary={{ label: c.featured.secondary, href: `${base}/vidburdir` }}
        />
      </Section>
      <Section title={c.upcomingTitle}>
        <div>
          {c.events.map((e) => (
            <EventRow
              key={e.title}
              day={e.day}
              month={e.month}
              title={e.title}
              description={e.description}
              href={`${base}/vidburdir`}
              ctaLabel={c.cta}
            />
          ))}
        </div>
      </Section>
    </>
  )
}
