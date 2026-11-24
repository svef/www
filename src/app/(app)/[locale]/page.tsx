import { notFound } from 'next/navigation'
import { Fragment } from 'react'
import Link from 'next/link'
import { getDictionary, isHiddenPath, isLocale, localePath } from '@/lib/i18n'
import { resolveContentLocale } from '@/lib/localized'
import { HOME_EVENT_COUNT, getAwardsMeta, getHomeSettings } from '@/lib/content/home'
import { listEvents } from '@/lib/content/events'
import { getIntakePhase } from '@/lib/awards/public-catalog.server'
import { TranslationNote } from '@/components/TranslationNote/TranslationNote'
import { HomeOpening } from '@/components/HomeOpening/HomeOpening'
import { HomeAwardsPhotos } from '@/components/HomeAwards/HomeAwards'
import { PageSection } from '@/components/PageSection/PageSection'
import { PageStickers } from '@/components/Sticker/PageStickers'
import { ButtonLink } from '@/components/ButtonLink/ButtonLink'
import { EventPoster } from '@/components/EventPoster/EventPoster'
import { EventZigzag } from '@/components/EventPoster/EventZigzag'
import { EmptyState } from '@/components/EmptyState/EmptyState'
import styles from './home.module.scss'

/**
 * Statically prerendered for both locales and refreshed by ISR — five minutes, the same
 * number and the same reasoning as every other public page, and the rule set out in
 * `CLAUDE.md`. `generateStaticParams` lives in the `[locale]` layout: this route adds no
 * dynamic segment of its own.
 *
 * Which events are still upcoming is evaluated when the page is *rendered*, so an event
 * that ends during a revalidation window keeps its place in the grid for the rest of it,
 * plus the one request that finds the page stale and is served it anyway.
 */
export const revalidate = 300

/**
 * The export's `forsida`: the hero and the intro band, the Web Awards section, the events
 * zig-zag, and the about block. The Web Awards section has no button: the export's goes to the
 * awards page, which is on hold (#128), so there is nothing to link to.
 *
 * Every piece of copy comes from the `home-page` global and falls back to the export's own
 * (the dictionary), so the page is whole with nothing written.
 */
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const t = getDictionary(locale)
  const [settings, awardsMeta, intake] = await Promise.all([
    getHomeSettings(locale),
    getAwardsMeta(locale),
    getIntakePhase(),
  ])

  // A section the global turns off costs no query. With nothing coming up, the grid shows
  // the latest events that have been, under a heading that says so, rather than a hole.
  const lists = settings.showUpcomingEvents ? await listEvents(locale) : null
  const upcoming = lists?.upcoming.slice(0, HOME_EVENT_COUNT) ?? []
  const showingPast = upcoming.length === 0
  const events = showingPast ? (lists?.past.slice(0, HOME_EVENT_COUNT) ?? []) : upcoming
  const eventsHeading = showingPast
    ? { text: t.home.pastEventsTitle, lang: undefined }
    : settings.eventsHeading

  const langOf = (of: string) => (of === locale ? undefined : of)

  // One untranslated piece of copy is enough for the strip to say so. The home copy and
  // the events' titles and venues all count.
  const contentLocale = resolveContentLocale(
    [
      ...settings.locales,
      ...events.flatMap((event) => [event.contentLocale, event.locationLocale]),
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
        intro={{ text: settings.introText.text, lang: settings.introText.lang }}
      />

      <PageSection aria-labelledby="home-awards" className={styles.awards}>
        <HomeAwardsPhotos />
        <div className={styles.awardsText}>
          <p className={styles.awardsMeta}>{awardsMeta}</p>
          <h2 id="home-awards" className={`h2 ${styles.awardsTitle}`}>
            {t.home.awardsLines.map((line, i) => (
              <Fragment key={i}>
                {i > 0 && ' '}
                <span className={styles.awardsLine}>{line}</span>
              </Fragment>
            ))}
          </h2>
          {/* Until intake opens the teaser is plain text with the date; from the edition's
              opening moment (the awards database, not a constant here) it is a link to
              the submissions page. Home revalidates every five minutes, so the link
              appears within that window of the moment. */}
          {intake === 'open' ? (
            <Link href={localePath('/innsendingar', locale)} className={styles.awardsLink}>
              {t.home.awardsOpenCta}
            </Link>
          ) : (
            <p className={styles.awardsTeaser}>{t.home.awardsTeaser}</p>
          )}
        </div>
      </PageSection>

      {settings.showUpcomingEvents && (
        <PageSection aria-labelledby="home-events" className={styles.events}>
          <PageStickers page="forsida" band="events" locale={locale} />
          <div className={styles.eventsHead}>
            {/* Each word on its own line, as the export sets it. The spaces stay in the
                text so the heading reads as one phrase. */}
            <h2 id="home-events" className={`h2 ${styles.eventsTitle}`} lang={eventsHeading.lang}>
              {eventsHeading.text.split(/\s+/).map((word, i) => (
                <Fragment key={i}>
                  {i > 0 && ' '}
                  <span className={styles.eventsWord}>{word}</span>
                </Fragment>
              ))}
            </h2>
            <div className={styles.eventsAside}>
              <p className={styles.lead} lang={settings.eventsLead.lang}>
                {settings.eventsLead.text}
              </p>
              <ButtonLink
                href={localePath('/vidburdir', locale)}
                lang={settings.eventsLinkLabel.lang}
              >
                {settings.eventsLinkLabel.text}
              </ButtonLink>
            </div>
          </div>

          {events.length === 0 ? (
            <EmptyState title={t.events.empty.title} body={t.events.empty.body} headingLevel={3} />
          ) : (
            <EventZigzag>
              {events.map((event, i) => (
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
            </EventZigzag>
          )}
        </PageSection>
      )}

      <PageSection aria-labelledby="home-about" className={styles.about}>
        <div className={styles.aboutText}>
          <h2 id="home-about" className={`h2 ${styles.aboutTitle}`} lang={settings.aboutHeading.lang}>
            {settings.aboutHeading.text}
          </h2>
          <p className={styles.aboutBody} lang={settings.aboutText.lang}>
            {settings.aboutText.text}
          </p>
          <ButtonLink
            href={localePath('/um-svef', locale)}
            lang={settings.aboutLinkLabel.lang}
            className={styles.aboutButton}
          >
            {settings.aboutLinkLabel.text}
          </ButtonLink>
        </div>
      </PageSection>
    </>
  )
}
