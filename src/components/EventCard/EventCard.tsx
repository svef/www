import Link from 'next/link'
import styles from './EventCard.module.scss'

export interface EventCardLink {
  href: string
  /** Visible label; the arrow is drawn by the component. */
  label: string
}

export interface EventCardProps {
  title: string
  dateLabel: string
  /** Machine-readable form of `dateLabel`, for `<time datetime>`. */
  dateTime?: string
  location?: string
  href?: string
  featured?: boolean
  /**
   * Heading level for the card title. Defaults to 3 — the events grid on the
   * home page and the "Liðnir viðburðir" grid on /vidburdir both sit under a
   * section <h2>.
   */
  headingLevel?: 2 | 3 | 4
  /**
   * A second destination, drawn under the card body — "Myndir frá viðburði →"
   * on a past event.
   *
   * Giving one changes the card's shape rather than adding to it: a card that
   * is itself a link cannot contain another one, so with `secondary` set the
   * card becomes a plain element and `href` moves onto the title. Two labelled
   * links beat one link and a nested one that no keyboard user can reach.
   */
  secondary?: EventCardLink
  /** Language of the title, when it is not the page's. */
  titleLang?: string
  /** Language of the location line, when it is not the page's. */
  locationLang?: string
}

export function EventCard({
  title,
  dateLabel,
  dateTime,
  location,
  href,
  featured,
  headingLevel = 3,
  secondary,
  titleLang,
  locationLang,
}: EventCardProps) {
  const Heading = `h${headingLevel}` as const
  const cn = featured ? `${styles.card} ${styles.featured}` : styles.card

  const date = dateTime ? (
    <time className={styles.date} dateTime={dateTime}>
      {dateLabel}
    </time>
  ) : (
    <span className={styles.date}>{dateLabel}</span>
  )

  const body = (
    <>
      {date}
      <Heading className={styles.title} lang={titleLang}>
        {secondary && href ? (
          <Link href={href} className={styles.titleLink}>
            {title}
          </Link>
        ) : (
          title
        )}
      </Heading>
      {location && (
        <span className={styles.location} lang={locationLang}>
          {location}
        </span>
      )}
    </>
  )

  if (secondary) {
    return (
      <div className={cn}>
        {body}
        <Link href={secondary.href} className={styles.secondary}>
          {secondary.label} <span aria-hidden="true">→</span>
        </Link>
      </div>
    )
  }

  return href ? (
    <Link href={href} className={cn}>
      {body}
    </Link>
  ) : (
    <div className={cn}>{body}</div>
  )
}
