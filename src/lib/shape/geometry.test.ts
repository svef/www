import { describe, expect, it } from 'vitest'
import {
  autoNotchSize,
  barOffset,
  computeGeometry,
  defaultPad,
  markLeft,
  parseCorners,
  polygonPoints,
  resolveAuto,
  toClipPath,
  type Geometry,
  type GeometryInput,
  type Rect,
} from './geometry'

const HALF = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]
const ZERO = [0, 0, 0, 0, 0, 0, 0, 0]
const rect = (left: number, top: number, right: number, bottom: number): Rect => ({
  left,
  top,
  right,
  bottom,
})
/** Compares a notch size to within floating-point noise. */
const expectSize = (actual: readonly [number, number], expected: [number, number]) => {
  expect(actual[0]).toBeCloseTo(expected[0], 6)
  expect(actual[1]).toBeCloseTo(expected[1], 6)
}
const geom = (input: Partial<GeometryInput> & { width: number; height: number }) => {
  const g = computeGeometry({ draws: HALF, ...input })
  if (!g) throw new Error('expected geometry')
  return g
}

describe('parseCorners / resolveAuto', () => {
  it('parses a data-auto list in order and drops anything that is not a corner', () => {
    expect(parseCorners('tr, br,xx,,bl')).toEqual(['tr', 'br', 'bl'])
    expect(parseCorners(undefined)).toEqual([])
    expect(parseCorners(['br', 'tl'])).toEqual(['br', 'tl'])
  })

  it('uses the mobile list at 900px and below, only when one is given', () => {
    expect(resolveAuto(['tr', 'bl'], ['tr'], 900)).toEqual(['tr'])
    expect(resolveAuto(['tr', 'bl'], ['tr'], 901)).toEqual(['tr', 'bl'])
    expect(resolveAuto(['tr', 'bl'], undefined, 390)).toEqual(['tr', 'bl'])
    // an empty mobile list is still a list: no decorative corners on phones
    expect(resolveAuto(['tr'], [], 390)).toEqual([])
  })
})

