import { notFound } from 'next/navigation'
import { isLocale } from '@/lib/i18n'
import { resolveContentLocale } from '@/lib/localized'
import { listNews } from '@/lib/content/news'
import { TranslationNote } from '@/components/TranslationNote/TranslationNote'

// Same temporary workaround as the page this slot sits beside; see the note
// there and #58.
export const dynamic = 'force-dynamic'

export default async function NewsTranslationNote({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  // `listNews` is cached per request, so this is the same read the page does.
  const articles = await listNews(locale)
  const contentLocale = resolveContentLocale(
    articles.flatMap((a) => [a.contentLocale, a.excerptLocale]),
    locale,
  )

  return <TranslationNote pageLocale={locale} contentLocale={contentLocale} />
}
