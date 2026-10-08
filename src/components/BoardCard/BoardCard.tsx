import clsx from 'clsx'
import Image from 'next/image'
import styles from './BoardCard.module.scss'

export type Accent = 'violet' | 'pink' | 'yellow' | 'red'

export interface BoardCardPortrait {
  url: string
  /**
   * The Media document's own alt text, or `''` when it has none.
   *
   * Empty is the normal case and is correct: the caption below the portrait
   * already names the person, so alt text that repeated the name would have a
   * screen reader say it twice and describe nothing. An editor who writes alt
   * text is saying something the caption does not — that is what gets
   * announced, and the image stops being decorative.
   */
  alt: string
  width: number | null
  height: number | null
}

export interface BoardCardProps {
  name: string
  role: string
  accent?: Accent
  /** Portrait from Payload/R2. A striped placeholder stands in when there is none. */
  portrait?: BoardCardPortrait | null
  /**
   * Employer, appended to the role the way the design draws it —
   * "Formaður · UX/UI hönnuður hjá JúnÍ Digital".
   *
   * Optional because most of the board has no employer recorded; those cards
   * show the role on its own, unchanged.
   */
  company?: string | null
  /**
   * The word joining role and employer, in the role's own language ("hjá" /
   * "at"). Only used when `company` is set; without it the two are simply
   * juxtaposed rather than joined by a word from the wrong language.
   */
  companyPrefix?: string
  /** Language of `role`, when it is not the page's. */
  roleLang?: string
}

/** The design's portrait box is 4:5; these are the fallback intrinsic dimensions. */
const FALLBACK_WIDTH = 480
const FALLBACK_HEIGHT = 600

/**
 * One board member: portrait, a violet corner block and a rotating accent block,
 * then role and name.
 *
 * The portrait is optional because it genuinely is: `board-members.photo` is not
 * a required field and the association is filling portraits in over time. With no
 * photo the card keeps the same 4:5 box as a striped placeholder, so a half-filled
 * board still reads as a grid rather than as a broken one. The placeholder is
 * `aria-hidden` — it carries no information and announcing it would only add noise
 * between the name and the next card.
 */
export function BoardCard({
  name,
  role,
  accent = 'violet',
  portrait,
  company,
  companyPrefix,
  roleLang,
}: BoardCardProps) {
  // One line, not two: the employer is part of what the person does, and the
  // design sets the whole clause in the same muted caption type.
  const roleLine = company ? [role, companyPrefix, company].filter(Boolean).join(' ') : role

  return (
    <figure className={styles.card}>
      <div className={styles.photo} aria-hidden={portrait ? undefined : 'true'}>
        {portrait && (
          <Image
            className={styles.portrait}
            src={portrait.url}
            alt={portrait.alt}
            width={portrait.width ?? FALLBACK_WIDTH}
            height={portrait.height ?? FALLBACK_HEIGHT}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          />
        )}
        <span className={styles.cornerTop} />
        <span className={clsx(styles.cornerBottom, styles[accent])} />
      </div>
      <figcaption className={styles.caption}>
        <span className={styles.role} lang={roleLang}>
          {roleLine}
        </span>
        <span className={styles.name}>{name}</span>
      </figcaption>
    </figure>
  )
}