describe('computeGeometry', () => {
  it('returns null for a box with no size (not laid out)', () => {
    expect(computeGeometry({ width: 0, height: 300, draws: HALF })).toBeNull()
    expect(computeGeometry({ width: 300, height: 0, draws: HALF })).toBeNull()
  })

  it('is a plain rectangle with no notches requested', () => {
    const g = geom({ width: 400, height: 300 })
    expect(g.notches).toEqual({ tl: [0, 0], tr: [0, 0], br: [0, 0], bl: [0, 0] })
  })

  describe('decorative corners', () => {
    it('sizes a big box (wider than 500px) from its draws', () => {
      // w = W(.1 + a*.24), h = min(H*.32, 40 + b*110)
      const g = geom({
        width: 1000,
        height: 1000,
        auto: ['tr'],
        draws: [0.5, 0.5, ...ZERO],
      })
      expect(g.notches.tr[0]).toBeCloseTo(220)
      expect(g.notches.tr[1]).toBeCloseTo(95)
    })

    it('caps a big box’s notch height at 32% of the height', () => {
      const g = geom({ width: 1000, height: 200, auto: ['tr'], draws: [0, 1, ...ZERO] })
      expect(g.notches.tr[1]).toBeCloseTo(64)
    })

    it('sizes a small box (500px or narrower) on its own scale', () => {
      // w = W(.14 + a*.26), h = min(H*.3, 22 + b*50)
      const g = geom({
        width: 400,
        height: 1000,
        auto: ['br'],
        draws: [0.5, 0.5, ...ZERO],
      })
      expect(g.notches.br[0]).toBeCloseTo(108)
      expect(g.notches.br[1]).toBeCloseTo(47)
    })

    it('gives each corner in the list its own pair of draws, in list order', () => {
      const draws = [0, 0, 1, 1, 0, 0, 0, 0]
      const a = geom({ width: 1000, height: 1000, auto: ['tr', 'bl'], draws })
      const b = geom({ width: 1000, height: 1000, auto: ['bl', 'tr'], draws })
      expect(a.notches.tr).toEqual([100, 40])
      expectSize(a.notches.bl, [340, 150])
      expect(b.notches.bl).toEqual([100, 40])
      expectSize(b.notches.tr, [340, 150])
    })

    it('uses the large, height-relative size for autoSize="lg"', () => {
      // big: w = W(.22 + a*.16), h = H(.18 + b*.14)
      const g = geom({
        width: 1000,
        height: 800,
        auto: ['br'],
        autoSize: 'lg',
        draws: [0.5, 0.5, ...ZERO],
      })
      expect(g.notches.br[0]).toBeCloseTo(300)
      expect(g.notches.br[1]).toBeCloseTo(200)
      // small: w = W(.2 + a*.2)
      const s = geom({
        width: 400,
        height: 800,
        auto: ['br'],
        autoSize: 'lg',
        draws: [0.5, 0.5, ...ZERO],
      })
      expect(s.notches.br[0]).toBeCloseTo(120)
    })

    it('caps bottom notches on a band to 62% of its bottom padding, at least 20px', () => {
      const base = { width: 1000, height: 1000, auto: ['tr', 'br'] as const, draws: HALF }
      const capped = geom({ ...base, capped: true, paddingBottom: 100 })
      expect(capped.notches.br[1]).toBeCloseTo(62)
      expect(capped.notches.tr[1]).toBeCloseTo(95) // top notches are never capped
      expect(geom({ ...base, capped: true, paddingBottom: 10 }).notches.br[1]).toBe(20)
      expect(
        geom({ ...base, capped: true, nocap: true, paddingBottom: 100 }).notches.br[1],
      ).toBeCloseTo(95)
      expect(geom({ ...base, paddingBottom: 100 }).notches.br[1]).toBeCloseTo(95)
    })
  })

  describe('text notches', () => {
    it('clears its element by the default pad (28px over 600px wide, 18px otherwise)', () => {
      expect(defaultPad(601)).toBe(28)
      expect(defaultPad(600)).toBe(18)
      const g = geom({
        width: 1000,
        height: 1000,
        notches: [{ corner: 'tl', rect: rect(24, 150, 500, 260) }],
      })
      expect(g.notches.tl).toEqual([528, 288])
    })

    it('measures from the far side of the element for right and bottom corners', () => {
      const g = geom({
        width: 400,
        height: 500,
        pad: 10,
        notches: [
          { corner: 'tr', rect: rect(250, 20, 380, 50) },
          { corner: 'bl', rect: rect(20, 400, 200, 480) },
        ],
      })
      expect(g.notches.tr).toEqual([160, 60])
      expect(g.notches.bl).toEqual([210, 110])
    })

    it('honours its own pad over the shape’s', () => {
      const g = geom({
        width: 1000,
        height: 1000,
        pad: 10,
        notches: [{ corner: 'br', rect: rect(800, 800, 950, 950), pad: 44 }],
      })
      expect(g.notches.br).toEqual([244, 244])
    })

    it('replaces a decorative notch on the same corner, and the last one in DOM order wins', () => {
      const g = geom({
        width: 1000,
        height: 1000,
        pad: 0,
        auto: ['tl'],
        notches: [
          { corner: 'tl', rect: rect(0, 0, 100, 100) },
          { corner: 'tl', rect: rect(0, 0, 200, 50) },
        ],
      })
      expect(g.notches.tl).toEqual([200, 50])
    })

    it('never exceeds the box', () => {
      const g = geom({
        width: 300,
        height: 200,
        notches: [{ corner: 'tl', rect: rect(0, 0, 400, 400) }],
      })
      expect(g.notches.tl).toEqual([300, 200])
    })

    it('opens by breathe × expand: the full amount across, half (at most 22px) down', () => {
      const n = [{ corner: 'tl' as const, rect: rect(0, 0, 100, 100) }]
      const g = geom({
        width: 1000,
        height: 1000,
        pad: 0,
        breathe: 40,
        expand: [1, 1],
        notches: n,
      })
      expect(g.notches.tl).toEqual([140, 120])
      const hero = geom({
        width: 1000,
        height: 1000,
        pad: 0,
        breathe: 140,
        expand: [0.5, 1],
        notches: n,
      })
      expect(hero.notches.tl).toEqual([170, 122])
      expect(
        geom({ width: 1000, height: 1000, pad: 0, breathe: 140, notches: n }).notches.tl,
      ).toEqual([100, 100])
    })

    it('adds the drift reach from draws 6 and 7 only on boxes wider than 640px', () => {
      const draws = [0, 0, 0, 0, 0, 0, 0.5, 1]
      const n = [
        { corner: 'tr' as const, rect: rect(600, 0, 900, 100), drift: 120, pad: 10 },
      ]
      // x = W - left + pad + r6*drift; y = bottom + pad + r7*drift*.12 - pad*.4
      expect(geom({ width: 1000, height: 1000, draws, notches: n }).notches.tr).toEqual([
        470, 120.4,
      ])
      const narrow = geom({
        width: 640,
        height: 1000,
        draws,
        notches: [{ ...n[0], rect: rect(300, 0, 600, 100) }],
      })
      expect(narrow.notches.tr).toEqual([350, 110])
    })
  })

  describe('no thin slivers', () => {
    it('narrows a bottom-left notch to leave a 100px column beside a near-full-height top-right notch', () => {
      const g = geom({
        width: 1000,
        height: 400,
        pad: 0,
        notches: [
          { corner: 'tr', rect: rect(700, 0, 1000, 300) }, // 300 × 300
          { corner: 'bl', rect: rect(0, 320, 800, 400) }, // 800 × 80; 300 + 80 > 400 - 40
        ],
      })
      expect(g.notches.bl[0]).toBe(600) // column is 1000 - 300 = 700, less 100
    })

    it('does the same for bottom-right against top-left', () => {
      const g = geom({
        width: 1000,
        height: 400,
        pad: 0,
        notches: [
          { corner: 'tl', rect: rect(0, 0, 300, 300) },
          { corner: 'br', rect: rect(200, 320, 1000, 400) },
        ],
      })
      expect(g.notches.br[0]).toBe(600)
    })

    it('leaves the notches alone when there is room between them', () => {
      const g = geom({
        width: 1000,
        height: 1000,
        pad: 0,
        notches: [
          { corner: 'tr', rect: rect(700, 0, 1000, 300) },
          { corner: 'bl', rect: rect(0, 900, 800, 1000) },
        ],
      })
      expect(g.notches.bl[0]).toBe(800)
    })
  })

  describe('two notches on one edge that would meet', () => {
    it('drops the decorative one and keeps the text notch', () => {
      const g = geom({
        width: 1000,
        height: 1000,
        pad: 0,
        auto: ['tr'],
        draws: [1, 0, ...ZERO.slice(2)], // tr = 340 wide
        notches: [{ corner: 'tl', rect: rect(0, 0, 700, 100) }],
      })
      expect(g.notches.tl).toEqual([700, 100])
      expect(g.notches.tr).toEqual([0, 0])
    })

    it('keeps the text notch even when it is the second of the pair', () => {
      const g = geom({
        width: 1000,
        height: 1000,
        pad: 0,
        auto: ['bl'],
        draws: [1, 0, ...ZERO.slice(2)],
        notches: [{ corner: 'br', rect: rect(300, 900, 1000, 1000) }],
      })
      expect(g.notches.br).toEqual([700, 100])
      expect(g.notches.bl).toEqual([0, 0])
    })

    it('keeps the first when both are decorative', () => {
      const g = geom({
        width: 180,
        height: 1000,
        auto: ['tl', 'tr'],
        draws: [1, 0, 1, 0, 0, 0, 0, 0],
        pad: 0,
      })
      // small box: each is 180 × .4 = 72 wide; 144 > 180 - 40
      expect(g.notches.tl[0]).toBeCloseTo(72)
      expect(g.notches.tr).toEqual([0, 0])
    })

    it('turns a text notch wider than the shape (less 40px) into a full-width one', () => {
      const g = geom({
        width: 400,
        height: 600,
        pad: 0,
        auto: ['tr'],
        notches: [{ corner: 'tl', rect: rect(0, 0, 380, 100) }],
      })
      expect(g.notches.tl).toEqual([400, 100])
      expect(g.notches.tr).toEqual([0, 0])
    })
  })

  it('keeps 40px between notches stacked on one side, shortening the bottom one', () => {
    const g = geom({
      width: 1000,
      height: 400,
      pad: 0,
      notches: [
        { corner: 'tl', rect: rect(0, 0, 300, 250) },
        { corner: 'bl', rect: rect(0, 200, 300, 400) },
      ],
    })
    expect(g.notches.bl[1]).toBe(110) // 400 - 40 - 250
    const r = geom({
      width: 1000,
      height: 400,
      pad: 0,
      notches: [
        { corner: 'tr', rect: rect(700, 0, 1000, 380) },
        { corner: 'br', rect: rect(700, 300, 1000, 400) },
      ],
    })
    expect(r.notches.br[1]).toBe(0)
  })

  describe('never under text', () => {
    const big = {
      width: 1000,
      height: 1000,
      auto: ['br'] as const,
      draws: [1, 1, ...ZERO.slice(2)],
      pad: 0,
    }
    // br alone: 340 × 150, so it spans x 660..1000, y 850..1000

    it('leaves a notch alone when the text (plus 24px) is clear of it', () => {
      expectSize(
        geom({ ...big, text: [rect(100, 100, 600, 800)] }).notches.br,
        [340, 150],
      )
    })

    it('shortens a notch to stop 24px below the text when that leaves at least 20px', () => {
      const g = geom({ ...big, text: [rect(700, 700, 900, 940)] })
      // H - (940 + 24) = 36
      expectSize(g.notches.br, [340, 36])
    })

    it('narrows it instead when shortening would leave less than 20px', () => {
      const g = geom({ ...big, text: [rect(600, 800, 800, 990)] })
      // hh = 1000 - 1014 < 20; ww = 1000 - 824 = 176
      expect(g.notches.br).toEqual([176, 150])
    })

    it('drops a decorative notch it cannot fit beside the text', () => {
      const g = geom({ ...big, text: [rect(600, 800, 990, 990)] })
      expect(g.notches.br).toEqual([0, 0])
    })

    it('falls back to the text notch’s own size rather than dropping it', () => {
      const g = geom({
        width: 1000,
        height: 1000,
        pad: 10,
        breathe: 200,
        expand: [1, 1],
        notches: [{ corner: 'tl', rect: rect(0, 0, 300, 100) }],
        // text on the colour that the breathed notch (510 × 132) would cover, too
        // close on the right to narrow the notch past its own text
        text: [rect(320, 10, 700, 90)],
      })
      expect(g.notches.tl).toEqual([310, 110])
    })

    it('ignores empty text boxes', () => {
      expectSize(
        geom({ ...big, text: [rect(700, 900, 700, 990)] }).notches.br,
        [340, 150],
      )
    })
  })
})

