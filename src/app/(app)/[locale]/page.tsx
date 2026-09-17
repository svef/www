import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  DEFAULT_LOCALE,
  getDictionary,
  isLocale,
  localePath,
  type Locale,
} from '@/lib/i18n'
import { resolveContentLocale } from '@/lib/localized'
import {
  findSpotlightWinner,
  getHomeSettings,
  HOME_PHOTO_COUNT,
  listHomePhotos,
  listRecentWinners,
} from '@/lib/content/home'
import { planEventSection } from '@/lib/content/home-mapping'
import { listEvents, type EventSummary } from '@/lib/content/events'
import { TranslationNote } from '@/components/TranslationNote/TranslationNote'
import { Hero } from '@/components/Hero/Hero'
import { Section } from '@/components/Section/Section'
import { SpotlightRow } from '@/components/SpotlightRow/SpotlightRow'
import { EventRow } from '@/components/EventRow/EventRow'
import { EmptyState } from '@/components/EmptyState/EmptyState'
import { Gallery } from '@/components/Gallery/Gallery'
import { WinnerCard, WINNER_ACCENTS } from '@/components/WinnerCard/WinnerCard'
import styles from './home.module.scss'

/**
 * Statically prerendered for both locales and refreshed by ISR — five minutes,
 * the same number and the same reasoning as every other public page, and the
 * rule set out in `CLAUDE.md`. `generateStaticParams` lives in the `[locale]`
 * layout: this route adds no dynamic segment of its own.
 *
 * Nothing here is per-request. The photo strip's lightbox is the only
 * interactive part of the page and it lives in `Gallery`, a client component
 * this prerendered Server Component hands plain, already-resolved data.
 *
 * Two things on this page are evaluated when it is *rendered* rather than when
 * it is read, and both are the same shrug `/vidburdir` records: which event is
 * next, and which events are still upcoming at all. An event that ends during a
 * revalidation window keeps its place at the top for the rest of it, plus the
 * one request that finds the page stale and is served it anyway.
 */
export const revalidate = 300

/** `date · time · venue — summary`, the export's spotlight line. */
function spotlightBody(event: EventSummary): string {
  const facts = [event.dateLabel, event.startTime, event.location]
    .filter(Boolean)
    .join(' · ')
  return [facts || null, event.summary].filter(Boolean).join(' — ')
}

/**
 * The export's section header: heading, a rule that fills the gap, and a link
 * to the page the section is a teaser for.
 *
 * Built here rather than added to `Section`, for the reason `/vefverdlaunin`
 * builds its archive header the same way: the rule and the right-aligned link
 * belong to the home page's teaser sections, and pushing them into the shared
 * component would put a rule under every `<h2>` on the site, or add a prop whose
 * only job is to say "not on the other seven pages".
 */
