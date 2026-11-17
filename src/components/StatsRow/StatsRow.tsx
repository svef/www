import clsx from 'clsx'
import type { Locale } from '@/lib/i18n'
import styles from './StatsRow.module.scss'

export interface StatsRowItem {
  value: string
  label: string
  /** The language `label` is written in, when it differs from the page's. */
  labelLang?: Locale
}

type Colour = 'pink' | 'yellow' | 'violet'
/** The export cycles pink, yellow, violet. */
const COLOURS: readonly Colour[] = ['pink', 'yellow', 'violet']

/**
 * The About page's figures row (the export's `.ah-stats`): a big number over a label, each
 * under a hairline. Renders nothing for an empty list.
 */
export function StatsRow({ items }: { items: StatsRowItem[] }) {
  if (items.length === 0) return null
  return (
    <ul className={styles.list}>
      {items.map((item, i) => (
        <li key={`${item.value}:${item.label}`} className={clsx(styles.item, styles[COLOURS[i % COLOURS.length]])}>
          <b className={styles.value}>{item.value}</b>
          <span lang={item.labelLang}>{item.label}</span>
        </li>
      ))}
    </ul>
  )
}
