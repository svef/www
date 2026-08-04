import Link from 'next/link'
import styles from './EventCard.module.scss'

export interface EventCardProps {
  title: string
  dateLabel: string
  location?: string
  href?: string
  featured?: boolean
}

export function EventCard({ title, dateLabel, location, href, featured }: EventCardProps) {
  const body = (
    <>
      <span className={styles.date}>{dateLabel}</span>
      <span className={styles.title}>{title}</span>
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
