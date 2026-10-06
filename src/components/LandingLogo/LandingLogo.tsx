import styles from './LandingLogo.module.scss'

const VARIANTS = 10
const FALLBACK = 1

/**
 * One of the brand's ten logo lockups, picked at random on every visit.
 *
 * The page is statically prerendered, so the server cannot choose per visitor
 * and React cannot either: picking during render would differ between the
 * server's HTML and the client's, and picking in an effect would show one
 * lockup and then swap it after hydration.
 *
 * So the markup ships a real lockup — someone with JavaScript off, or a crawler,
 * sees variant 1 rather than a blank space — and the small script below rewrites
 * the `src` while the document is still parsing, before anything is painted.
 * `suppressHydrationWarning` tells React the attribute is deliberately not the
 * one it rendered, so hydration leaves it alone.
 */
export function LandingLogo() {
  const pick = `(function(){var i=document.currentScript.previousElementSibling;i.src='/landing/logo-'+(1+Math.floor(Math.random()*${VARIANTS}))+'.svg'})()`
  return (
    <span className={styles.wrap}>
      <img
        className={styles.logo}
        src={`/landing/logo-${FALLBACK}.svg`}
        alt="SVEF — Samtök vefiðnaðarins"
        width={625}
        height={518}
        suppressHydrationWarning
      />
      <script dangerouslySetInnerHTML={{ __html: pick }} />
    </span>
  )
}
