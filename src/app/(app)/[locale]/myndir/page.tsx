import { notFound } from 'next/navigation'
import { isLocale, type Locale } from '@/lib/i18n'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { Section } from '@/components/Section/Section'
import { Gallery } from '@/components/Gallery/Gallery'

const content: Record<
  Locale,
  { title: string; lead: string; albumTitle: string; view: string; prev: string; next: string }
> = {
  is: {
    title: 'Myndir',
    lead: 'Myndir frá viðburðum SVEF. Smelltu á mynd til að stækka.',
    albumTitle: 'Íslensku vefverðlaunin 2025',
    view: 'Skoða mynd',
    prev: 'Fyrri mynd',
    next: 'Næsta mynd',
  },
  en: {
    title: 'Photos',
    lead: 'Photos from SVEF events. Click a photo to enlarge.',
    albumTitle: 'The Icelandic Web Awards 2025',
    view: 'View photo',
    prev: 'Previous photo',
    next: 'Next photo',
  },
}

export default async function PhotosPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const c = content[locale]

  return (
    <>
      <PageHeader title={c.title} lead={c.lead} />
      <Section title={c.albumTitle}>
        <Gallery viewLabel={c.view} prevLabel={c.prev} nextLabel={c.next} />
      </Section>
    </>
  )
}
