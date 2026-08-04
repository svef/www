import clsx from 'clsx'
import styles from './BoardCard.module.scss'

export type Accent = 'violet' | 'pink' | 'yellow' | 'red'

export interface BoardCardProps {
  name: string
  role: string
  accent?: Accent
}

// Portrait placeholder (image from Media/R2 later) with a violet corner block and a
// rotating accent block, then role + name.
export function BoardCard({ name, role, accent = 'violet' }: BoardCardProps) {
  return (
    <figure className={styles.card}>
      <div className={styles.photo} aria-hidden="true">
        <span className={styles.cornerTop} />
        <span className={clsx(styles.cornerBottom, styles[accent])} />
      </div>
      <figcaption className={styles.caption}>
        <span className={styles.role}>{role}</span>
        <span className={styles.name}>{name}</span>
      </figcaption>
    </figure>
  )
}
