import clsx from 'clsx'
import styles from './BoardMemberCard.module.scss'

export type Accent = 'pink' | 'yellow' | 'red' | 'violet'

// Placeholder portrait + rotating accent block + role/name (from the About board design).
export function BoardMemberCard({
  name,
  role,
  accent = 'violet',
}: {
  name: string
  role: string
  accent?: Accent
}) {
  return (
    <div className={styles.card}>
      <div className={styles.photo} aria-hidden="true">
        <span className={styles.corner} />
        <span className={clsx(styles.accent, styles[accent])} />
        <span className={styles.ph}>portrait</span>
      </div>
      <p className={styles.role}>{role}</p>
      <p className={styles.name}>{name}</p>
    </div>
  )
}
