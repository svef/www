import styles from './CategoryGrid.module.scss'

export interface CategoryGridItem {
  /** Category name, already resolved for the reader's locale. */
  name: string
  /**
   * Language of `name`, when it is not the page's.
   *
   * Category names are localized in Payload and translated as they get written,
   * so an English reader can meet a cell that fell back to Icelandic. Marking it
   * is what stops a screen reader pronouncing "Aðgengi" as English.
   */
  lang?: string
}

/**
 * The numbered award-category grid — 01–13, sharp bordered cells.
 *
 * The numbers are positional and are generated here rather than stored: they are
 * the design's way of showing how many categories there are and in what order,
 * not an identifier a category carries. That means the caller has to hand the
 * list over in the order the board puts it in — `award-categories` is sorted by
 * its own `order` field for exactly that reason.
 *
 * Keyed by index for the same reason. Two categories can share a name while an
 * editor is mid-rename, and the position is what the cell is really about.
 */
export function CategoryGrid({ categories }: { categories: readonly CategoryGridItem[] }) {
  return (
    <ul className={styles.grid}>
      {categories.map((category, i) => (
        <li key={i} className={styles.cell}>
          <span className={styles.num}>{String(i + 1).padStart(2, '0')}</span>
          <span className={styles.name} lang={category.lang}>
            {category.name}
          </span>
        </li>
      ))}
    </ul>
  )
}
