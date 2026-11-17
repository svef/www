'use client'

import { useId, useState } from 'react'
import clsx from 'clsx'
import { Plus } from '@phosphor-icons/react/dist/ssr'
import styles from './FaqAccordion.module.scss'

export interface FaqItem {
  question: string
  answer: string
  /** Language of `question`, when it is not the page's. */
  questionLang?: string
  /**
   * Language of `answer`, when it is not the page's.
   *
   * Separate from `questionLang` because the two are separately localized
   * fields in Payload: a translator can land the question before the answer,
   * and marking the whole row as one language would have a screen reader read
   * Icelandic in an English voice.
   */
  answerLang?: string
}

/**
 * The FAQ as the export's accordion: a ruled list of questions, each a button with a
 * violet plus that turns to a white cross when open.
 *
 * Each question is a heading containing a button (`aria-expanded`, `aria-controls`), and
 * each answer is a labelled region that is `hidden` while closed, so closed answers are out
 * of the tab order and the accessibility tree. Enter and Space toggle (native button
 * behaviour); any number can be open at once. Keyed by index rather than question text: two
 * rows can share a question while an editor is mid-edit.
 */
export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const base = useId()
  const [open, setOpen] = useState<ReadonlySet<number>>(() => new Set())

  const toggle = (index: number) =>
    setOpen((current) => {
      const next = new Set(current)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })

  return (
    <div className={styles.faq}>
      {items.map((item, index) => {
        const isOpen = open.has(index)
        const buttonId = `${base}-q${index}`
        const panelId = `${base}-a${index}`
        return (
          <div key={index} className={clsx(styles.item, isOpen && styles.open)}>
            <h2 className={styles.heading}>
              <button
                type="button"
                id={buttonId}
                className={styles.summary}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(index)}
              >
                <span className={styles.pm} aria-hidden="true">
                  <Plus weight="bold" />
                </span>
                <span lang={item.questionLang}>{item.question}</span>
              </button>
            </h2>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!isOpen}
              className={styles.answer}
              lang={item.answerLang}
            >
              {item.answer}
            </div>
          </div>
        )
      })}
    </div>
  )
}
