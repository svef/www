'use client'

import { useState } from 'react'
import clsx from 'clsx'
import { EmptyState } from '@/components/EmptyState/EmptyState'
import { WinnerCard, WINNER_ACCENTS, type WinnerCardProps } from '@/components/WinnerCard/WinnerCard'
import styles from './awards.module.scss'

export interface ArchiveYear {
  year: number
  /** Accessible name for the grid — "Verðlaunahafar 2025". */
  winnersLabel: string
  /** Empty-state heading for this year, when nothing has been recorded for it. */
  emptyTitle: string
  /** Fully resolved card props; the page does the localization, not this component. */
  winners: readonly WinnerCardProps[]
}

export interface WinnersArchiveProps {
  /** Newest first. The first entry is the year the archive opens on. */
  years: readonly ArchiveYear[]
  /** Accessible name for the row of year buttons. */
  yearsLabel: string
  /** The one sentence every empty year shows under its heading. */
  emptyBody: string
}

/**
 * The winners archive: a row of years, and the winners of the selected one.
 *
 * In-page tabs rather than a `/vefverdlaunin/[year]` route, which is what the
 * design export specifies and what svef/www#20 records as the decision. The
 * trade-off is real and written down on that issue: a route would give deep links
 * and separate SEO for the historical content, which is the part people link to.
 * It stays reversible while the archive is one populated year.
 *
 * This is the only client component on the page, and it is why: everything else
 * is prerendered server markup, so the route stays static and the year switch
 * costs no request. Every string it renders is passed in already localized — it
 * holds a number, nothing else.
 *
 * Toggle buttons with `aria-pressed`, as the export draws them, rather than the
 * ARIA tabs pattern. Tabs would promise arrow-key navigation and a focus-managed
 * panel; a group of toggles promises what this actually is, and is operable with
 * nothing but Tab and Enter.
 */
export function WinnersArchive({ years, yearsLabel, emptyBody }: WinnersArchiveProps) {
  const [selected, setSelected] = useState(years[0]?.year)
  const active = years.find((year) => year.year === selected) ?? years[0]

  if (!active) return null

  return (
    <>
      <div className={styles.years} role="group" aria-label={yearsLabel}>
        {years.map((year) => (
          <button
            key={year.year}
            type="button"
            className={clsx(styles.year, year.year === active.year && styles.yearActive)}
            aria-pressed={year.year === active.year}
            onClick={() => setSelected(year.year)}
          >
            {year.year}
          </button>
        ))}
      </div>

      {active.winners.length === 0 ? (
        // An honest empty year, not a hidden one. 2020–2024 are real editions
        // whose winners have not been imported yet (svef/www#31); saying so is
        // the difference between "we have no record" and "nothing happened".
        <EmptyState title={active.emptyTitle} body={emptyBody} headingLevel={3} />
      ) : (
        <ul className={styles.winners} aria-label={active.winnersLabel}>
          {active.winners.map((winner, i) => (
            <li key={winner.siteName}>
              <WinnerCard {...winner} accent={WINNER_ACCENTS[i % WINNER_ACCENTS.length]} />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
