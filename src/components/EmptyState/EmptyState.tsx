import styles from './EmptyState.module.scss'

export interface EmptyStateProps {
  /** What is not here yet, e.g. "Engar fréttir enn". */
  title: string
  /** One sentence telling the reader what will appear here, and when. */
  body: string
  /**
   * Heading level, matched to where the empty state sits in the page outline.
   * Defaults to 2 — a list that stands directly under the page `<h1>`.
   */
  headingLevel?: 2 | 3 | 4
}

/**
 * Shown in place of a list that has no items yet.
 *
 * A collection with nothing in it is a normal state for this site — content is
 * entered over time — so the page says so in words instead of rendering an
 * empty grid that reads as a broken page. It is a statement, not an error:
 * no alert role, no apology.
 */
export function EmptyState({ title, body, headingLevel = 2 }: EmptyStateProps) {
  const Heading = `h${headingLevel}` as const

  return (
    <div className={styles.empty}>
      <Heading className={styles.title}>{title}</Heading>
      <p className={styles.body}>{body}</p>
    </div>
  )
}
