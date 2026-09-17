import { notFound } from 'next/navigation'
import { getDictionary, isLocale, localePath } from '@/lib/i18n'
import { resolveContentLocale } from '@/lib/localized'
import { listEvents, type EventSummary } from '@/lib/content/events'
import { TranslationNote } from '@/components/TranslationNote/TranslationNote'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { Section } from '@/components/Section/Section'
import { SpotlightRow } from '@/components/SpotlightRow/SpotlightRow'
import { EventRow } from '@/components/EventRow/EventRow'
import { EventCard } from '@/components/EventCard/EventCard'
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

/** `date · time · venue — summary`, the export's spotlight line. */
function spotlightBody(event: EventSummary): string {
  const facts = [event.dateLabel, event.startTime, event.location].filter(Boolean).join(' · ')
  return [facts || null, event.summary].filter(Boolean).join(' — ')
}

export default async function EventsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const t = getDictionary(locale)
  const { upcoming, past } = await listEvents(locale)

  // The soonest event is the spotlight, and the list under "Framundan" is
  // everything after it — the design shows the next event once, large, not
  // twice.
  const [featured, ...rest] = upcoming

  const contentLocale = resolveContentLocale(
    [...upcoming, ...past].flatMap((event) => [event.contentLocale, event.metaLocale]),
    locale,
  )

  // The note is the first thing inside `<main>`, so the skip link lands on it
  // rather than past it. It renders nothing when the content is already in the
  // locale that was asked for.
  return (
    <>
      <TranslationNote pageLocale={locale} contentLocale={contentLocale} />
      <PageHeader title={t.events.title} lead={t.events.lead} />

      {featured && (
        <Section eyebrow={t.events.nextEvent}>
          <SpotlightRow
            title={featured.title}
            // The export's spotlight reads `14. nóv 2026 · 19:30 · Harpa,
            // Reykjavík` — date, then time, then venue — with the descriptive
            // sentence as a separate paragraph beneath. `SpotlightRow` has one
            // `body`, so the two are joined here rather than restructuring a
            // shared component for one caller; the *order* costs nothing and is
            // the export's.
            body={spotlightBody(featured)}
            // No ticket URL means no ticket button: a "Kaupa miða" that goes
            // nowhere is worse than none, and most SVEF events are free anyway.
            primary={
              featured.ticketUrl
                ? { label: t.events.buyTickets, href: featured.ticketUrl }
                : undefined
            }
            secondary={{ label: `${t.events.aboutEvent} →`, href: featured.href }}
          />
        </Section>
      )}

      {upcoming.length === 0 ? (
        <Section>
          <EmptyState title={t.events.empty.title} body={t.events.empty.body} />
        </Section>
      ) : (
        rest.length > 0 && (
          <Section title={t.events.upcomingTitle}>
            <div>
              {rest.map((event) => (
                <EventRow
                  key={event.slug}
                  day={event.badge.day}
                  month={event.badge.month}
                  dateTime={event.startDate}
                  dateLabel={event.dateLabel}
                  title={event.title}
                  description={event.meta ?? undefined}
                  href={event.href}
                  ctaLabel={t.events.details}
                  titleLang={event.contentLocale === locale ? undefined : event.contentLocale}
                  descriptionLang={event.metaLocale === locale ? undefined : event.metaLocale}
                />
              ))}
            </div>
          </Section>
        )
      )}

      {past.length > 0 && (
        <Section title={t.events.pastTitle}>
          <div className={styles.pastGrid}>
            {past.map((event) => (
              <EventCard
                key={event.slug}
                title={event.title}
                dateLabel={event.shortDate}
                dateTime={event.startDate}
                location={event.meta ?? undefined}
                href={event.href}
                titleLang={event.contentLocale === locale ? undefined : event.contentLocale}
                locationLang={event.metaLocale === locale ? undefined : event.metaLocale}
                // Only offered where there are photos to see, and pointed at
                // the album itself rather than the top of the photos page —
                // `/myndir` renders each album's heading with the DOM id
                // `album-<galleryId>` (#73). Enforced by `e2e/event.spec.ts`,
                // because the link checker does not resolve a cross-page
                // fragment and would not notice if that id were renamed.
                secondary={
                  event.galleryId !== null
                    ? {
                        label: t.events.photosFromEvent,
                        href: `${localePath('/myndir', locale)}#album-${event.galleryId}`,
                      }
                    : undefined
                }
              />
            ))}
          </div>
        </Section>
      )}
    </>
  )
}