function SectionHead({
  title,
  href,
  linkLabel,
}: {
  title: string
  href: string
  linkLabel: string
}) {
  return (
    <div className={styles.head}>
      <h2 className={styles.headTitle}>{title}</h2>
      <span className={styles.rule} aria-hidden="true" />
      <Link href={href} className={styles.headLink}>
        {linkLabel} →
      </Link>
    </div>
  )
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const t = getDictionary(locale)
  const c = t.home
  const langOf = (of: Locale) => (of === locale ? undefined : of)

  const settings = await getHomeSettings(locale)

  // The events read serves both the spotlight and the list, so it is made once
  // and only when one of the two actually wants it — a board that has switched
  // the spotlight to a winner and turned the events section off should not be
  // paying for a query whose result nothing renders.
  const wantsEvents =
    settings.showUpcomingEvents || settings.spotlightMode === 'nextEvent'
  const upcoming = wantsEvents ? (await listEvents(locale)).upcoming : []

  const [spotlightWinner, winners, photos] = await Promise.all([
    findSpotlightWinner(settings.spotlightWinnerId, locale),
    settings.showRecentWinners ? listRecentWinners(locale) : [],
    settings.showPhotos ? listHomePhotos(locale) : { photos: [], hasAlbums: false },
  ])

  /**
   * How the upcoming events are split between the spotlight and the list, and
   * whether the list renders at all.
   *
   * The decision is in `planEventSection` rather than in the JSX below, because
   * it is the one piece of this page that can be wrong in a way nobody sees in
   * review: with a single event upcoming the spotlight takes it and the list is
   * left empty, and an empty state fired off the *list* puts "Engir viðburðir
   * framundan" directly below a block announcing an event. It is unit tested
   * there.
   *
   * A spotlight of `null` is a real outcome rather than a failure: the block
   * announces what is happening now, and an association with nothing on the
   * calendar has nothing to announce. That is the same call `/vefverdlaunin`
   * makes about its ceremony.
   */
  const events = planEventSection(upcoming, {
    spotlightNextEvent: settings.spotlightMode === 'nextEvent',
    showSection: settings.showUpcomingEvents,
  })
  const spotlightEvent = events.spotlight

  /**
   * Which language the reader is actually being shown.
   *
   * The hero copy is a localized field on the `home-page` global, the events
   * carry their own separately-translated title and meta line, and a category
   * name may have been translated when the rest has not. One untranslated piece
   * is enough for the strip to say so — `resolveContentLocale` owns that rule.
   *
   * A winner's `blurb` is left out on purpose: it has no English column at all
   * (the winners archive is Icelandic by decision), so counting it would make
   * the note permanent on `/en` and turn "not translated yet" into a lie. It is
   * marked inline with `blurbLang` instead, exactly as `/vefverdlaunin` does.
   */
  const shownEvents = [...(spotlightEvent ? [spotlightEvent] : []), ...events.rows]
  const contentLocale = resolveContentLocale(
    [
      ...(settings.heroSentence ? [settings.heroSentenceLocale] : []),
      ...(settings.heroHook ? [settings.heroHookLocale] : []),
      ...shownEvents.flatMap((event) => [event.contentLocale, event.metaLocale]),
      ...winners.map((winner) => winner.categoryLocale),
      ...(spotlightWinner ? [spotlightWinner.categoryLocale] : []),
    ],
    locale,
  )

  // The note is the first thing inside `<main>`, so the skip link lands on it
  // rather than past it. It renders nothing when the content is already in the
  // locale that was asked for.
  return (
    <>
      <TranslationNote pageLocale={locale} contentLocale={contentLocale} />

      <Hero
        eyebrow={c.eyebrow}
        // `heroSentence` is what an editor writes; the association's own name
        // stands in when nobody has, so the page always has an `<h1>` without
        // inventing a sentence for it. See `t.home.fallbackTitle`.
        title={settings.heroSentence ?? c.fallbackTitle}
        titleLang={
          settings.heroSentence ? langOf(settings.heroSentenceLocale) : undefined
        }
        lead={settings.heroHook ?? undefined}
        leadLang={settings.heroHook ? langOf(settings.heroHookLocale) : undefined}
        primary={{ label: c.joinCta, href: localePath('/skraning', locale) }}
        secondary={{ label: c.eventsCta, href: localePath('/vidburdir', locale) }}
      />

      {spotlightEvent && (
        <Section eyebrow={c.happeningNow}>
          <SpotlightRow
            title={spotlightEvent.title}
            body={spotlightBody(spotlightEvent)}
            // No ticket URL means no ticket button: a "Kaupa miða" that goes
            // nowhere is worse than none, and most SVEF events are free.
            primary={
              spotlightEvent.ticketUrl
                ? { label: t.events.buyTickets, href: spotlightEvent.ticketUrl }
                : undefined
            }
            secondary={{ label: `${t.events.aboutEvent} →`, href: spotlightEvent.href }}
          />
        </Section>
      )}

      {settings.spotlightMode === 'winner' && spotlightWinner && (
        <Section eyebrow={c.happeningNow}>
          <SpotlightRow
            title={spotlightWinner.siteName}
            body={spotlightWinner.blurb ?? undefined}
            primary={
              spotlightWinner.url
                ? { label: c.visitSite, href: spotlightWinner.url }
                : undefined
            }
            secondary={{
              label: `${c.aboutAwards} →`,
              href: localePath('/vefverdlaunin', locale),
            }}
          />
        </Section>
      )}

      {events.section !== 'hidden' &&
        (events.section === 'empty' ? (
          <Section>
            <SectionHead
              title={c.eventsTitle}
              href={localePath('/vidburdir', locale)}
              linkLabel={c.allEvents}
            />
            {/*
              The header stays in this branch, unlike on `/vidburdir`, because
              "Allir viðburðir →" is the one thing worth offering a reader who
              has just been told there is nothing coming up — the archive of past
              events is still there.
            */}
            <EmptyState
              title={t.events.empty.title}
              body={t.events.empty.body}
              headingLevel={3}
            />
          </Section>
        ) : (
          <Section>
            <SectionHead
              title={c.eventsTitle}
              href={localePath('/vidburdir', locale)}
              linkLabel={c.allEvents}
            />
            <div>
              {events.rows.map((event) => (
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
                  titleLang={langOf(event.contentLocale)}
                  descriptionLang={langOf(event.metaLocale)}
                />
              ))}
            </div>
          </Section>
        ))}

      {settings.showRecentWinners && (
        <Section>
          <SectionHead
            title={c.winnersTitle}
            href={localePath('/vefverdlaunin', locale)}
            linkLabel={t.awards.archive.title}
          />
          {winners.length === 0 ? (
            <EmptyState
              title={c.winnersEmpty.title}
              body={c.winnersEmpty.body}
              headingLevel={3}
            />
          ) : (
            <ul className={styles.winners}>
              {winners.map((winner, i) => (
                <li key={winner.id}>
                  <WinnerCard
                    siteName={winner.siteName}
                    category={winner.category}
                    year={winner.year}
                    blurb={winner.blurb}
                    url={winner.url}
                    screenshot={winner.screenshot}
                    // Positional, not meaningful — the design rotates the four
                    // brand accents so no two neighbours match.
                    accent={WINNER_ACCENTS[i % WINNER_ACCENTS.length]}
                    categoryLang={langOf(winner.categoryLocale)}
                    // `award-winners.blurb` has no English column, so on the
                    // English page it is always marked as Icelandic.
                    blurbLang={langOf(DEFAULT_LOCALE)}
                  />
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      {settings.showPhotos && (
        <Section>
          <SectionHead
            title={c.photosTitle}
            href={localePath('/myndir', locale)}
            linkLabel={c.allPhotos}
          />
          {!photos.hasAlbums ? (
            <EmptyState
              title={c.photosEmpty.title}
              body={c.photosEmpty.body}
              headingLevel={3}
            />
          ) : (
            // `/myndir`'s lightbox, not a second one. It is the same interaction
            // on the same kind of data, and it is the component that carries the
            // focus trap, the Esc and arrow handling and the axe coverage that
            // svef/www#62 and #68 put there. A separate home-page enlarger would
            // be a second thing to keep accessible, and the one more likely to
            // drift. The strip shows the newest photos the site has and the
            // section header links to the rest.
            <Gallery
              photos={photos.photos}
              // Albums exist but their images have not been uploaded yet — the
              // strip keeps its shape with placeholder tiles, as `/myndir` does
              // for the same album, rather than contradicting the page it links
              // to with an empty state.
              placeholderCount={HOME_PHOTO_COUNT}
              // The export's strip is four tiles across the content width. Its
              // `auto-fit` gives that for free; `Gallery`'s `auto-fill` — a
              // deviation made for `/myndir` — does not, so the count is named.
              columns={HOME_PHOTO_COUNT}
              viewLabel={c.enlargePhoto}
              prevLabel={t.photos.prevPhoto}
              nextLabel={t.photos.nextPhoto}
              closeLabel={t.close}
            />
          )}
        </Section>
      )}
    </>
  )
}
