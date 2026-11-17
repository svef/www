'use client'

// A client component only because `Shape` can render a `Link` (a function) as its element,
// and a function cannot cross from a Server Component into the client `Shape`.

import Link from 'next/link'
import clsx from 'clsx'
import { Shape } from '@/components/Shape/Shape'
import { Notch } from '@/components/Shape/Notch'
import { eventPosterLook } from './looks'
import styles from './EventPoster.module.scss'

export interface EventPosterProps {
  title: string
  href: string
  /** Start date, already formatted for the locale (`12. nóv 2026`). */
  date: string
  /** Machine-readable form of `date`, for `<time datetime>`. */
  dateTime?: string
  /** The line under the date: `20:00 — 22:30 · Iðnó`, or a past event's venue. */
  meta?: string | null
  /** The poster's place in its list. Picks its look, cycling through `EVENT_POSTER_LOOKS`. */
  index?: number
  /** Heading level of the title. Defaults to 3 (under a section `<h2>`). */
  headingLevel?: 2 | 3 | 4
  /** Language of the title, when it is not the page's. */
  titleLang?: string
  /** Language of the meta line, when it is not the page's. */
  metaLang?: string
  className?: string
}

/**
 * An event poster (the export's `.poster` under `.events-up`): a stepped colour block on
 * the shape engine with the title in a black notch at the top and the big date and the
 * venue line in a notch at the foot. The whole poster is one link. On hover and focus the
 * shape breathes (`morphOnHover`).
 *
 * Put posters in an `EventGrid`, or in an `EventsCarousel` for a row that scrolls.
 */
export function EventPoster({
  title,
  href,
  date,
  dateTime,
  meta,
  index = 0,
  headingLevel = 3,
  titleLang,
  metaLang,
  className,
}: EventPosterProps) {
  const Heading = `h${headingLevel}` as const
  const look = eventPosterLook(index)
  const titleRight = look.titleAt === 'tr'
  const footRight = look.footAt === 'br'

  return (
    <Shape
      as={Link}
      href={href}
      color={look.color}
      morphOnHover
      className={clsx(styles.poster, className)}
    >
      <Notch corner={look.titleAt} className={clsx(styles.cat, titleRight && styles.right)}>
        <Heading className={styles.title} lang={titleLang}>
          {title}
        </Heading>
      </Notch>
      <Notch corner={look.footAt} className={clsx(styles.foot, footRight && styles.right)}>
        <time className={styles.date} dateTime={dateTime}>
          {date}
        </time>
        {meta && (
          <span className={styles.meta} lang={metaLang}>
            {meta}
          </span>
        )}
      </Notch>
    </Shape>
  )
}
