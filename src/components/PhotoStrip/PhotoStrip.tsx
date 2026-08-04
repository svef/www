import styles from './PhotoStrip.module.scss'

// Row of event-photo placeholders. Real images come from Galleries (Media/R2) later.
export function PhotoStrip({ count = 4, label = 'event photo' }: { count?: number; label?: string }) {
  return (
    <div className={styles.strip}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={styles.photo} aria-hidden="true">
          <span className={styles.label}>{label}</span>
        </div>
      ))}
    </div>
  )
}
