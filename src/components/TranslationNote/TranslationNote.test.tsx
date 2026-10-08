import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TranslationNote } from './TranslationNote'

describe('TranslationNote', () => {
  it('explains the fallback when the content is in another language', () => {
    render(<TranslationNote pageLocale="en" contentLocale="is" />)
    expect(screen.getByText(/not available for this page yet/)).toBeInTheDocument()
  })

  it('renders nothing when the content is in the requested locale', () => {
    const { container } = render(
      <TranslationNote pageLocale="en" contentLocale="en" />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('does not promise a translation for Icelandic-only pages', () => {
    // The winners archive, press and the bylaws are Icelandic by decision.
    // "not available yet" would imply an omission that will never be filled.
    render(
      <TranslationNote
        pageLocale="en"
        contentLocale="is"
        reason="icelandic-by-design"
      />,
    )
    expect(screen.getByText(/published in Icelandic only/)).toBeInTheDocument()
    expect(screen.queryByText(/yet/)).not.toBeInTheDocument()
  })
})
