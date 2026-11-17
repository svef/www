import { Children, type ReactNode } from 'react'
import styles from './EventGrid.module.scss'

/**
 * The events grid (the export's `ul.cards`): one column, two from 640px, three from 980px,
 * 20px apart. Holds `EventPoster`s; each is wrapped in a list item.
 */
export function EventGrid({ children }: { children: ReactNode }) {
  return (
    <ul className={styles.grid}>
      {Children.map(children, (child) => (
        <li>{child}</li>
      ))}
    </ul>
  )
}
