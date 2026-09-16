import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TranslationNote } from './TranslationNote'

const note = 'English copy is not available for this page yet — showing Icelandic.'

describe('TranslationNote', () => {
  it('explains the fallback when the content is in another language', () => {
    render(
      <TranslationNote pageLocale="en" contentLocale="is">
        {note}
      </TranslationNote>,
    )
    expect(screen.getByText(note)).toBeInTheDocument()
  })

  it('renders nothing when the content is in the requested locale', () => {
    const { container } = render(
      <TranslationNote pageLocale="en" contentLocale="en">
        {note}
      </TranslationNote>,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
