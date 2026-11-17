import Image from 'next/image'
import clsx from 'clsx'
import { Shape } from '@/components/Shape/Shape'
import styles from './BoardCard.module.scss'

export type Accent = 'violet' | 'pink' | 'yellow' | 'red'

export interface BoardCardPortrait {
  url: string
  /**
   * The Media document's own alt text, or `''` when it has none.
   *
   * Empty is the normal case and is correct: the caption below the portrait
   * already names the person, so alt text that repeated the name would have a
   * screen reader say it twice and describe nothing. The portrait sits in the
   * shape's colour layer, which is `aria-hidden`, so it is treated as decoration
   * whatever an editor writes here.
   */
  alt: string
  width: number | null
  height: number | null
}

export interface BoardCardProps {
  name: string
  role: string
  /** Colour of the block behind the photo's corner (phones and tablets). */
  accent?: Accent
  /** Which side that block sits on. The grid alternates. */
  side?: 'left' | 'right'
  /**
   * Position in the grid. Picks the big decorative colour block that peeks out from behind
   * the photo on desktop (eight looks, repeated); the layout itself lives in `BoardGrid`.
   */
  index?: number
  /** Portrait from Payload/R2. A striped placeholder stands in when there is none. */
  portrait?: BoardCardPortrait | null
  /**
   * Employer, appended to the role the way the design draws it —
   * "Formaður · UX/UI hönnuður hjá JúnÍ Digital".
   */
  company?: string | null
  /** The word joining role and employer, in the role's own language ("hjá" / "at"). */
  companyPrefix?: string
  /** Language of `role`, when it is not the page's. */
  roleLang?: string
}

/**
 * One board member (the export's `figure` inside `.board`): a 4:5 portrait cut into the
 * stepped shape with its lower corners notched, a coloured block behind it, and the role
 * above the name in the caption.
 *
 * The portrait is optional because `board-members.photo` is not a required field: with no
 * photo the box keeps its shape as a striped placeholder, so a half-filled board still reads
 * as a grid. The caption is a `figcaption`, which puts the name and role in reading order
 * with the figure.
 */
export function BoardCard({
  name,
  role,
  accent = 'violet',
  side = 'right',
  index = 0,
  portrait,
  company,
  companyPrefix,
  roleLang,
}: BoardCardProps) {
  const roleLine = company
    ? [role, companyPrefix, company].filter(Boolean).join(' ')
    : role

  return (
    <figure className={styles.card} data-look={index % 8}>
      <Shape
        className={styles.photo}
        auto="bl,br"
        pad={0}
        layer={
          portrait ? (
            <Image
              className={styles.portrait}
              src={portrait.url}
              alt=""
              fill
              sizes="(max-width: 600px) 50vw, (max-width: 900px) 50vw, 33vw"
            />
          ) : (
            <span className={styles.placeholder} />
          )
        }
      >
        <i
          className={clsx(styles.back, styles[accent], styles[side])}
          aria-hidden="true"
        />
      </Shape>
      <figcaption className={styles.caption}>
        <span className={styles.name}>{name}</span>
        <span className={styles.role} lang={roleLang}>
          {roleLine}
        </span>
      </figcaption>
    </figure>
  )
}
