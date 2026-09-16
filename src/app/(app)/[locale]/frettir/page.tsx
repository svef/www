import { notFound } from 'next/navigation'
import { getDictionary, isLocale } from '@/lib/i18n'
import { formatLongDate } from '@/lib/dates'
import { listNews } from '@/lib/content/news'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { Section } from '@/components/Section/Section'
import { NewsCard } from '@/components/NewsCard/NewsCard'
import { EmptyState } from '@/components/EmptyState/EmptyState'
import styles from './news.module.scss'

// TEMPORARY, tracked in #58. Not a pattern to copy.
//
// This route has `generateStaticParams` above it in the layout, so without this
// directive Next tries to prerender /is/frettir and /en/frettir at build time —
// which reads Payload, which needs a database. CI builds with a fake
// DATABASE_URL, so the build fails. Forcing dynamic buys a green build at the
// price of the full-route cache: every visit re-queries Postgres.
//
// The fix is #58 — a real Postgres in CI, then `generateStaticParams` plus
// `revalidate` here — and it lands before the rest of the pages are built. Do
// not reach for `force-dynamic` on a new page; it is a workaround with an
// expiry date, not the house style.
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

  // The fallback note for this page is rendered by the layout, from
  // `@translationNote/frettir/page.tsx`.
  return (
    <>
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
