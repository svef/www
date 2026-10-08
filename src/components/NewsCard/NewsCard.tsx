import Image from 'next/image'
import Link from 'next/link'
import styles from './NewsCard.module.scss'

export interface NewsCardCover {
  url: string
  width: number | null
  height: number | null
}

export interface NewsCardProps {
  /** Publication date, already formatted for the locale. Uppercased in CSS. */
  date: string
  /** Machine-readable form of `date`, for the `<time datetime>` attribute. */
  dateTime?: string
  title: string
  excerpt?: string | null
  href: string
  /** Cover image; a striped placeholder stands in when there is none. */
  cover?: NewsCardCover | null
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
   * the summary as English would have a screen reader read Icelandic in an
   * English voice.
   */
  excerptLang?: string
}

export function NewsCard({
  date,
  dateTime,
  title,
  excerpt,
  href,
  cover,
  cta,
  headingLevel = 2,
  titleLang,
  excerptLang,
}: NewsCardProps) {
  const Heading = `h${headingLevel}` as const

  return (
    <Link href={href} className={styles.card}>
      {cover ? (
        // Decorative here: the card's link is already named by the title next to
        // it, so the alt text would only repeat it. The detail page carries the
        // image's real alt text.
        <Image
          className={styles.cover}
          src={cover.url}
          alt=""
          width={cover.width ?? 800}
          height={cover.height ?? 450}
        />
      ) : (
        <div className={styles.cover} aria-hidden="true" />
      )}
      <div className={styles.body}>
        <time className={styles.date} dateTime={dateTime}>
          {date}
        </time>
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
            {cta} <span className={styles.arrow}>→</span>
          </span>
        )}
      </div>
    </Link>
  )
}
