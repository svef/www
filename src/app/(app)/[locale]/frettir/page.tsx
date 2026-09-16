import { notFound } from 'next/navigation'
import { getDictionary, isLocale } from '@/lib/i18n'
import { formatLongDate } from '@/lib/dates'
import { resolveContentLocale } from '@/lib/localized'
import { listNews } from '@/lib/content/news'
import { TranslationNote } from '@/components/TranslationNote/TranslationNote'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { Section } from '@/components/Section/Section'
import { NewsCard } from '@/components/NewsCard/NewsCard'
import { EmptyState } from '@/components/EmptyState/EmptyState'
import styles from './news.module.scss'

/**
 * Statically prerendered for both locales (`generateStaticParams` lives in the
 * `[locale]` layout) and refreshed by ISR.
 *
 * Five minutes. The association publishes a handful of posts a year, so the
 * point of the number is not throughput — it is the two moments where a stale
 * index is actually wrong. An editor who hits publish wants to see the post on
 * the site while still looking at the site, and a post scheduled with a future
 * `publishedAt` has no cron behind it: it appears on the first regeneration
 * after its date passes. Five minutes is a short enough wait to feel like
 * "done" in both cases and still leaves the page a cached file for the other
 * 99.99% of the year. Revalidation is lazy, so a route nobody is reading costs
 * nothing at all.
 *
 * On-demand revalidation — a Payload `afterChange` hook calling
 * `revalidatePath` — would make the editor's case instant. It is worth doing,
 * but it does not replace this: no hook fires when a scheduled date simply
 * arrives, so the interval stays either way. Tracked separately.
 */
export const revalidate = 300

export default async function NewsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const t = getDictionary(locale)
  const articles = await listNews(locale)
  const contentLocale = resolveContentLocale(
    articles.flatMap((a) => [a.contentLocale, a.excerptLocale]),
    locale,
  )

  // The note is the first thing inside `<main>`, so the skip link lands on it
  // rather than past it. One line per page; `TranslationNote` renders nothing
  // when the content is already in the locale that was asked for.
  return (
    <>
      <TranslationNote pageLocale={locale} contentLocale={contentLocale} />
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
                titleLang={article.contentLocale === locale ? undefined : article.contentLocale}
                excerptLang={
                  article.excerptLocale === locale ? undefined : article.excerptLocale
                }
              />
            ))}
          </div>
        )}
      </Section>
    </>
  )
}
