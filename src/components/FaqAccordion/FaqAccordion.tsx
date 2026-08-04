'use client'

import { Accordion } from '@mantine/core'

export interface FaqItem {
  question: string
  answer: string
}

// Mantine Accordion → keyboard + ARIA handled for us.
export function FaqAccordion({ items }: { items: FaqItem[] }) {
  return (
    <Accordion variant="separated" radius={0}>
      {items.map((item) => (
        <Accordion.Item key={item.question} value={item.question}>
          <Accordion.Control>{item.question}</Accordion.Control>
          <Accordion.Panel>{item.answer}</Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  )
}
