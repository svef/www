'use client'

import { useEffect, useRef, useState } from 'react'
import styles from './BrandKit.module.scss'

export interface Swatch {
  /** The colour's brand name, e.g. "Electric violet". */
  name: string
  /** Hex code with the hash, e.g. "#8917E1". Copied as written. */
  hex: string
  /** CSS value painted on the swatch (a token, so the swatch cannot drift from the site). */
  colour: string
  /** Text on the swatch is white rather than black. */
  onDark?: boolean
}

export interface ColourSwatchesProps {
  swatches: readonly Swatch[]
  /** Said, and shown on the swatch, after a successful copy: "Afritað". */
  copied: string
  /** Shown instead when the browser refused: the swatch shows its code to copy by hand. */
  copyFailed: string
  /** Appended to each button's accessible name: "afrita litakóða". */
  hint: string
  /** `aria-label` of the list. */
  label: string
}

type Outcome = { hex: string; ok: boolean } | null

/**
 * The brand colours as a row of tall swatches (the export's `.bk-sws`). A swatch is a button:
 * Enter, Space or a click copies its hex code to the clipboard.
 *
 * The result is shown on the swatch for a moment and also spoken, through one polite live
 * region that is always in the page — a region that is inserted at the same moment as its
 * message is often not announced. The on-swatch text is `aria-hidden` so it is not read twice.
 * If the clipboard is refused (insecure context, permissions) the swatch says so and the code
 * stays visible to copy by hand.
 */
export function ColourSwatches({
  swatches,
  copied,
  copyFailed,
  hint,
  label,
}: ColourSwatchesProps) {
  const [outcome, setOutcome] = useState<Outcome>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  async function copy(hex: string) {
    let ok = true
    try {
      await navigator.clipboard.writeText(hex)
    } catch {
      ok = false
    }
    setOutcome({ hex, ok })
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setOutcome(null), 1600)
  }

  return (
    <>
      <ul className={styles.swatches} aria-label={label}>
        {swatches.map((swatch) => {
          const here = outcome?.hex === swatch.hex ? outcome : null
          return (
            <li key={swatch.hex}>
              <button
                type="button"
                className={`${styles.swatch} ${swatch.onDark ? styles.onDark : ''}`}
                style={{ '--c': swatch.colour } as React.CSSProperties}
                data-hex={swatch.hex}
                onClick={() => copy(swatch.hex)}
              >
                <span className={styles.swatchName}>{swatch.name}</span>
                <span className={styles.swatchHex}>{swatch.hex}</span>
                <span className={styles.swatchResult} aria-hidden="true">
                  {here ? (here.ok ? copied : copyFailed) : ''}
                </span>
                <span className="sr-only">{`, ${hint}`}</span>
              </button>
            </li>
          )
        })}
      </ul>
      <p className="sr-only" role="status" aria-live="polite" data-testid="copy-status">
        {outcome ? `${outcome.ok ? copied : copyFailed}: ${outcome.hex}` : ''}
      </p>
    </>
  )
}
