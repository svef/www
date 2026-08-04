import styles from './Logo.module.scss'

// Placeholder brand mark (real SVG logo TBD): a blocky violet glyph + SVEF wordmark tag.
export function Logo({ label = 'SVEF' }: { label?: string }) {
  return (
    <span className={styles.logo}>
      <span className={styles.mark} aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span className={styles.word}>{label}</span>
    </span>
  )
}
