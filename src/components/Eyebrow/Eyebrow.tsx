import type { ReactNode } from 'react'
import styles from './Eyebrow.module.scss'

// Uppercase, wide-tracked violet label above headings (e.g. "SAMTÖK VEFIÐNAÐARINS · SÍÐAN 2005").
export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className={styles.eyebrow}>{children}</p>
}
