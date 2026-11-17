import type { Locale } from '@/lib/i18n'
import type { EventSponsor } from '@/lib/content/events-mapping'
import styles from './EventSponsors.module.scss'

export type { EventSponsor }

export interface EventSponsorsProps {
  sponsors: EventSponsor[]
  /** Heading of the block, e.g. "Samstarfsaðilar". Visible, so the logos are a named section. */
  title: string
  /** The page's language, to mark a label that fell back to Icelandic. */
  locale: Locale
}

/**
 * Groups neighbouring sponsors that carry the same label, so "Beverages sponsored by" is
 * printed once above its three logos, as on the screensaver, rather than three times.
 */
function groupByLabel(sponsors: EventSponsor[]) {
  const groups: { label: string | null; labelLocale: Locale; items: EventSponsor[] }[] = []
  for (const sponsor of sponsors) {
    const last = groups[groups.length - 1]
    if (last && last.label === sponsor.label) last.items.push(sponsor)
    else groups.push({ label: sponsor.label, labelLocale: sponsor.labelLocale, items: [sponsor] })
  }
  return groups
}

/**
 * An event's sponsors: rows of logos normalised by height (`public/skjar/svef-x-aranja.html`
 * does the same on the screensaver). Normalising by height, with the width left to the
 * file, is what makes a mixed row of wide wordmarks and near-square marks read as one line.
 *
 * A logo is a plain image, not `next/image`: sponsors upload SVG, PNG and WebP in any
 * proportion, SVG needs no resizing, and the width is whatever the height makes it.
 * Renders nothing when there are no sponsors.
 */
export function EventSponsors({ sponsors, title, locale }: EventSponsorsProps) {
  if (sponsors.length === 0) return null
  const groups = groupByLabel(sponsors)

  return (
    <section className={styles.sponsors} aria-labelledby="event-sponsors-title">
      <h2 id="event-sponsors-title" className={styles.title}>
        {title}
      </h2>
      {groups.map((group, g) => (
        <div key={g} className={styles.group}>
          {group.label && (
            <p className={styles.label} lang={group.labelLocale === locale ? undefined : group.labelLocale}>
              {group.label}
            </p>
          )}
          <ul className={styles.logos}>
            {group.items.map((sponsor, i) => {
              const img = (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className={styles.logo}
                  src={sponsor.logo.url}
                  alt={sponsor.name}
                  width={sponsor.logo.width ?? undefined}
                  height={sponsor.logo.height ?? undefined}
                  loading="lazy"
                />
              )
              return (
                <li key={`${sponsor.name}-${i}`}>
                  {sponsor.url ? (
                    <a className={styles.link} href={sponsor.url} rel="noopener">
                      {img}
                    </a>
                  ) : (
                    img
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </section>
  )
}
