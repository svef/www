import Link from 'next/link'
import styles from './EventRow.module.scss'

export interface EventRowProps {
  day: string
  month: string
  title: string
  description?: string
  href: string
  ctaLabel: string
}

// "Framundan" list row: date badge + title/desc + Nánar link.
export function EventRow({ day, month, title, description, href, ctaLabel }: EventRowProps) {
  return (
    <Link href={href} className={styles.row}>
      <span className={styles.badge}>
        <span className={styles.day}>{day}</span>
        <span className={styles.month}>{month}</span>
      </span>
      <span className={styles.body}>
        <span className={styles.title}>{title}</span>
        {description && <span className={styles.desc}>{description}</span>}
      </span>
      <span className={styles.cta}>{ctaLabel} →</span>
    </Link>
  )
}
