'use client'

// A client component only because `Shape` can render a `Link` (a function) as its element,
// and a function cannot cross from a Server Component into the client `Shape`.

import Link from 'next/link'
import clsx from 'clsx'
import { Shape, type ShapeColor } from '@/components/Shape/Shape'
import { Notch } from '@/components/Shape/Notch'
import { GrowText } from '@/components/GrowText/GrowText'
import type { Corner } from '@/lib/shape/geometry'
import styles from './NewsCard.module.scss'

/**
 * The export's news posters are hand-dressed: each card has its own colour, its own
 * decorative corners, and the date and the foot sit on whichever side suits it. Six
 * looks, repeated in order, so a card's look depends only on its place in the list.
 */
export interface NewsCardLook {
  color: ShapeColor
  /** Where the date sits: `tl` or `tr`. */
  dateAt: 'tl' | 'tr'
  /** Where the foot (title, excerpt, call to action) sits: `bl` or `br`. */
  footAt: 'bl' | 'br'
  /** Decorative corners, drawn to a seeded size. */
  auto: Corner[]
}

export const NEWS_CARD_LOOKS: readonly NewsCardLook[] = [
  { color: 'violet', dateAt: 'tl', footAt: 'bl', auto: ['tr'] },
  { color: 'yellow', dateAt: 'tr', footAt: 'bl', auto: ['tl', 'br'] },
  { color: 'red', dateAt: 'tr', footAt: 'br', auto: ['tl'] },
  { color: 'pink', dateAt: 'tl', footAt: 'bl', auto: ['tr', 'br'] },
  { color: 'violet', dateAt: 'tr', footAt: 'bl', auto: ['tl'] },
  { color: 'yellow', dateAt: 'tl', footAt: 'bl', auto: ['br'] },
]

export interface NewsCardProps {
  /** Publication date, already formatted for the locale. */
  date: string
  /** Machine-readable form of `date`, for the `<time datetime>` attribute. */
  dateTime?: string
  title: string
  excerpt?: string | null
  href: string
  /**
   * The card's place in its list. Picks its look (colour, corners, which side the text
   * sits on), cycling through `NEWS_CARD_LOOKS`.
   */
  index?: number
  /** Call to action, e.g. "Lesa fréttina". Hidden from the card's link name. */
  cta?: string
  /**
   * Heading level for the card title. Defaults to 2 — the news grid on /frettir
   * sits directly under the page <h1> with no section heading in between.
   */
  headingLevel?: 2 | 3 | 4
  /**
   * Language of the title, when it is not the page's. Set for content that fell
   * back to Icelandic on the English site.
   *
   * The date and the call to action are the site's own chrome and stay in the
   * page's language, so they are deliberately outside it.
   */
  titleLang?: string
  /**
   * Language of the excerpt, when it is not the page's.
   *
   * Separate from `titleLang` because the two are separately localized fields:
   * an article can have an English headline and no English summary, and marking
   * the summary as English would have a screen reader read Icelandic in an English voice.
   */
  excerptLang?: string
}

/**
 * A news poster: a stepped colour block (the shape engine) with the date and the
 * headline set in black notches cut from its corners. The whole card is one link, and the
 * notches open on hover and keyboard focus.
 *
 * Put the cards in a grid (`NewsGrid`); the colour and the corners come from `index`.
 */
export function NewsCard({
  date,
  dateTime,
  title,
  excerpt,
  href,
  index = 0,
  cta,
  headingLevel = 2,
  titleLang,
  excerptLang,
}: NewsCardProps) {
  const Heading = `h${headingLevel}` as const
  const look =
    NEWS_CARD_LOOKS[
      ((index % NEWS_CARD_LOOKS.length) + NEWS_CARD_LOOKS.length) % NEWS_CARD_LOOKS.length
    ]
  const right = look.dateAt === 'tr'
  const footRight = look.footAt === 'br'

  return (
    <Shape
      as={Link}
      href={href}
      color={look.color}
      auto={look.auto}
      morphOnHover
      className={styles.card}
    >
      <Notch
        as="time"
        corner={look.dateAt}
        dateTime={dateTime}
        className={clsx(styles.date, right && styles.right)}
      >
        {date}
      </Notch>
      <Notch
        corner={look.footAt}
        className={clsx(styles.foot, footRight && styles.right)}
      >
        <Heading className={styles.title} lang={titleLang}>
          {title}
        </Heading>
        {excerpt && (
          <span className={styles.excerpt} lang={excerptLang}>
            {excerpt}
          </span>
        )}
        {cta && (
          <span className={styles.cta} aria-hidden="true">
            <GrowText>{cta}</GrowText>
          </span>
        )}
      </Notch>
    </Shape>
  )
}
