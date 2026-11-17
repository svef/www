import { describe, expect, it } from 'vitest'
import { TEXT_STICKERS, textLayout } from './text'

describe('textLayout (the export heuristic)', () => {
  it('a copy with a small line is a strip over a block, the sub split after two words', () => {
    expect(textLayout(TEXT_STICKERS['trust-me-developer'].en)).toEqual({
      kind: 'strip-block',
      strip: 'Trust me',
      block: ['I am', 'a developer'],
      upper: false,
    })
  })

  it('keeps a short sub on one line', () => {
    expect(textLayout({ lines: ['A'], sub: 'Short' }).kind === 'strip-block').toBe(true)
    expect(textLayout({ lines: ['A'], sub: 'Short' })).toMatchObject({ block: ['Short'] })
  })

  it('two short lines are word, block, word', () => {
    expect(textLayout(TEXT_STICKERS.cool.en)).toEqual({
      kind: 'word-block-word',
      top: 'Cool',
      bottom: 'thing',
    })
  })

  it('three or more lines are a strip over an upper-case block', () => {
    expect(textLayout(TEXT_STICKERS['love-design-system'].en)).toEqual({
      kind: 'strip-block',
      strip: 'I love',
      block: ['your design', 'system'],
      upper: true,
    })
  })

  it('two long lines are one block', () => {
    expect(textLayout(TEXT_STICKERS['could-have-been-email'].en)).toEqual({
      kind: 'block',
      lines: ['This could have', 'been an email'],
    })
  })

  it('drops empty lines', () => {
    expect(textLayout({ lines: [' ', 'One', ''] })).toEqual({ kind: 'block', lines: ['One'] })
  })

  it('has Icelandic and English copy for every text sticker', () => {
    for (const [name, copy] of Object.entries(TEXT_STICKERS)) {
      expect(copy.is.lines.length, name).toBeGreaterThan(0)
      expect(copy.en.lines.length, name).toBeGreaterThan(0)
    }
  })
})
