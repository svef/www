import { Fragment } from 'react'
import { notFound } from 'next/navigation'
import { getDictionary, isLocale } from '@/lib/i18n'
import { formatLongDate } from '@/lib/dates'
import { resolveContentLocale } from '@/lib/localized'
import { listGalleries } from '@/lib/content/galleries'
import { TranslationNote } from '@/components/TranslationNote/TranslationNote'
import { PageHead } from '@/components/PageHead/PageHead'
import { PageSection } from '@/components/PageSection/PageSection'
import { EmptyState } from '@/components/EmptyState/EmptyState'
import { PhotoAlbum } from '@/components/PhotoAlbum/PhotoAlbum'
import Link from 'next/link'
import styles from './photos.module.scss'
import { cardMetadata } from '@/lib/og/metadata'

export const generateMetadata = cardMetadata('myndir')

/**
 * Statically prerendered for both locales (`generateStaticParams` lives in the
 * `[locale]` layout) and refreshed by ISR — see the note on `/frettir` and the
 * rendering section of `CLAUDE.md`. Nothing here is per-request: the lightbox
 * and the "show more" paging are the only interactive parts and live in
 * `PhotoAlbum`, a client component the prerendered page hands plain, already
 * resolved data.
 *
 * **Albums are addressed by fragment**, `/is/myndir#album-<id>`, rather than by a
 * route of their own. The fragment is what the events page already links to
 * (`e2e/event.spec.ts` holds that contract), it needs no `generateStaticParams`,
 * and it still works from a link in a message or a newsletter. A route per album
 * would only earn its keep if one album needed its own metadata or preview image,
 * which nothing asks for yet; paging happens inside the page, so it does not need
 * one either.
 */
export const revalidate = 300

export default async function PhotosPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const t = getDictionary(locale)
  const c = t.photos
  // An album with no photos yet is left off the page: a grid of placeholder tiles reads as a
  // broken page, and an album an editor has not filled in is not ready to be shown.
  const albums = (await listGalleries(locale)).filter((album) => album.photos.length > 0)
  const contentLocale = resolveContentLocale(
    albums.flatMap((a) => [a.contentLocale, a.venueLocale]),
    locale,
  )

  return (
    <>
      <TranslationNote pageLocale={locale} contentLocale={contentLocale} />
      <PageHead title={c.title} lede={c.lead} locale={locale} />
      <PageSection last>
        {albums.length === 0 ? (
          <EmptyState title={c.empty.title} body={c.empty.body} />
        ) : (
          albums.map((album, albumIndex) => {
            const headingId = `album-${album.id}`
            const titleLang =
              album.contentLocale === locale ? undefined : album.contentLocale
            // Venue, date, photo count and the event, in the export's order. Each
            // part is dropped when it is missing rather than leaving a stray
            // separator: an album with no related event has no venue and nothing to
            // link to, and one whose photos are not uploaded yet has no count.
            const meta = [
              album.venue && (
                <span
                  key="venue"
                  lang={album.venueLocale === locale ? undefined : album.venueLocale}
                >
                  {album.venue}
                </span>
              ),
              album.date && (
                <time key="date" dateTime={album.date}>
                  {formatLongDate(album.date, locale)}
                </time>
              ),
              album.photos.length > 0 && (
                <span key="count">{c.photoCount(album.photos.length)}</span>
              ),
              album.eventHref && (
                <Link key="event" href={album.eventHref}>
                  {c.toEvent}
                </Link>
              ),
            ].filter(Boolean)

            return (
              // A named region per album, so the grid a screen-reader user lands
              // in says which album it belongs to.
              <section
                key={album.id}
                className={styles.album}
                aria-labelledby={headingId}
              >
                <div className={styles.head}>
                  <h2 id={headingId} className={styles.title} lang={titleLang}>
                    {album.title}
                  </h2>
                  {meta.length > 0 && (
                    <p className={styles.meta}>
                      {meta.map((part, i) => (
                        <Fragment key={i}>
                          {i > 0 && <span aria-hidden="true">·</span>}
                          {part}
                        </Fragment>
                      ))}
                    </p>
                  )}
                </div>
                <PhotoAlbum
                  title={album.title}
                  photos={album.photos}
                  colorOffset={albumIndex}
                  labels={{
                    view: c.viewPhoto,
                    prev: c.prevPhoto,
                    next: c.nextPhoto,
                    close: t.close,
                    placeholder: c.placeholder,
                    showMore: c.showMore,
                    shown: c.shown,
                    counter: c.counter,
                  }}
                />
              </section>
            )
          })
        )}
      </PageSection>
    </>
  )
}
