import type { ReactNode } from 'react'
import { Shape } from '@/components/Shape/Shape'
import { Notch } from '@/components/Shape/Notch'
import styles from './Bylaws.module.scss'

/**
 * "How to propose a change", under the bylaws (the export's `aside.laws-note.c-yellow`): a
 * full-width yellow band with its heading in a notch cut from the top-left and the
 * paragraphs in two columns. The heading's `id` is `bylaws-process`; pass the paragraphs as
 * children.
 */
export function BylawsNote({
  heading,
  children,
}: {
  heading: string
  children: ReactNode
}) {
  return (
    <Shape
      as="aside"
      color="yellow"
      band
      nocap
      auto="tr,br"
      className={styles.note}
      aria-labelledby="bylaws-process"
    >
      <Notch corner="tl" className={styles.noteTitle}>
        <h2 id="bylaws-process">{heading}</h2>
      </Notch>
      {children}
    </Shape>
  )
}
