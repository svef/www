import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  DEFAULT_LOCALE,
  getDictionary,
  isLocale,
  localePath,
  type Locale,
} from '@/lib/i18n'
import { formatLongDate } from '@/lib/dates'
import { findNewsArticle } from '@/lib/content/news'
import { RichText } from '@/components/RichText/RichText'
import { ShareRow } from '@/components/ShareRow/ShareRow'
import { TranslationNote } from '@/components/TranslationNote/TranslationNote'
import styles from './article.module.scss'

// Rendered per request; see the note on the index route.
export const dynamic = 'force-dynamic'

type Params = Promise<{ locale: string; slug: string }>

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
  // Headline and body are marked separately: a translated headline over an
  // untranslated body is a state this content model allows.
  const titleLang = article.contentLocale === locale ? undefined : article.contentLocale
  const bodyLang = article.bodyLocale === locale ? undefined : article.bodyLocale
  const pageContentLocale =
    titleLang || bodyLang ? DEFAULT_LOCALE : locale

  return (
    <>
      <TranslationNote pageLocale={locale} contentLocale={pageContentLocale}>
        {t.translationNote}
      </TranslationNote>
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
            <p className={styles.lead} lang={titleLang}>
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
