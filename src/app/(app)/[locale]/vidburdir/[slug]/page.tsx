import type { Metadata } from 'next'
import { socialMetadata } from '@/lib/og/metadata'
import Image from 'next/image'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowRight } from '@phosphor-icons/react/dist/ssr'
import { getDictionary, isLocale, localePath, type Locale } from '@/lib/i18n'
import { resolveContentLocale } from '@/lib/localized'
import {
  contactEmail,
  findEvent,
  listEvents,
  listEventSlugs,
  nextEventSlug,
} from '@/lib/content/events'
import { RichText } from '@/components/RichText/RichText'
import { TranslationNote } from '@/components/TranslationNote/TranslationNote'
import { Shape } from '@/components/Shape/Shape'
import { Notch } from '@/components/Shape/Notch'
import { ButtonLink } from '@/components/ButtonLink/ButtonLink'
import { PageHead } from '@/components/PageHead/PageHead'
import { PageSection } from '@/components/PageSection/PageSection'
import { GrowText } from '@/components/GrowText/GrowText'
import { EventPoster } from '@/components/EventPoster/EventPoster'
import { EventsCarousel } from '@/components/EventsCarousel/EventsCarousel'
import { EventSponsors } from '@/components/EventSponsors/EventSponsors'
import styles from './event.module.scss'

type Params = Promise<{ locale: string; slug: string }>

/**
 * Same five minutes as every other Payload-backed route; see the note on
 * `/frettir/page.tsx` for the reasoning, and `CLAUDE.md` for why it is a floor
 * rather than a deadline.
 *
 * What goes stale here is small and self-correcting: the "NÆSTI VIÐBURÐUR"
 * eyebrow is a position in a sorted list, so for up to one window after an
 * event ends its page still claims to be the next one. The alternative —
 * rendering every event page on every request — is a database round trip per
 * visitor to keep one line of eyebrow text honest.
 */
export const revalidate = 300

/**
 * Prerender every event.
 *
 * Every one, past included, and that is the difference from `/frettir/[slug]`:
 * news has `publishedAt` and a scheduled article must not be written into the
 * build output, so its list is filtered. An event has no such switch — it
 * happens, and afterwards its page is the archive record with the photos on it
 * — so there is no filter here to keep in step with the page.
 *
 * The parent `[locale]` layout generates the locale params and Next crosses
 * them with this list, so this returns only its own segment. Event slugs are
 * not localized, so it is one list rather than a per-locale one: unlike the
 * awards winners archive, there is no event that exists in Icelandic only.
 *
 * `listEventSlugs` passes `pagination: false`; without it Payload's default
 * `limit: 10` would silently prerender the first ten events and leave the rest
 * to `dynamicParams` with no visible symptom.
 */
// Next calls this once per parent param set and passes those params in, so the
// slugs are the ones for the locale being built. They differ per locale now
// that `slug` is localized.
export async function generateStaticParams({
  params,
}: {
  params: { locale: string }
}): Promise<{ slug: string }[]> {
  if (!isLocale(params.locale)) return []
  const slugs = await listEventSlugs(params.locale)
  return slugs.map((slug) => ({ slug }))
}

/** Resolve the params once, 404ing on an unknown locale or slug. */
async function loadEvent(params: Params) {
  const { locale, slug } = await params
  if (!isLocale(locale)) notFound()
  const event = await findEvent(slug, locale)
  if (!event) notFound()
  // The lookup matches the slug in either language, so a link carrying the
  // other locale's slug still finds its event. One address per page, though:
  // send it to the slug this locale actually uses.
  if (event.slug !== slug) redirect(event.href)
  return { event, locale: locale as Locale }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { event, locale } = await loadEvent(params)
  const description = event.summary ?? event.meta ?? undefined
  return {
    title: event.title,
    description,
    ...socialMetadata({
      locale,
      card: 'vidburdir',
      title: event.title,
      description,
      path: event.href,
    }),
  }
}

/** The most posters the "more events" carousel carries. */
const MORE_EVENTS = 6

