import { notFound } from 'next/navigation'
import { Fragment } from 'react'
import {
  getDictionary,
  isHiddenPath,
  isLocale,
  localePath,
} from '@/lib/i18n'
import { formatLongDate } from '@/lib/dates'
import { resolveContentLocale } from '@/lib/localized'
import { HOME_EVENT_COUNT, HOME_NEWS_COUNT, getHomeSettings } from '@/lib/content/home'
import { listEvents } from '@/lib/content/events'
import { listNews } from '@/lib/content/news'
import { TranslationNote } from '@/components/TranslationNote/TranslationNote'
import { HomeOpening } from '@/components/HomeOpening/HomeOpening'
import { PageSection } from '@/components/PageSection/PageSection'
import { PageStickers } from '@/components/Sticker/PageStickers'
import { SectionHead } from '@/components/SectionHead/SectionHead'
import { ButtonLink } from '@/components/ButtonLink/ButtonLink'
import { EventPoster } from '@/components/EventPoster/EventPoster'
import { EventsCarousel } from '@/components/EventsCarousel/EventsCarousel'
import { NewsGrid } from '@/components/NewsGrid/NewsGrid'
import { NewsCard } from '@/components/NewsCard/NewsCard'
import { EmptyState } from '@/components/EmptyState/EmptyState'
import styles from './home.module.scss'

/**
 * Statically prerendered for both locales and refreshed by ISR — five minutes, the same
 * number and the same reasoning as every other public page, and the rule set out in
 * `CLAUDE.md`. `generateStaticParams` lives in the `[locale]` layout: this route adds no
 * dynamic segment of its own.
 *
 * Which events are still upcoming is evaluated when the page is *rendered*, so an event
 * that ends during a revalidation window keeps its place in the carousel for the rest of
 * it, plus the one request that finds the page stale and is served it anyway.
 */
export const revalidate = 300

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const t = getDictionary(locale)
  const settings = await getHomeSettings(locale)

  // A section the global turns off costs no query.
  const [upcoming, news] = await Promise.all([
    settings.showUpcomingEvents
      ? listEvents(locale).then((lists) => lists.upcoming.slice(0, HOME_EVENT_COUNT))
      : [],
    settings.showLatestNews
      ? listNews(locale).then((all) => all.slice(0, HOME_NEWS_COUNT))
      : [],
  ])

  const langOf = (of: string) => (of === locale ? undefined : of)

  // One untranslated piece of copy is enough for the strip to say so. The home copy,
  // the events' titles and venues and the news headlines all count.
  const contentLocale = resolveContentLocale(
    [
      ...settings.locales,
      ...upcoming.flatMap((event) => [event.contentLocale, event.locationLocale]),
      ...news.flatMap((article) => [article.contentLocale, article.excerptLocale]),
    ],
    locale,
  )

  // The hero's first button is the membership page's, which is on hold (`HIDDEN_PAGES`).
  const actions = [
    { label: settings.primaryLabel, href: localePath('/skraning', locale) },
    { label: settings.secondaryLabel, href: localePath('/vidburdir', locale) },
  ]
    .filter((action) => !isHiddenPath(action.href))
    .map(({ label, href }) => ({ label: label.text, lang: label.lang, href }))

  const eventsHeadingWords = settings.eventsHeading.text.split(/\s+/)

  // The note is the first thing inside `<main>`, so the skip link lands on it rather
  // than past it. It renders nothing when the content is already in the locale asked for.
  return (
    <>
      <TranslationNote pageLocale={locale} contentLocale={contentLocale} />

      <HomeOpening
        locale={locale}
        lines={settings.heroLines}
        titleLang={langOf(settings.heroLocale)}
        actions={actions}
        intro={
          settings.introText
            ? { text: settings.introText.text, lang: settings.introText.lang }
            : undefined
        }
      />

      {settings.showUpcomingEvents && (
        <PageSection aria-labelledby="home-events" className={styles.events}>
          <PageStickers page="forsida" band="events" locale={locale} />
          <div className={styles.eventsHead}>
            {/* Each word on its own line, as the export sets it. The spaces stay in the
                text so the heading reads as one phrase. */}
            <h2
              id="home-events"
              className={`h2 ${styles.eventsTitle}`}
              lang={settings.eventsHeading.lang}
            >
              {eventsHeadingWords.map((word, i) => (
                <Fragment key={i}>
                  {i > 0 && ' '}
                  <span className={styles.eventsWord}>{word}</span>
                </Fragment>
              ))}
            </h2>
            <div className={styles.eventsAside}>
              {settings.eventsLead && (
                <p className={styles.lead} lang={settings.eventsLead.lang}>
                  {settings.eventsLead.text}
                </p>
              )}
              <ButtonLink
                href={localePath('/vidburdir', locale)}
                lang={settings.eventsLinkLabel.lang}
              >
                {settings.eventsLinkLabel.text}
              </ButtonLink>
            </div>
          </div>

          {upcoming.length === 0 ? (
            <EmptyState title={t.events.empty.title} body={t.events.empty.body} headingLevel={3} />
          ) : (
            <EventsCarousel label={t.events.carouselLabel} dotLabel={t.events.dotLabel}>
              {upcoming.map((event, i) => (
                <EventPoster
                  key={event.slug}
                  index={i}
                  href={event.href}
                  title={event.title}
                  date={event.shortDate}
                  dateTime={event.startDate}
                  meta={event.posterMeta}
                  titleLang={langOf(event.contentLocale)}
                  metaLang={langOf(event.locationLocale)}
                />
              ))}
            </EventsCarousel>
          )}
        </PageSection>
      )}

      {settings.showLatestNews && news.length > 0 && (
        <PageSection aria-labelledby="home-news" className={styles.after}>
          <SectionHead
            id="home-news"
            title={settings.newsHeading.text}
            titleLang={settings.newsHeading.lang}
          >
            <ButtonLink
              href={localePath('/frettir', locale)}
              lang={settings.newsLinkLabel.lang}
            >
              {settings.newsLinkLabel.text}
            </ButtonLink>
          </SectionHead>
          <NewsGrid>
            {news.map((article, i) => (
              <NewsCard
                key={article.slug}
                index={i}
                href={article.href}
                date={formatLongDate(article.publishedAt, locale)}
                dateTime={article.publishedAt}
                title={article.title}
                excerpt={article.excerpt}
                cta={t.news.readArticle}
                headingLevel={3}
                titleLang={langOf(article.contentLocale)}
                excerptLang={langOf(article.excerptLocale)}
              />
            ))}
          </NewsGrid>
        </PageSection>
      )}

      {settings.aboutText && (
        <PageSection aria-labelledby="home-about" className={styles.after} last>
          <div className={styles.about}>
            <h2
              id="home-about"
              className={`h2 ${styles.aboutTitle}`}
              lang={settings.aboutHeading.lang}
            >
              {settings.aboutHeading.text}
            </h2>
            <p className={styles.aboutText} lang={settings.aboutText.lang}>
              {settings.aboutText.text}
            </p>
            <ButtonLink
              href={localePath('/um-svef', locale)}
              lang={settings.aboutLinkLabel.lang}
            >
              {settings.aboutLinkLabel.text}
            </ButtonLink>
          </div>
        </PageSection>
      )}
    </>
  )
}
