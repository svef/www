import { Children, type ReactNode } from 'react'
import styles from './EventZigzag.module.scss'

/**
 * The home page's events (the export's `.ev-grid`): up to four posters set in a zig-zag on
 * a twelve-column grid, each spanning two rows and starting one row below the last, left
 * and right in turn. One column under 900px. Holds `EventPoster`s; each is wrapped in a
 * list item. A fifth and later are not drawn, as in the export.
 */
export function EventZigzag({ children }: { children: ReactNode }) {
  return (
    <ul className={styles.grid}>
      {Children.map(children, (child) => (
        <li className={styles.item}>{child}</li>
      ))}
    </ul>
  )
}