/** Google Maps search for the venue: a link, not an embed, so the page loads nothing of theirs. */
function mapUrl(...parts: (string | null)[]): string {
  const query = parts.filter(Boolean).join(', ')
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

export default async function EventPage({ params }: { params: Params }) {
  const { event, locale } = await loadEvent(params)
  const t = getDictionary(locale)
  const [nextSlug, email, lists] = await Promise.all([
    nextEventSlug(locale),
    contactEmail(),
    listEvents(locale),
  ])
  const isNext = nextSlug === event.slug
  const more = lists.upcoming.filter((e) => e.slug !== event.slug).slice(0, MORE_EVENTS)

  // Title, venue, body and accessibility note are separately localized fields
  // that a translator lands one at a time, so each is marked on its own rather
  // than the page claiming one language for all of it.
  const lang = (fieldLocale: Locale) => (fieldLocale === locale ? undefined : fieldLocale)
  const contentLocale = resolveContentLocale(
    [
      event.contentLocale,
      event.metaLocale,
      event.bodyLocale,
      event.accessibilityLocale,
      ...event.sponsors.filter((s) => s.label).map((s) => s.labelLocale),
    ],
    locale,
  )

  // Photos attached to an event that has not happened yet are from the last
  // time it ran — the design's "Myndir frá síðasta ári" on the 2026 awards.
  // Once it is over they are photos of the event itself.
  const photosTitle = event.isPast ? t.events.photosTitle : t.events.photosFromLastYear
  const albumHref =
    event.galleryId !== null
      ? `${localePath('/myndir', locale)}#album-${event.galleryId}`
      : null

  // A ticket on sale for something that is over is a dead end.
  const ticketUrl = event.isPast ? null : event.ticketUrl

  return (
    <>
      <TranslationNote pageLocale={locale} contentLocale={contentLocale} />

      <article>
        <PageHead
          long
          title={event.title}
          titleLang={lang(event.contentLocale)}
          locale={locale}
          seed={event.slug}
          crumb={{
            href: localePath('/vidburdir', locale),
            label: t.events.back,
            ariaLabel: t.events.backLabel,
          }}
          eyebrow={isNext ? t.events.nextEvent : undefined}
        >
          {/* The export's `.meta` pills: black blocks on the violet band, then the ticket button. */}
          <div className={styles.meta}>
            <time dateTime={event.startDate}>{event.dateLabel}</time>
            {event.timeRange && <span>{event.timeRange}</span>}
            {event.location && <span lang={lang(event.locationLocale)}>{event.location}</span>}
          </div>
          {ticketUrl && (
            <div>
              <ButtonLink href={ticketUrl}>{t.events.buyTickets}</ButtonLink>
            </div>
          )}
        </PageHead>

        <PageSection className={styles.body}>
          <div className={styles.text}>
            {event.cover && (
              <Image
                className={styles.cover}
                src={event.cover.url}
                alt={event.cover.alt}
                width={event.cover.width ?? 1200}
                height={event.cover.height ?? 675}
                priority
              />
            )}

            <RichText data={event.body} lang={lang(event.bodyLocale)} />

            <EventSponsors
              sponsors={event.sponsors}
              title={t.events.sponsorsTitle}
              locale={locale}
            />

            {albumHref && (
              <Link className={styles.album} href={albumHref}>
                <GrowText>{t.events.photosFromEvent}</GrowText>
                <ArrowRight weight="bold" aria-hidden="true" />
              </Link>
            )}
          </div>

          {/* The export's yellow `.facts` card (violet once the event is over). */}
          <Shape
            as="aside"
            color={event.isPast ? 'violet' : 'yellow'}
            auto={['tr']}
            seed={event.slug}
            className={styles.facts}
            aria-label={t.events.practical.title}
          >
            <Notch corner="tl" className={styles.factsTitle}>
              <h2>{t.events.practical.title}</h2>
            </Notch>
            <dl>
              {(event.location || event.venueAddress) && (
                <div>
                  <dt>{t.events.practical.venue}</dt>
                  <dd>
                    {event.location && <span lang={lang(event.locationLocale)}>{event.location}</span>}
                    {event.venueAddress && (
                      <>
                        {event.location && <br />}
                        {event.venueAddress}
                      </>
                    )}
                    <br />
                    <a href={mapUrl(event.location, event.venueAddress)}>{t.events.practical.openMap}</a>
                  </dd>
                </div>
              )}

              {event.ticketPrice && (
                <div>
                  <dt>{t.events.practical.price}</dt>
                  <dd>
                    {event.memberPrice
                      ? `${event.ticketPrice} · ${t.events.practical.members} ${event.memberPrice}`
                      : event.ticketPrice}
                  </dd>
                </div>
              )}

              {event.accessibility && (
                <div>
                  <dt>{t.events.practical.accessibility}</dt>
                  <dd lang={lang(event.accessibilityLocale)}>{event.accessibility}</dd>
                </div>
              )}

              <div>
                <dt>{t.events.practical.questions}</dt>
                <dd>
                  <a href={`mailto:${email}`}>{email}</a>
                </dd>
              </div>
            </dl>

            {ticketUrl && (
              <>
                <a className={styles.cta} href={ticketUrl}>
                  <GrowText>{t.events.buyTickets}</GrowText>
                </a>
                {event.memberDiscount !== null && (
                  <p className={styles.discount}>
                    {t.events.memberDiscount.replace('{percent}', String(event.memberDiscount))}
                  </p>
                )}
              </>
            )}
          </Shape>
        </PageSection>

        {event.photos.length > 0 && (
          <PageSection aria-labelledby="event-photos">
            <h2 id="event-photos" className={`h2 ${styles.sectionTitle}`}>
              {photosTitle}
            </h2>
            <div className={styles.photoGrid}>
              {event.photos.map((photo) => (
                <Image
                  key={photo.url}
                  className={styles.photo}
                  src={photo.url}
                  alt={photo.alt}
                  width={photo.width ?? 400}
                  height={photo.height ?? 400}
                />
              ))}
            </div>
          </PageSection>
        )}

        {more.length > 0 && (
          <PageSection aria-labelledby="more-events" last>
            <h2 id="more-events" className={`h2 ${styles.sectionTitle}`}>
              {t.events.moreTitle}
            </h2>
            <EventsCarousel
              label={t.events.carouselLabel}
              dotLabel={t.events.dotLabel}
            >
              {more.map((other) => (
                <EventPoster
                  key={other.slug}
                  // The poster's place in the full list, so it wears the look it has on the index.
                  index={lists.upcoming.findIndex((e) => e.slug === other.slug)}
                  href={other.href}
                  title={other.title}
                  date={other.shortDate}
                  dateTime={other.startDate}
                  meta={other.posterMeta}
                  titleLang={lang(other.contentLocale)}
                  metaLang={lang(other.locationLocale)}
                />
              ))}
            </EventsCarousel>
          </PageSection>
        )}
      </article>
    </>
  )
}
