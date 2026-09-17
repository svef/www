import { Fragment } from 'react'
import { notFound } from 'next/navigation'
import { getDictionary, isLocale } from '@/lib/i18n'
import { formatLongDate } from '@/lib/dates'
import { resolveContentLocale } from '@/lib/localized'
import { listGalleries } from '@/lib/content/galleries'
import { TranslationNote } from '@/components/TranslationNote/TranslationNote'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { Section } from '@/components/Section/Section'
import { EmptyState } from '@/components/EmptyState/EmptyState'
import { Gallery } from '@/components/Gallery/Gallery'
import styles from './photos.module.scss'

/**
 * Statically prerendered for both locales (`generateStaticParams` lives in the
 * `[locale]` layout) and refreshed by ISR — see the note on `/frettir` and the
 * rendering section of `CLAUDE.md`. Nothing here is per-request: the lightbox
 * is the only interactive part and it lives in `Gallery`, a client component
 * the prerendered page hands plain, already-resolved data.
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
  const albums = await listGalleries(locale)
  const contentLocale = resolveContentLocale(
    albums.flatMap((a) => [a.contentLocale, a.venueLocale]),
    locale,
  )

  return (
    <>
      <TranslationNote pageLocale={locale} contentLocale={contentLocale} />
      <PageHeader title={c.title} lead={c.lead} />
      <Section>
        {albums.length === 0 ? (
          <EmptyState title={c.empty.title} body={c.empty.body} />
        ) : (
          albums.map((album) => {
            const headingId = `album-${album.id}`
            // Venue, date and photo count, in the export's order. Each part is
            // dropped when it is missing rather than leaving a stray separator:
            // an album with no related event has no venue, and one whose photos
            // are not uploaded yet has no count to give.
            const meta = [
              album.venue && (
                <span key="venue" lang={album.venueLocale === locale ? undefined : album.venueLocale}>
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
            ].filter(Boolean)

            return (
              // A named region per album, so the grid a screen-reader user lands
              // in says which album it belongs to.
              <section key={album.id} className={styles.album} aria-labelledby={headingId}>
                <div className={styles.head}>
                  <h2
                    id={headingId}
                    className={styles.title}
                    lang={album.contentLocale === locale ? undefined : album.contentLocale}
                  >
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
                  <div className={styles.rule} aria-hidden="true" />
                </div>
                <Gallery
                  photos={album.photos}
                  viewLabel={c.viewPhoto}
                  prevLabel={c.prevPhoto}
                  nextLabel={c.nextPhoto}
                  closeLabel={t.close}
                />
              </section>
            )
          })
        )}
      </Section>
    </>
  )
}
