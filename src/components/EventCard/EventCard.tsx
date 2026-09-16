import Link from 'next/link'
import styles from './EventCard.module.scss'

export interface EventCardProps {
  title: string
  dateLabel: string
  location?: string
  href?: string
  featured?: boolean
  /**
   * Heading level for the card title. Defaults to 3 — the only current usage is
   * the events grid on the home page, which sits under a section <h2>.
   */
  headingLevel?: 2 | 3 | 4
}

export function EventCard({
  title,
  dateLabel,
  location,
  href,
  featured,
  headingLevel = 3,
}: EventCardProps) {
  const Heading = `h${headingLevel}` as const
  const body = (
    <>
      <span className={styles.date}>{dateLabel}</span>
      <Heading className={styles.title}>{title}</Heading>
      {location && <span className={styles.location}>{location}</span>}
    </>
  )
  const cn = featured ? `${styles.card} ${styles.featured}` : styles.card
  return href ? (
    <Link href={href} className={cn}>
      {body}
    </Link>
  ) : (
    <div className={cn}>{body}</div>
  )
}
