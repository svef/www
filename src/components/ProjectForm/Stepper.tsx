'use client'

import { Check } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import type { ProjectFormCopy, SectionId } from './copy'
import type { SectionStatus } from './sections'
import styles from './Stepper.module.scss'
import { stepHash } from './steps'

export type StepItem = { id: SectionId; title: string; status: SectionStatus }

/**
 * The steps across the top of the form: numbered, each marked complete, not complete or
 * optional, the current one with `aria-current="step"`. Every step can be opened at any
 * time (people fill this in over days, in any order). On wide screens each step shows its
 * name; on narrow ones the bar shows the current step's name and count above a row of
 * numbered squares. The save state and the lock sit at the bar's end, so they are always
 * in sight.
 */
export function Stepper({
  steps,
  current,
  onGo,
  copy,
  status,
}: {
  steps: StepItem[]
  current: SectionId
  onGo: (id: SectionId) => void
  copy: ProjectFormCopy
  /** The save state and the lock, beside the steps. */
  status: ReactNode
}) {
  const index = steps.findIndex((s) => s.id === current)
  return (
    <div className={styles.bar} data-stepper>
      <div className={styles.inner}>
        {/* The phone view's heading: decorative, the list below says the same to assistive tech. */}
        <p className={styles.compact} aria-hidden="true">
          <span className={styles.count}>
            {index + 1} / {steps.length}
          </span>
          <span className={styles.currentName}>{steps[index]?.title}</span>
        </p>
        <nav className={styles.nav} aria-label={copy.outline}>
          <ol className={styles.list}>
            {steps.map((s, i) => {
              const isCurrent = s.id === current
              return (
                <li key={s.id} className={styles.item}>
                  <a
                    href={stepHash(s.id)}
                    className={styles.link}
                    data-status={s.status}
                    data-step-link={s.id}
                    aria-current={isCurrent ? 'step' : undefined}
                    onClick={(e) => {
                      if (
                        e.metaKey ||
                        e.ctrlKey ||
                        e.shiftKey ||
                        e.altKey ||
                        e.button !== 0
                      )
                        return
                      e.preventDefault()
                      onGo(s.id)
                    }}
                  >
                    <span className={styles.box} aria-hidden="true">
                      {s.status === 'complete' ? <Check weight="bold" /> : i + 1}
                    </span>
                    <span className={styles.label}>{s.title}</span>
                    {s.status === 'complete' && (
                      <span className={styles.srOnly}> ({copy.complete})</span>
                    )}
                    {s.status === 'incomplete' && (
                      <span className={styles.srOnly}> ({copy.incomplete})</span>
                    )}
                    {s.status === 'later' && (
                      <span className={styles.srOnly}> ({copy.optionalStep})</span>
                    )}
                  </a>
                </li>
              )
            })}
          </ol>
        </nav>
        <div className={styles.status}>{status}</div>
      </div>
    </div>
  )
}
