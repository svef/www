import styles from './LandingLogo.module.scss'

const VARIANTS = 10

/**
 * One of the brand's ten logo lockups, picked at random.
 *
 * The choice is made when this module is evaluated, which for a statically
 * prerendered page means **once per build** — so a given deploy always serves the
 * same lockup, and it changes when the site is rebuilt. Picking per visit would
 * mean either rendering the page dynamically or choosing in the browser, and
 * choosing in the browser shows the wrong logo (or none) until JavaScript runs.
 * A stable logo per deploy is the better trade for a one-pager.
 *
 * The lockups are not the same shape — they run from 0.94:1 to 1.53:1 — so the
 * box is fixed and the image is contained inside it. That keeps the hero the
 * same height whichever one a build happens to draw.
 */
export function LandingLogo() {
  const n = 1 + Math.floor(Math.random() * VARIANTS)
  return (
    <img
      className={styles.logo}
      src={`/landing/logo-${n}.png`}
      alt="SVEF — Samtök vefiðnaðarins"
      width={900}
      height={746}
    />
  )
}
