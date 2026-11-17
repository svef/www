import { describe, expect, it } from 'vitest'
import { parseBylaws } from './bylaws-articles'

describe('parseBylaws', () => {
  it('splits the title and the numbered articles', () => {
    const parsed = parseBylaws(
      '# Lög\n\n### 1. gr.\nFyrsta.\n\n### 2. gr.\nAnnað.\n- a\n- b\n\n### 10. gr.\nTíunda.\n',
    )
    expect(parsed.title).toBe('Lög')
    expect(parsed.preamble).toBe('')
    expect(parsed.articles.map((a) => a.number)).toEqual(['1', '2', '10'])
    expect(parsed.articles[1].markdown).toBe('Annað.\n- a\n- b')
  })

  it('keeps text before the first article', () => {
    const parsed = parseBylaws('# Lög\n\nInngangur.\n\n### 1. gr.\nX\n')
    expect(parsed.preamble).toBe('Inngangur.')
  })

  it('returns no articles when the document has no article headings', () => {
    const parsed = parseBylaws('# Lög\n\nBara texti.\n')
    expect(parsed.articles).toEqual([])
    expect(parsed.preamble).toBe('Bara texti.')
  })

  it('does not split on a heading inside a code fence', () => {
    const parsed = parseBylaws('### 1. gr.\n```\n### 2. gr.\n```\n')
    expect(parsed.articles).toHaveLength(1)
  })

  it('uses the whole heading when it has no number', () => {
    expect(parseBylaws('### Bráðabirgðaákvæði\ntext').articles[0].number).toBe(
      'Bráðabirgðaákvæði',
    )
  })
})
