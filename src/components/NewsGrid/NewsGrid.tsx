import type { ReactNode } from 'react'
import styles from './NewsGrid.module.scss'

/** The news grid: one column, two from 640px, three from 1080px, 20px apart. Holds `NewsCard`s. */
export function NewsGrid({ children }: { children: ReactNode }) {
  return <div className={styles.grid}>{children}</div>
}
