import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  ARTWORK,
  ARTWORK_NAMES,
  RECOLOR_HEX,
  VIOLET_HEX,
  artworkSrc,
  hasViolet,
  recolorAt,
} from './artwork'

const dir = join(process.cwd(), 'public/stickers')
const read = (name: string) => readFileSync(join(dir, name), 'utf8')

describe('artwork files', () => {
  it('has all ten SVGs', () => {
    expect(ARTWORK_NAMES).toHaveLength(10)
    for (const art of ARTWORK_NAMES) expect(existsSync(join(dir, `${art}.svg`))).toBe(true)
  })

  it('embeds no font and no text (no licensed fonts in a public repo)', () => {
    for (const file of readdirSync(dir)) {
      const svg = read(file)
      expect(svg, file).not.toMatch(/font-family|@font-face|<text|<tspan|data:font/i)
    }
  })

  it('knows which artworks carry violet', () => {
    for (const art of ARTWORK_NAMES) {
      expect(read(`${art}.svg`).includes(VIOLET_HEX), art).toBe(hasViolet(art))
    }
  })

  it('records each artwork size from its viewBox', () => {
    for (const art of ARTWORK_NAMES) {
      const m = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(read(`${art}.svg`))
      expect(Number(m?.[1]), art).toBeCloseTo(ARTWORK[art].width, 1)
      expect(Number(m?.[2]), art).toBeCloseTo(ARTWORK[art].height, 1)
    }
  })

  it('has up-to-date recoloured variants for every violet artwork, and none else', () => {
    for (const art of ARTWORK_NAMES) {
      for (const tone of ['pink', 'red'] as const) {
        const file = `${art}-${tone}.svg`
        if (!hasViolet(art)) {
          expect(existsSync(join(dir, file)), file).toBe(false)
          continue
        }
        const expected = read(`${art}.svg`).split(VIOLET_HEX).join(RECOLOR_HEX[tone])
        expect(read(file), file).toBe(expected)
        expect(read(file).includes(VIOLET_HEX)).toBe(false)
      }
    }
  })
})

describe('artworkSrc', () => {
  it('points at the original by default', () => {
    expect(artworkSrc('cool')).toBe('/stickers/cool.svg')
  })

  it('points at the recoloured copy of a violet artwork', () => {
    expect(artworkSrc('cool', 'pink')).toBe('/stickers/cool-pink.svg')
    expect(artworkSrc('trust-me-developer', 'red')).toBe('/stickers/trust-me-developer-red.svg')
  })

  it('leaves an artwork without violet alone', () => {
    expect(artworkSrc('needs-sparkles', 'pink')).toBe('/stickers/needs-sparkles.svg')
  })
})

describe('recolorAt', () => {
  it('alternates pink, red, pink, …', () => {
    expect([0, 1, 2, 3].map(recolorAt)).toEqual(['pink', 'red', 'pink', 'red'])
  })
})
