import { describe, expect, it } from 'vitest'
import { hasViolet } from './artwork'
import { STICKER_PLACEMENTS, type StickerPlacement } from './placements'
import { resolveAll, resolveStickers } from './resolve'

const placeholder = {
  page: 'vidburdir',
  band: 'header',
  bandTone: 'violet',
  position: {},
  rotate: 0,
  speed: 0,
} as const

describe('placements', () => {
  it('reproduces the export: 13 stickers on 10 pages and the footer', () => {
    expect(STICKER_PLACEMENTS).toHaveLength(13)
    expect(new Set(STICKER_PLACEMENTS.map((s) => s.page)).size).toBe(11)
  })

  it('gives every sticker a rotation, a speed and a position', () => {
    for (const s of STICKER_PLACEMENTS) {
      expect(Number.isFinite(s.rotate)).toBe(true)
      expect(Number.isFinite(s.speed)).toBe(true)
      expect(Object.keys(s.position).length).toBeGreaterThan(0)
    }
  })
})

describe('never violet on violet', () => {
  const all = resolveAll(STICKER_PLACEMENTS)

  it('recolours exactly the violet artwork on violet bands', () => {
    for (const s of all) {
      const needs = s.bandTone === 'violet' && s.kind === 'artwork' && hasViolet(s.art)
      expect(s.recolor !== undefined, s.id).toBe(needs)
    }
  })

  it('alternates pink then red in the export order', () => {
    const colours = all.filter((s) => s.recolor).map((s) => `${s.page}:${s.recolor}`)
    expect(colours).toEqual([
      'vidburdir:pink',
      'stjorn:red',
      'spurt-og-svarad:pink',
      'skraning:red',
      'erindi:pink',
      'hafa-samband:red',
    ])
  })

  it('leaves violet artwork on dark bands alone', () => {
    const hero = all.find((s) => s.page === 'forsida' && s.band === 'hero')
    expect(hero?.kind === 'artwork' && hero.art).toBe('trust-me-developer')
    expect(hero?.recolor).toBeUndefined()
  })

  it('also swaps a violet text sticker off a violet band', () => {
    const text: StickerPlacement = {
      ...placeholder,
      kind: 'text',
      tone: 'violet',
      copy: { is: { lines: ['a'] }, en: { lines: ['a'] } },
    }
    expect(resolveAll([text])[0].recolor).toBe('pink')
    expect(resolveAll([{ ...text, bandTone: 'dark' }])[0].recolor).toBeUndefined()
    expect(resolveAll([{ ...text, tone: 'yellow' }])[0].recolor).toBeUndefined()
  })
})

describe('resolveStickers', () => {
  it('returns one page, in order', () => {
    const s = resolveStickers('forsida')
    expect(s.map((x) => x.band)).toEqual(['hero', 'events', 'events'])
  })

  it('filters by band', () => {
    expect(resolveStickers('forsida', 'events')).toHaveLength(2)
    expect(resolveStickers('forsida', 'header')).toHaveLength(0)
  })

  it('keeps the alternation stable when a page is filtered', () => {
    expect(resolveStickers('stjorn', 'header')[0].recolor).toBe('red')
  })

  it('gives distinct ids', () => {
    const ids = resolveAll(STICKER_PLACEMENTS).map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has a footer sticker that stays on phones', () => {
    const [footer] = resolveStickers('footer')
    expect(footer.mobile).toBeDefined()
  })
})
