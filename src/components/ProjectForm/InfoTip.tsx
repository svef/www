'use client'

import { Info } from '@phosphor-icons/react'
import { useId, useState } from 'react'
import styles from './ProjectForm.module.scss'

/**
 * A small "more information" control: a button that opens a note beside the field.
 * The text is always in the page, so it reaches screen readers through the field's
 * `aria-describedby` (pass `id`); the button only shows it, and Escape closes it.
 */
export function InfoTip({
  id,
  label,
  children,
}: {
  id: string
  label: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const panel = useId()
  return (
    <span className={styles.tip} onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
      <button
        type="button"
        className={styles.tipButton}
        aria-expanded={open}
        aria-controls={panel}
        onClick={() => setOpen((o) => !o)}
      >
        <Info aria-hidden="true" weight="bold" />
        <span className={styles.srOnly}>{label}</span>
      </button>
      <span id={panel} className={styles.tipPanel} hidden={!open} aria-hidden="true">
        {children}
      </span>
      {/* The text assistive technology reads, open or not; the panel above is the visual copy. */}
      <span id={id} className={styles.srOnly}>
        {children}
      </span>
    </span>
  )
}
