import styles from './LogoBuild.module.scss'

// Hero centerpiece: the blocky SVEF mark assembling, then the wordmark + tagline
// revealing. Pure-CSS keyframes (no JS); reduced-motion shows the final state.
// NOTE: blocky approximation of the mark — the exact vector logo is a TBD asset.
export function LogoBuild() {
  return (
    <div
      className={styles.logo}
      role="img"
      aria-label="SVEF — Samtök vefiðnaðarins"
    >
      <div className={styles.mark} aria-hidden="true">
        <span className={styles.b1} />
        <span className={styles.b2} />
        <span className={styles.b3} />
        <span className={styles.word}>SVEF</span>
      </div>
      <span className={styles.tagline} aria-hidden="true">
        Samtök vefiðnaðarins
      </span>
    </div>
  )
}
