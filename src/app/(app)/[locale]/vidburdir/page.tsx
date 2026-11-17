import { notFound } from 'next/navigation'
import { getDictionary, isLocale } from '@/lib/i18n'
import { resolveContentLocale } from '@/lib/localized'
import { listEvents } from '@/lib/content/events'
import { TranslationNote } from '@/components/TranslationNote/TranslationNote'
import { PageHead } from '@/components/PageHead/PageHead'
import { PageSection } from '@/components/PageSection/PageSection'
import { EventPoster } from '@/components/EventPoster/EventPoster'
import { EventGrid } from '@/components/EventPoster/EventGrid'
import { EmptyState } from '@/components/EmptyState/EmptyState'
import styles from './events.module.scss'

/**
 * Statically prerendered for both locales (`generateStaticParams` lives in the
 * `[locale]` layout) and refreshed by ISR. Five minutes, the same number and
 * the same reasoning as `/frettir` — see the note there.
 *
 * One thing is specific to this page. The upcoming/past split is evaluated when
 * the page is *rendered*, so an event moves from "Framundan" to "Liðnir
 * viðburðir" up to a revalidation window after it ends, plus the one request
 * that finds the cached page stale and is served it anyway (`CLAUDE.md`,
 * "`revalidate` is a staleness floor"). For an event that finished a few
 * minutes ago that is the right trade: the alternative is rendering this page
 * on every request forever so that one row moves on time.
 */
export const revalidate = 300

export default async function EventsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const t = getDictionary(locale)
  const { upcoming, past } = await listEvents(locale)

  const contentLocale = resolveContentLocale(
    [...upcoming, ...past].flatMap((event) => [event.contentLocale, event.metaLocale]),
    locale,
  )
  const lang = (l: string) => (l === locale ? undefined : l)

  // The note is the first thing inside `<main>`, so the skip link lands on it
  // rather than past it. It renders nothing when the content is already in the
  // locale that was asked for.
  return (
    <>
      <TranslationNote pageLocale={locale} contentLocale={contentLocale} />
      <PageHead title={t.events.title} lede={t.events.lead} stickers="vidburdir" locale={locale} />

      <PageSection aria-labelledby="events-upcoming" last={past.length === 0}>
        <header className={styles.head}>
          <h2 id="events-upcoming" className="h2">
            {t.events.upcomingTitle}
          </h2>
        </header>
        {upcoming.length === 0 ? (
          <EmptyState title={t.events.empty.title} body={t.events.empty.body} headingLevel={3} />
        ) : (
          <EventGrid>
            {upcoming.map((event, i) => (
              <EventPoster
                key={event.slug}
                index={i}
                href={event.href}
                title={event.title}
                date={event.shortDate}
                dateTime={event.startDate}
                meta={event.posterMeta}
                titleLang={lang(event.contentLocale)}
                metaLang={lang(event.locationLocale)}
              />
            ))}
          </EventGrid>
        )}
      </PageSection>

      {past.length > 0 && (
        <PageSection aria-labelledby="events-past" last>
          <header className={styles.head}>
            <h2 id="events-past" className="h2">
              {t.events.pastTitle}
            </h2>
          </header>
          <EventGrid>
            {past.map((event, i) => (
              <EventPoster
                key={event.slug}
                index={i}
                href={event.href}
                title={event.title}
                date={event.shortDate}
                dateTime={event.startDate}
                meta={event.posterMeta}
                titleLang={lang(event.contentLocale)}
                metaLang={lang(event.locationLocale)}
              />
            ))}
          </EventGrid>
        </PageSection>
      )}
    </>
  )
}
