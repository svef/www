import clsx from 'clsx'
import styles from './PressList.module.scss'

export interface PressListItem {
  title: string
  outlet: string
  /** `null`: the row is listed as text, not as a link that goes nowhere. */
  url: string | null
}

type Colour = 'pink' | 'yellow' | 'violet' | 'red'
/** The export cycles pink, yellow, violet; red joins for the fourth row on. */
const COLOURS: readonly Colour[] = ['pink', 'yellow', 'violet', 'red']

/**
 * A list of press mentions as the export's `.winlist`: outlet small on the left, headline
 * large on the right, and a coloured stepped sweep that fills the row on hover and
 * keyboard focus. The whole row is the link (the anchor's `::after` covers it).
 *
 * Sets its own `lang`: pass `lang` when the list is in a different language from the page.
 */
export function PressList({ items, lang }: { items: PressListItem[]; lang?: string }) {
  return (
    <ol className={styles.list} lang={lang}>
      {items.map((item, i) => (
        <li
          key={`${item.outlet}:${item.title}`}
          className={clsx(styles.row, styles[COLOURS[i % COLOURS.length]])}
        >
          <p className={styles.outlet}>{item.outlet}</p>
          <h3 className={styles.title}>
            {item.url ? <a href={item.url}>{item.title}</a> : item.title}
          </h3>
        </li>
      ))}
    </ol>
  )
}
