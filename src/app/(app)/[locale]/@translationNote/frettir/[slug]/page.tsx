import { notFound } from 'next/navigation'
import { isLocale } from '@/lib/i18n'
import { resolveContentLocale } from '@/lib/localized'
import { findNewsArticle } from '@/lib/content/news'
import { TranslationNote } from '@/components/TranslationNote/TranslationNote'

export default async function ArticleTranslationNote({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  if (!isLocale(locale)) notFound()

  // `findNewsArticle` is cached per request, so this is the same read the page
  // does. A missing article means the page is about to 404; no note.
  const article = await findNewsArticle(slug, locale)
  if (!article) return null

  const contentLocale = resolveContentLocale(
    [article.contentLocale, article.excerptLocale, article.bodyLocale],
    locale,
  )

  return <TranslationNote pageLocale={locale} contentLocale={contentLocale} />
}
