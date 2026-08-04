import { notFound } from 'next/navigation'
import Link from 'next/link'
import { isLocale, type Locale } from '@/lib/i18n'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { Section } from '@/components/Section/Section'
import { CategoryGrid } from '@/components/CategoryGrid/CategoryGrid'
import { Button } from '@/components/Button/Button'

const content: Record<
  Locale,
  {
    eyebrow: string
    title: string
    lead: string
    categoriesTitle: string
    categories: string[]
    archiveTitle: string
    archiveLead: string
    years: string[]
  }
> = {
  is: {
    eyebrow: 'Síðan 2000 · 26. árið',
    title: 'Íslensku vefverðlaunin',
    lead: 'Árleg verðlaun SVEF fyrir framúrskarandi vefi, öpp og stafrænar lausnir. Dómnefnd fagfólks metur innsendingar í 13 flokkum — og verðlaunin eru afhent í Hörpu.',
    categoriesTitle: 'Flokkar',
    categories: [
      'Vefur ársins',
      'Hönnun & viðmót',
      'Fyrirtækjavefur – lítið',
      'Fyrirtækjavefur – meðalstórt',
      'Fyrirtækjavefur – stórt',
      'Markaðsvefur',
      'Söluvefur',
      'Snjalllausn',
      'Vefkerfi',
      'App ársins',
      'Almannavefur',
      'Samfélagsvefur',
      'Aðgengi',
    ],
    archiveTitle: 'Safn verðlaunahafa',
    archiveLead: 'Skoðaðu verðlaunavefi fyrri ára.',
    years: ['2025', '2024', '2023'],
  },
  en: {
    eyebrow: 'Since 2000 · 26th year',
    title: 'The Icelandic Web Awards',
    lead: "SVEF's annual awards for outstanding websites, apps and digital solutions. A jury of professionals judges entries across 13 categories — and the awards are presented at Harpa.",
    categoriesTitle: 'Categories',
    categories: [
      'Site of the Year',
      'Design & Interface',
      'Corporate site – small',
      'Corporate site – medium',
      'Corporate site – large',
      'Marketing site',
      'Sales site',
      'Digital solution',
      'Web system',
      'App of the Year',
      'Public site',
      'Community site',
      'Accessibility',
    ],
    archiveTitle: 'Winners archive',
    archiveLead: 'Browse winning sites from past years.',
    years: ['2025', '2024', '2023'],
  },
}

export default async function AwardsPage({
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
      <PageHeader eyebrow={c.eyebrow} title={c.title} lead={c.lead} />
      <Section title={c.categoriesTitle}>
        <CategoryGrid categories={c.categories} />
      </Section>
      <Section title={c.archiveTitle}>
        <p style={{ color: 'var(--fg-muted)', marginTop: 'calc(-1 * var(--space-4))' }}>
          {c.archiveLead}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)', marginTop: 'var(--space-6)' }}>
          {c.years.map((y) => (
            <Button key={y} variant="secondary" href={`${base}/vefverdlaunin`}>
              {y} →
            </Button>
          ))}
        </div>
      </Section>
    </>
  )
}
