import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { remarkHeadingLevels } from './remark-heading-levels'

/**
 * Exercised through react-markdown rather than a bare unified pipeline, so these
 * assertions are about the DOM the page actually produces.
 */
function renderMarkdown(markdown: string, startLevel?: number) {
  const { container } = render(
    <ReactMarkdown
      remarkPlugins={[
        remarkGfm,
        startLevel === undefined
          ? remarkHeadingLevels
          : [remarkHeadingLevels, { startLevel }],
      ]}
    >
      {markdown}
    </ReactMarkdown>,
  )
  return container
}

const outline = (container: HTMLElement) =>
  [...container.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((el) =>
    Number(el.tagName.slice(1)),
  )

// The shape of the real svef/Laws README: a standalone document that opens at h1
// and then jumps straight to h3.
const BYLAWS = '# Lög Samtaka Vefiðnaðarins\n\n### 1. gr.\n\nText.\n\n### 2. gr.\n\nMore.\n'

describe('remarkHeadingLevels', () => {
  it('demotes the document h1, so the embedding page keeps exactly one', () => {
    const container = renderMarkdown(BYLAWS)
    expect(container.querySelector('h1')).toBeNull()
  })

  it('keeps the document title as content rather than dropping it', () => {
    renderMarkdown(BYLAWS)
    expect(screen.getByText('Lög Samtaka Vefiðnaðarins')).toBeInTheDocument()
  })

  it('produces a continuous outline under the surrounding h2', () => {
    expect(outline(renderMarkdown(BYLAWS))).toEqual([3, 4, 4])
  })

  it('repairs the level skip inside the source document itself', () => {
    const levels = outline(renderMarkdown(BYLAWS))
    const steps = levels.slice(1).map((level, i) => level - levels[i])
    expect(Math.max(...steps)).toBeLessThanOrEqual(1)
  })

  it('never skips a level for any combination of source levels', () => {
    const container = renderMarkdown('# A\n\n## B\n\n##### C\n\n###### D\n\n## E\n')
    expect(outline(container)).toEqual([3, 4, 5, 6, 4])
  })

  it('clamps at h6 rather than emitting an invalid level', () => {
    const container = renderMarkdown('# A\n\n## B\n\n### C\n\n#### D\n\n##### E\n\n###### F\n')
    expect(outline(container)).toEqual([3, 4, 5, 6, 6, 6])
  })

  it('honours a different start level', () => {
    expect(outline(renderMarkdown(BYLAWS, 2))).toEqual([2, 3, 3])
  })

  it('leaves a document with no headings alone', () => {
    const container = renderMarkdown('Just a paragraph.\n')
    expect(outline(container)).toEqual([])
    expect(screen.getByText('Just a paragraph.')).toBeInTheDocument()
  })

  it('does not disturb non-heading content', () => {
    const container = renderMarkdown('# A\n\n- one\n- two\n')
    expect(container.querySelectorAll('li')).toHaveLength(2)
  })
})
