import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// The export is set in Roc Grotesk (50-150%); Archivo runs 62-125%. #121's formula.
const remap = (v: number) => (v < 100 ? 62 + (v - 50) * 0.76 : 100 + (v - 100) * 0.5)

// export value -> token that must hold the remapped value
const table: Record<string, number> = {
  'stretch-min': 50,
  'stretch-intro': 55,
  'stretch-lede': 62,
  'stretch-body': 75,
  'stretch-loop-low': 78,
  'stretch-normal': 100,
  'stretch-loop-high': 112,
  'stretch-flip': 114,
  'stretch-button': 115,
  'stretch-cta': 118,
  'stretch-count': 120,
  'stretch-hover': 125,
  'stretch-crumb': 130,
  'stretch-button-hover': 135,
  'stretch-row': 140,
  'stretch-display': 150,
}

describe('font-stretch tokens', () => {
  const css = readFileSync(join(__dirname, 'tokens.scss'), 'utf8')
  for (const [name, from] of Object.entries(table)) {
    it(`--${name} is the export's ${from}% remapped`, () => {
      const m = css.match(new RegExp(`--${name}:\\s*([\\d.]+)%`))
      expect(m, `--${name} missing`).not.toBeNull()
      expect(Number(m![1])).toBeCloseTo(remap(from), 2)
    })
  }
})
