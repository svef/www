import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getDictionary, isLocale, localePath, type Locale } from '@/lib/i18n'
import { formatLongDate } from '@/lib/dates'
import { resolveContentLocale } from '@/lib/localized'
import { findNewsArticle, listNewsSlugs } from '@/lib/content/news'
import { RichText } from '@/components/RichText/RichText'
import { TranslationNote } from '@/components/TranslationNote/TranslationNote'
import { ShareRow } from '@/components/ShareRow/ShareRow'
import styles from './article.module.scss'

type Params = Promise<{ locale: string; slug: string }>

/**
 * Same five minutes as the index, and the same reasoning: an editor fixing a
 * typo should see it within the minute or two they are still looking. See the
 * note in `../page.tsx`, and the staleness caveat below — five minutes is a
 * floor, not a deadline.
 */
export const revalidate = 300

/**
 * Prerender every article that is already published.
 *
 * The parent `[locale]` layout generates the locale params, so this returns
 * only its own segment; Next crosses the two, giving one prerendered page per
 * article per locale.
 *
 * **Future-dated articles are deliberately excluded.** `listNewsSlugs` applies
 * the same `publishedAt <= now` filter as every other read, and it has to: a
 * prerendered page is a file written at build time, so a scheduled article
 * included here would be published the moment the build ran rather than the
 * moment its date arrived — the exact failure the filter exists to prevent.
 *
 * Leaving it out is not a hole. `dynamicParams` stays at its default of `true`,
 * so a slug that was not prerendered is rendered on demand, where
 * `findNewsArticle` re-runs the filter and `notFound()` fires. The article
 * 404s until its date passes, and starts rendering afterwards without a
 * rebuild.
 *
 * It does not flip the moment the date arrives, though, and the reason is worth
 * stating: **the 404 is cached too.** Next writes the `notFound()` response into
 * the full-route cache with this route's `revalidate`, same as a 200 —
 * `x-nextjs-cache: HIT`, `s-maxage=300`. So the filter is only re-evaluated when
 * the entry goes stale, and the request that finds it stale is served the stale
 * answer while the regeneration happens behind it. Crossing the date costs one
 * revalidation window *plus one throwaway request*.
 *
 * The same is true in reverse, which matters more: an article whose date is
 * moved back into the future keeps serving 200 — and keeps appearing on the
 * index — for that same window plus a request. `publishedAt` schedules; it does
 * not embargo and it does not take down. On-demand revalidation (svef/www#67)
 * is what makes either direction immediate.
 */
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const slugs = await listNewsSlugs()
  return slugs.map((slug) => ({ slug }))
}

/** Resolve the params once, 404ing on an unknown locale or slug. */
async function loadArticle(params: Params) {
  const { locale, slug } = await params
  if (!isLocale(locale)) notFound()
  const article = await findNewsArticle(slug, locale)
  if (!article) notFound()
  return { article, locale: locale as Locale }
}

export async function generateMetadata({
  params,
}: {
  params: Params
}): Promise<Metadata> {
  const { article } = await loadArticle(params)
  return {
    title: article.title,
    description: article.excerpt ?? undefined,
  }
}

function absoluteUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  return new URL(path, base).toString()
}

export default async function NewsArticlePage({ params }: { params: Params }) {
  const { article, locale } = await loadArticle(params)
  const t = getDictionary(locale)

  // The article's own words may be Icelandic on the English site; the chrome
  // around them (date, back link, share row) is always the page's language.
  // Headline, summary and body are marked separately, because Payload localizes
  // them independently — a translated headline over an untranslated body, or an
  // English title with no English summary, are both states this model allows.
  const titleLang = article.contentLocale === locale ? undefined : article.contentLocale
  const excerptLang = article.excerptLocale === locale ? undefined : article.excerptLocale
  const bodyLang = article.bodyLocale === locale ? undefined : article.bodyLocale

  // The page-level note is the first thing inside `<main>`, so the skip link
  // lands on it rather than past it. Whether it appears at all is
  // `resolveContentLocale`'s decision, made the same way on every page.
  const contentLocale = resolveContentLocale(
    [article.contentLocale, article.excerptLocale, article.bodyLocale],
    locale,
  )

  return (
    <>
      <TranslationNote pageLocale={locale} contentLocale={contentLocale} />
      <article className={styles.article}>
        <Link className={styles.back} href={localePath('/frettir', locale)}>
          <span aria-hidden="true">←</span> {t.news.backToIndex}
        </Link>

        <time className={styles.date} dateTime={article.publishedAt}>
          {formatLongDate(article.publishedAt, locale)}
        </time>

        <h1 className={styles.title} lang={titleLang}>
          {article.title}
        </h1>

        <div className={styles.coverFrame}>
          <span className={styles.coverBlock} aria-hidden="true" />
          {article.cover ? (
            <Image
              className={styles.cover}
              src={article.cover.url}
              alt={article.cover.alt}
              width={article.cover.width ?? 1200}
              height={article.cover.height ?? 675}
              priority
            />
          ) : (
            <div className={styles.cover} aria-hidden="true" />
          )}
        </div>

        {article.body ? (
          <RichText data={article.body} className={styles.body} lang={bodyLang} />
        ) : (
          // Not every article has a body written out — some are a headline and a
          // summary. Showing the summary beats showing a title over nothing.
          article.excerpt && (
            <p className={styles.lead} lang={excerptLang}>
              {article.excerpt}
            </p>
          )
        )}

        <ShareRow
          url={absoluteUrl(article.href)}
          title={article.title}
          labels={t.news.share}
        />
      </article>
    </>
  )
}
