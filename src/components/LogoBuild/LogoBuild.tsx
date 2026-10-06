import styles from './LogoBuild.module.scss'

// Hero centerpiece: the real SVEF logo assembling from its exported Figma pieces
// (blocks → letterforms). Pure-CSS stagger; reduced-motion shows final state.
// The tagline lockup is deliberately not drawn here: the association name is
// already the accessible name below, and the hero reads cleaner without it.
export function LogoBuild() {
  return (
    <div className={styles.logo} role="img" aria-label="SVEF — Samtök vefiðnaðarins">
      <span className={styles.b03} style={{ top: '21.25%', right: '16.5%', bottom: '39.75%', left: '50%' }}>
        <img src="/landing/anim-03.svg" alt="" />
      </span>
      <span className={styles.b02} style={{ top: '38%', right: '31.75%', bottom: '28.75%', left: '19.5%' }}>
        <img src="/landing/anim-02.svg" alt="" />
      </span>
      <span className={styles.b01} style={{ top: '43.5%', right: '31.75%', bottom: '23.75%', left: '30%' }}>
        <img src="/landing/anim-01.svg" alt="" />
      </span>
      <span className={styles.l1} style={{ top: '62.11%', right: '58.06%', bottom: '28.99%', left: '34.58%' }}>
        <img src="/landing/anim-s.svg" alt="" />
      </span>
      <span className={styles.l2} style={{ top: '62.24%', right: '49.45%', bottom: '29.12%', left: '42.06%' }}>
        <img src="/landing/anim-v.svg" alt="" />
      </span>
      <span className={styles.l3} style={{ top: '62.24%', right: '42.28%', bottom: '29.12%', left: '51.42%' }}>
        <img src="/landing/anim-e.svg" alt="" />
      </span>
      <span className={styles.l4} style={{ top: '62.24%', right: '35.17%', bottom: '29.12%', left: '58.78%' }}>
        <img src="/landing/anim-f.svg" alt="" />
      </span>
    </div>
  )
}