describe('polygonPoints / toClipPath', () => {
  const g: Geometry = {
    width: 400,
    height: 300,
    notches: { tl: [100, 50], tr: [80, 30], br: [60, 40], bl: [120, 70] },
  }

  it('walks the 12 points clockwise from the top of the middle step', () => {
    expect(polygonPoints(g)).toEqual([
      [100, 0],
      [320, 0],
      [320, 30],
      [400, 30],
      [400, 260],
      [340, 260],
      [340, 300],
      [120, 300],
      [120, 230],
      [0, 230],
      [0, 50],
      [100, 50],
    ])
  })

  it('takes explicit step tops (the export’s yL, yC, yR)', () => {
    const p = polygonPoints(g, 300, 200, 250)
    expect(p[0]).toEqual([100, 200])
    expect(p[2]).toEqual([320, 250])
    expect(p[10]).toEqual([0, 300])
  })

  it('degenerates to the full rectangle with no notches', () => {
    const rectG: Geometry = {
      width: 10,
      height: 20,
      notches: { tl: [0, 0], tr: [0, 0], br: [0, 0], bl: [0, 0] },
    }
    expect(toClipPath(polygonPoints(rectG))).toBe(
      'polygon(0.0px 0.0px,10.0px 0.0px,10.0px 0.0px,10.0px 0.0px,10.0px 20.0px,10.0px 20.0px,10.0px 20.0px,0.0px 20.0px,0.0px 20.0px,0.0px 20.0px,0.0px 0.0px,0.0px 0.0px)',
    )
  })

  it('writes pixels to one decimal, as the export does', () => {
    expect(toClipPath([[1.234, 5.678]])).toBe('polygon(1.2px 5.7px)')
  })
})

describe('autoNotchSize', () => {
  it('applies the cap after the large size', () => {
    expect(
      autoNotchSize('bl', 0, 1, { width: 1000, height: 1000, lg: true, cap: 50 }),
    ).toEqual([220, 50])
  })
})

describe('bars and the mark', () => {
  const n = { tl: [0, 0], tr: [200, 100], br: [150, 80], bl: [300, 60] } as const
  it('puts a bar in the bottom-right notch’s inner corner when it fits', () => {
    expect(barOffset(n, 1000, 500, { width: 90, height: 24 })).toEqual({ x: 850, y: 420 })
  })
  it('falls back to the top-right notch, sitting on its floor', () => {
    expect(barOffset(n, 1000, 500, { width: 145, height: 24 })).toEqual({ x: 800, y: 76 })
  })
  it('hides the bar when neither notch fits it', () => {
    expect(barOffset(n, 1000, 500, { width: 195, height: 24 })).toBeNull()
  })
  it('sets the mark 16px into the bottom-left notch, never closer than 64px to the right edge', () => {
    expect(markLeft({ width: 1000, height: 500, notches: n })).toBe(316)
    expect(markLeft({ width: 320, height: 500, notches: n })).toBe(256)
  })
})
