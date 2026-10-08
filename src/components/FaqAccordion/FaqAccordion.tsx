'use client'

import { Accordion } from '@mantine/core'

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
 * Mantine Accordion → keyboard and ARIA handled for us.
 *
 * Keyed by index rather than by question text: the FAQ comes from the CMS, where
 * two rows can end up with the same question while an editor is mid-edit, and
 * Mantine uses `value` as the item's identity — duplicates would open together.
 */
export function FaqAccordion({ items }: { items: FaqItem[] }) {
  return (
    <Accordion variant="separated" radius={0}>
      {items.map((item, index) => (
        <Accordion.Item key={index} value={String(index)}>
          <Accordion.Control lang={item.questionLang}>{item.question}</Accordion.Control>
          <Accordion.Panel lang={item.answerLang}>{item.answer}</Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  )
}
