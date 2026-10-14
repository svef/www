import clsx from 'clsx'
import { Eyebrow } from '@/components/Eyebrow/Eyebrow'
import { Button } from '@/components/Button/Button'
import styles from './SpotlightRow.module.scss'

interface Cta {
  label: string
  href: string
}

// Text + spotlight image panel (the "happening now" pattern from the design).
export function SpotlightRow({
  eyebrow,
  title,
  titleLang,
  body,
  bodyLang,
  primary,
  secondary,
  tone = 'panel',
}: {
  eyebrow?: string
  title: string
  /**
   * Language of the title, when it is not the page's.
   *
   * Events are written in Icelandic and most have no English, so on `/en` this
   * heading is routinely Icelandic text inside an English document. Unmarked,
   * a screen reader reads it in an English voice — and this is the first
   * heading on the home page, so it is the first thing that happens. The sister
   * components (`EventRow`, `WinnerCard`, `Hero`) have taken this since #18;
   * `SpotlightRow` was the one that did not (svef/www#90).
   */
  titleLang?: string
  body?: string
  /**
   * Language of the body, separately from the title: the two come from
   * different fields and fall back independently.
   */
  bodyLang?: string
  primary?: Cta
  secondary?: Cta
  /**
   * Which surface the spotlight sits on.
   *
   * `panel` is the dark treatment used on `/vidburdir` — the violet-tinted
   * surface with a violet hairline. `inverted` is the home page's: a Shy White
   * panel with dark text, the one place on the site where the brand's inverted
   * treatment appears. Both are in the design export; the component previously
   * rendered neither and sat on the page background instead (svef/www#90).
   */
  tone?: 'panel' | 'inverted'
}) {
  return (
    // The violet block is hung off the frame, not the panel, so it can sit
    // outside the panel's edge the way the export draws it.
    <div className={styles.frame}>
      <div className={styles.blockViolet} aria-hidden="true" />
      <div className={clsx(styles.panel, tone === 'inverted' && styles.inverted)}>
        <div className={styles.text}>
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          <h2 className={styles.title} lang={titleLang}>
            {title}
          </h2>
          {body && (
            <p className={styles.body} lang={bodyLang}>
              {body}
            </p>
          )}
          {(primary || secondary) && (
            <div className={styles.ctas}>
              {primary && <Button href={primary.href}>{primary.label}</Button>}
              {secondary && (
                <Button variant="secondary" href={secondary.href}>
                  {secondary.label}
                </Button>
              )}
            </div>
          )}
        </div>
        <div className={styles.media}>
          <div className={styles.blockPink} aria-hidden="true" />
          <div className={styles.image} aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}
