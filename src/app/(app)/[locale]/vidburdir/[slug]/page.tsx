import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getDictionary, isLocale, localePath, type Locale } from '@/lib/i18n'
import { resolveContentLocale } from '@/lib/localized'
import { contactEmail, findEvent, listEventSlugs, nextEventSlug } from '@/lib/content/events'
import { RichText } from '@/components/RichText/RichText'
import { TranslationNote } from '@/components/TranslationNote/TranslationNote'
import { Button } from '@/components/Button/Button'
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
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const slugs = await listEventSlugs()
  return slugs.map((slug) => ({ slug }))
}

/** Resolve the params once, 404ing on an unknown locale or slug. */
async function loadEvent(params: Params) {
  const { locale, slug } = await params
  if (!isLocale(locale)) notFound()
  const event = await findEvent(slug, locale)
  if (!event) notFound()
  return { event, locale: locale as Locale }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { event } = await loadEvent(params)
  return {
    title: event.title,
    description: event.summary ?? event.meta ?? undefined,
  }
}

export default async function EventPage({ params }: { params: Params }) {
  const { event, locale } = await loadEvent(params)
  const t = getDictionary(locale)
  const [nextSlug, email] = await Promise.all([nextEventSlug(), contactEmail()])
  const isNext = nextSlug === event.slug

  // Title, venue, body and accessibility note are separately localized fields
  // that a translator lands one at a time, so each is marked on its own rather
  // than the page claiming one language for all of it.
  const lang = (fieldLocale: Locale) => (fieldLocale === locale ? undefined : fieldLocale)
  const contentLocale = resolveContentLocale(
    [event.contentLocale, event.metaLocale, event.bodyLocale, event.accessibilityLocale],
    locale,
  )

  // Photos attached to an event that has not happened yet are from the last
  // time it ran — the design's "Myndir frá síðasta ári" on the 2026 awards.
  // Once it is over they are photos of the event itself.
  const photosTitle = event.isPast ? t.events.photosTitle : t.events.photosFromLastYear

  return (
    <>
      <TranslationNote pageLocale={locale} contentLocale={contentLocale} />

      <div className={styles.backBar}>
        <Link className={styles.back} href={localePath('/vidburdir', locale)}>
          <span aria-hidden="true">←</span> {t.events.backToIndex}
        </Link>
      </div>

      <article>
        <header className={styles.hero}>
          {/* The brand's block motif, decorative only. */}
          <span className={styles.blockLarge} aria-hidden="true" />
          <span className={styles.blockSmall} aria-hidden="true" />

          <div className={styles.heroInner}>
            {isNext && <p className={styles.eyebrow}>{t.events.nextEvent}</p>}
            <h1 className={styles.title} lang={lang(event.contentLocale)}>
              {event.title}
            </h1>
            <div className={styles.metaRow}>
              <time dateTime={event.startDate}>{event.dateLabel}</time>
              {event.timeRange && <span>{event.timeRange}</span>}
              {event.location && <span lang={lang(event.metaLocale)}>{event.location}</span>}
            </div>
            {/* The discount note annotates the button, so it stands or falls
                with it — on its own it would be a claim about a price the
                reader cannot act on, and the sidebar prints both prices
                anyway. */}
            {event.ticketUrl && (
              <div className={styles.ctaRow}>
                <Button href={event.ticketUrl}>
                  {event.ticketPrice
                    ? `${t.events.buyTickets} — ${event.ticketPrice}`
                    : t.events.buyTickets}
                </Button>
                {event.memberDiscount !== null && (
                  <p className={styles.discount}>
                    {t.events.memberDiscount.replace('{percent}', String(event.memberDiscount))}
                  </p>
                )}
              </div>
            )}
          </div>
        </header>

        <div className={styles.body}>
          <div className={styles.main}>
            {event.cover ? (
              <Image
                className={styles.cover}
                src={event.cover.url}
                alt={event.cover.alt}
                width={event.cover.width ?? 1200}
                height={event.cover.height ?? 675}
                priority
              />
            ) : (
              <div className={styles.cover} aria-hidden="true" />
            )}

            <RichText data={event.body} className={styles.prose} lang={lang(event.bodyLocale)} />

            {event.photos.length > 0 && (
              <section className={styles.photos}>
                <h2 className={styles.photosTitle}>{photosTitle}</h2>
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
              </section>
            )}
          </div>

          <aside className={styles.aside}>
            <span className={styles.asideBlock} aria-hidden="true" />
            <div className={styles.asideInner}>
              <h2 className={styles.asideTitle}>{t.events.practical.title}</h2>
              <dl className={styles.facts}>
                {(event.location || event.venueAddress) && (
                  <div className={styles.fact}>
                    <dt className={styles.factKey}>{t.events.practical.venue}</dt>
                    <dd className={styles.factValue}>
                      {event.location && <span lang={lang(event.metaLocale)}>{event.location}</span>}
                      {event.location && event.venueAddress && <br />}
                      {event.venueAddress}
                    </dd>
                  </div>
                )}

                {event.ticketPrice && (
                  <div className={styles.fact}>
                    <dt className={styles.factKey}>{t.events.practical.price}</dt>
                    <dd className={styles.factValue}>
                      {event.memberPrice
                        ? `${event.ticketPrice} · ${t.events.practical.members} ${event.memberPrice}`
                        : event.ticketPrice}
                    </dd>
                  </div>
                )}

                {event.accessibility && (
                  <div className={styles.fact}>
                    <dt className={styles.factKey}>{t.events.practical.accessibility}</dt>
                    <dd className={styles.factValue} lang={lang(event.accessibilityLocale)}>
                      {event.accessibility}
                    </dd>
                  </div>
                )}

                <div className={styles.fact}>
                  <dt className={styles.factKey}>{t.events.practical.questions}</dt>
                  <dd className={styles.factValue}>
                    <a className={styles.mail} href={`mailto:${email}`}>
                      {email}
                    </a>
                  </dd>
                </div>
              </dl>

              {event.ticketUrl && (
                <Button href={event.ticketUrl} className={styles.asideCta}>
                  {t.events.buyTickets}
                </Button>
              )}
            </div>
          </aside>
        </div>
      </article>
    </>
  )
}
