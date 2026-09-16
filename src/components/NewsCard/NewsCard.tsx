import Link from 'next/link'
import styles from './NewsCard.module.scss'

export interface NewsCardProps {
  date: string
  title: string
  excerpt: string
  href: string
  /**
   * Heading level for the card title. Defaults to 2 — the news grid on /frettir
   * sits directly under the page <h1> with no section heading in between.
   */
  headingLevel?: 2 | 3 | 4
}

export function NewsCard({
  date,
  title,
  excerpt,
  href,
  headingLevel = 2,
}: NewsCardProps) {
  const Heading = `h${headingLevel}` as const

  return (
    <Link href={href} className={styles.card}>
      <div className={styles.cover} aria-hidden="true" />
      <span className={styles.date}>{date}</span>
      <Heading className={styles.title}>{title}</Heading>
      <span className={styles.excerpt}>{excerpt}</span>
    </Link>
  )
}
