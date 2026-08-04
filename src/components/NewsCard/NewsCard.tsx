import Link from 'next/link'
import styles from './NewsCard.module.scss'

export interface NewsCardProps {
  date: string
  title: string
  excerpt: string
  href: string
}

export function NewsCard({ date, title, excerpt, href }: NewsCardProps) {
  return (
    <Link href={href} className={styles.card}>
      <div className={styles.cover} aria-hidden="true" />
      <span className={styles.date}>{date}</span>
      <span className={styles.title}>{title}</span>
      <span className={styles.excerpt}>{excerpt}</span>
    </Link>
  )
}
