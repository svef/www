import clsx from 'clsx'
import Image from 'next/image'
import styles from './WinnerCard.module.scss'

/**
 * The accent block in the card's top-right corner.
 *
 * Positional, not meaningful: the design rotates the four brand accents across a
 * grid so no two neighbours match. Nothing about a winner decides its colour, so
 * the caller rotates — `ACCENTS[i % ACCENTS.length]` — exactly as `/um-svef`
 * does for the board.
 */
export type WinnerAccent = 'pink' | 'yellow' | 'red' | 'violet'

/** Every accent, in the order the design rotates them. Exported for callers. */
export const WINNER_ACCENTS: readonly WinnerAccent[] = ['pink', 'yellow', 'red', 'violet']

export interface WinnerScreenshot {
  url: string
  /**
   * The Media document's own alt text, or `''` when it has none.
   *
   * Empty is the normal case and is correct: the card names the site directly
   * below the screenshot, so alt text repeating the domain would have a screen
   * reader say it twice and describe nothing. An editor who writes alt text is
   * describing the design in the shot — that is what gets announced.
   */
  alt: string
  width: number | null
  height: number | null
}

export interface WinnerCardProps {
  /** Winning site, written as its domain — "nafn.is". The card's heading. */
  siteName: string
  /** Category name, resolved for the reader's locale. Uppercased in CSS. */
  category: string
  /** The awards year, printed after the category as `CATEGORY YEAR`. */
  year: number
  /**
   * The jury's note on the winner.
   *
   * Optional, and often absent: the winners archive is being filled in from the
   * association's paper history (svef/www#31), and most years arrive as a site
   * and a category with no note. The card drops the line rather than reserving
   * space for it.
   */
  blurb?: string | null
  /**
   * The winning site itself. Optional — without one the card is a static block
   * rather than a link that goes nowhere, which is what the old archive did.
   */
  url?: string | null
  /** Screenshot from Payload/R2. A striped placeholder stands in when there is none. */
  screenshot?: WinnerScreenshot | null
  /** Corner block colour, rotated across the grid by the caller. */
  accent?: WinnerAccent
  /**
   * Heading level for `siteName`, matched to where the card sits in the page
   * outline. Defaults to 3 — the archive grid sits under a section `<h2>`. The
   * home page's "recent winners" strip has its own `<h2>`, so it wants 3 as well;
   * a page that dropped the section heading would pass 2.
   */
  headingLevel?: 2 | 3 | 4
  /**
   * Language of `category`, when it is not the page's. Set for a category that
   * fell back to Icelandic on the English site.
   */
  categoryLang?: string
  /**
   * Language of `blurb`, when it is not the page's.
   *
   * Separate from `categoryLang` because the two come from different places:
   * `award-categories.name` is a localized field that may or may not have been
   * translated, while `award-winners.blurb` has no English column at all — the
   * archive is published in Icelandic only by decision — so on `/en` it is always
   * Icelandic while the category beside it may not be.
   */
  blurbLang?: string
}

/** The design's screenshot box is 16:10; these are the fallback intrinsic dimensions. */
const FALLBACK_WIDTH = 800
const FALLBACK_HEIGHT = 500

/**
 * One award-winning site: screenshot, `CATEGORY YEAR`, the domain, the jury's
 * note, and a rotating accent block in the corner.
 *
 * Everything below the screenshot is optional except the three things that make
 * the card worth showing — what won, in what, and when. That is deliberate: the
 * archive is being back-filled a decade at a time, and a 2021 winner with no
 * screenshot and no jury note is a real row rather than a broken one.
 *
 * The whole card is the link when there is a URL, so the target is the size of
 * the card rather than a word in it.
 */
export function WinnerCard({
  siteName,
  category,
  year,
  blurb,
  url,
  screenshot,
  accent = 'violet',
  headingLevel = 3,
  categoryLang,
  blurbLang,
}: WinnerCardProps) {
  const Heading = `h${headingLevel}` as const
  // `<a>` when there is somewhere to go, a plain box when there is not. The two
  // share every class, so the card looks the same either way — only the hover,
  // focus and pointer behaviour differ, which is exactly the difference.
  const Wrapper = url ? 'a' : 'div'

  return (
    <Wrapper
      className={clsx(styles.card, url && styles.linked)}
      {...(url ? { href: url } : {})}
    >
      <span className={clsx(styles.accent, styles[accent])} aria-hidden="true" />
      <div className={styles.frame}>
        {screenshot ? (
          <Image
            className={styles.shot}
            src={screenshot.url}
            alt={screenshot.alt}
            width={screenshot.width ?? FALLBACK_WIDTH}
            height={screenshot.height ?? FALLBACK_HEIGHT}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          // No screenshot yet. The box keeps the grid's rhythm as a striped
          // placeholder and is hidden from assistive tech: it carries nothing,
          // and announcing it would only put noise between the cards.
          <div className={styles.shot} aria-hidden="true" />
        )}
        <div className={styles.body}>
          <p className={styles.meta}>
            <span lang={categoryLang}>{category}</span> {year}
          </p>
          <Heading className={styles.site}>{siteName}</Heading>
          {blurb && (
            <p className={styles.blurb} lang={blurbLang}>
              {blurb}
            </p>
          )}
        </div>
      </div>
    </Wrapper>
  )
}
