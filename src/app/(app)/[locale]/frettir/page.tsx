import { notFound } from 'next/navigation'
import { DEFAULT_LOCALE, getDictionary, isLocale } from '@/lib/i18n'
import { formatLongDate } from '@/lib/dates'
import { listNews } from '@/lib/content/news'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { Section } from '@/components/Section/Section'
import { NewsCard } from '@/components/NewsCard/NewsCard'
import { EmptyState } from '@/components/EmptyState/EmptyState'
import { TranslationNote } from '@/components/TranslationNote/TranslationNote'
import styles from './news.module.scss'

// Rendered per request. The content comes from Payload, so a build-time
// prerender would need a database — and the deployed build deliberately does
// not connect to one (see the CI workflow).
export const dynamic = 'force-dynamic'

export default async function NewsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const t = getDictionary(locale)
  const articles = await listNews(locale)

  // One article still waiting for its translation is enough to say so: the note
  // is about the page, and a page of half-Icelandic cards needs the explanation
  // as much as an entirely Icelandic one.
  const contentLocale = articles.every((a) => a.contentLocale === locale)
    ? locale
    : DEFAULT_LOCALE

  return (
    <>
      <TranslationNote pageLocale={locale} contentLocale={contentLocale}>
        {t.translationNote}
      </TranslationNote>
      <PageHeader title={t.news.title} lead={t.news.lead} />
      <Section>
        {articles.length === 0 ? (
          <EmptyState title={t.news.empty.title} body={t.news.empty.body} />
        ) : (
          <div className={styles.grid}>
            {articles.map((article) => (
              <NewsCard
                key={article.slug}
                href={article.href}
                date={formatLongDate(article.publishedAt, locale)}
                dateTime={article.publishedAt}
                title={article.title}
                excerpt={article.excerpt}
                cover={article.cover}
                cta={t.news.readArticle}
                lang={article.contentLocale === locale ? undefined : article.contentLocale}
              />
            ))}
          </div>
        )}
      </Section>
    </>
  )
}
