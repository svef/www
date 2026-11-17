import type { ReactNode } from 'react'
import styles from './BoardGrid.module.scss'

/**
 * The board's layout (the export's `.board.board-spread`): twelve columns, the cards
 * alternating between a left and a right column and overlapping by half a row so the grid
 * reads as a loose spread rather than a table. Two columns on tablets and phones, the chair
 * across the full width on top at phone size. Children are `BoardCard`s.
 */
export function BoardGrid({ children }: { children: ReactNode }) {
  return <div className={styles.grid}>{children}</div>
}
