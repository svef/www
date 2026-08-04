import { notFound } from 'next/navigation'
import { isLocale, type Locale } from '@/lib/i18n'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { Section } from '@/components/Section/Section'
import { NewsCard } from '@/components/NewsCard/NewsCard'
import styles from './news.module.scss'

const content: Record<
  Locale,
  {
    title: string
    lead: string
    articles: { date: string; title: string; excerpt: string }[]
  }
> = {
  is: {
    title: 'Fréttir',
    lead: 'Fréttir af starfi SVEF — hér er heimildin, samfélagsmiðlar deila héðan.',
    articles: [
      { date: '22. maí 2026', title: 'Ný stjórn tekin við', excerpt: 'Ný stjórn SVEF tók við á aðalfundi. Við kynnum hópinn og áherslur ársins.' },
      { date: '12. mars 2026', title: 'Vefur ársins 2025 verðlaunaður', excerpt: 'Íslensku vefverðlaunin voru afhent í Hörpu. Sjá alla verðlaunahafa.' },
      { date: '4. feb 2026', title: 'Klúðurkvöld — takk fyrir komuna', excerpt: 'Vel heppnað kvöld um að læra af mistökum. Nokkur gullkorn úr salnum.' },
    ],
  },
  en: {
    title: 'News',
    lead: 'News from SVEF — this is the source; social posts link back here.',
    articles: [
      { date: 'May 22, 2026', title: 'A new board takes over', excerpt: 'A new SVEF board took office at the AGM. Meet the team and this year’s focus.' },
      { date: 'March 12, 2026', title: 'Site of the Year 2025 awarded', excerpt: 'The Icelandic Web Awards were presented at Harpa. See all the winners.' },
      { date: 'Feb 4, 2026', title: 'Klúðurkvöld — thanks for coming', excerpt: 'A great evening about learning from mistakes. A few gems from the room.' },
    ],
  },
}

export default async function NewsPage({
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
        <div className={styles.grid}>
          {c.articles.map((a) => (
            <NewsCard
              key={a.title}
              date={a.date}
              title={a.title}
              excerpt={a.excerpt}
              href={`${base}/frettir`}
            />
          ))}
        </div>
      </Section>
    </>
  )
}
