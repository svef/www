import Link from 'next/link'
import styles from './EventRow.module.scss'

export interface EventRowProps {
  /** Day number shown in the badge, e.g. "09". Presentational only. */
  day: string
  /** Short month shown in the badge, e.g. "okt". Presentational only. */
  month: string
  /** Machine-readable date for the badge, e.g. "2026-10-09". */
  dateTime: string
  /** Full readable date announced in place of the badge, e.g. "9. október 2026". */
  dateLabel: string
  title: string
  description?: string
  href: string
  ctaLabel: string
  /**
   * Heading level for the row title. Defaults to 3 — the only current usage is
   * the "Framundan" list on /vidburdir, which sits under a section <h2>.
   */
  headingLevel?: 2 | 3 | 4
}

// "Framundan" list row: date badge + title/desc + Nánar link.
export function EventRow({
  day,
  month,
  dateTime,
  dateLabel,
  title,
  description,
  href,
  ctaLabel,
  headingLevel = 3,
}: EventRowProps) {
  const Heading = `h${headingLevel}` as const

  return (
    <Link href={href} className={styles.row}>
      <time className={styles.badge} dateTime={dateTime}>
        <span className={styles.day} aria-hidden="true">
          {day}
        </span>
        <span className={styles.month} aria-hidden="true">
          {month}
        </span>
        {/* Global visually-hidden helper — see .sr-only in src/styles/globals.scss. */}
        <span className="sr-only">{dateLabel}</span>
      </time>
      <div className={styles.body}>
        <Heading className={styles.title}>{title}</Heading>
        {description && <span className={styles.desc}>{description}</span>}
      </div>
      <span className={styles.cta}>{ctaLabel} →</span>
    </Link>
  )
}
