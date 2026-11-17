/**
 * The stepped-shape geometry, as pure functions.
 *
 * A port of the export's `geom()`, `pts()` and `toCSS()` (svef-website/index.html,
 * "shape engine"). Nothing here touches the DOM: the caller measures the box and the
 * text inside it and passes plain numbers in, so every rule can be unit tested.
 *
 * Coordinates are in CSS pixels relative to the shape's border box, origin top left.
 * A notch is a black rectangle cut out of one corner, described as `[width, height]`.
 */

export type Corner = 'tl' | 'tr' | 'br' | 'bl'
export type Size = readonly [w: number, h: number]
export type Notches = Record<Corner, Size>
export type Point = readonly [x: number, y: number]

export interface Rect {
  left: number
  top: number
  right: number
  bottom: number
}

/** Content that sits in a notch: the notch is sized to clear it. */
export interface TextNotch {
  corner: Corner
  /** The element's box, relative to the shape. */
  rect: Rect
  /** `data-notch-pad`: clearance around this element. Defaults to the shape's pad. */
  pad?: number
  /** `data-notch-drift`: extra, randomised reach, used by ambient shapes on wide screens. */
  drift?: number
}

export interface GeometryInput {
  width: number
  height: number
  /** Decorative corners, in the order given (the order picks which draws they use). */
  auto?: readonly Corner[]
  /** The shape's eight random draws, each in [0, 1]. */
  draws: readonly number[]
  /** `data-pad`. Defaults to 28 on boxes wider than 600px, 18 otherwise. */
  pad?: number
  /** `data-auto-size="lg"`: larger, height-relative decorative notches. */
  autoSize?: 'lg'
  /** A band (or `data-cap`): bottom decorative notches stay within its bottom padding. */
  capped?: boolean
  /** `data-nocap`: a band whose bottom notches are not capped. */
  nocap?: boolean
  /** The shape's computed `padding-bottom`, for the cap. */
  paddingBottom?: number
  /** `data-breathe`: how far text notches open past their text when `expand` is set. */
  breathe?: number
  /** Per-axis 0..1 factors applied to `breathe` (the export's `el._ex`). */
  expand?: readonly [number, number]
  /** `[data-notch]` children, in DOM order. A later one on the same corner wins. */
  notches?: readonly TextNotch[]
  /** Boxes of text that sits on the colour. No notch may cut into them. */
  text?: readonly Rect[]
}

export interface Geometry {
  width: number
  height: number
  notches: Notches
}

/** Minimum gap between two notches, and the clearance kept around text. */
export const GAP = 40
export const TEXT_CLEARANCE = 24

export const CORNERS: readonly Corner[] = ['tl', 'tr', 'br', 'bl']

export const isLeft = (k: Corner) => k[1] === 'l'
export const isTop = (k: Corner) => k[0] === 't'

export function emptyNotches(): Notches {
  return { tl: [0, 0], tr: [0, 0], br: [0, 0], bl: [0, 0] }
}

/** Parses `"tr,br"` (or an array) into corners, dropping anything that isn't one. */
export function parseCorners(
  value: string | readonly string[] | undefined | null,
): Corner[] {
  if (!value) return []
  const parts = typeof value === 'string' ? value.split(',') : value
  return parts
    .map((s) => s.trim())
    .filter((s): s is Corner => CORNERS.includes(s as Corner))
}

/** `data-auto-m` replaces `data-auto` at viewport widths of 900px and below. */
export const MOBILE_MAX = 900

export function resolveAuto(
  auto: readonly Corner[] | undefined,
  autoMobile: readonly Corner[] | undefined,
  viewportWidth: number,
): readonly Corner[] {
  if (viewportWidth <= MOBILE_MAX && autoMobile != null) return autoMobile
  return auto ?? []
}

export function defaultPad(width: number): number {
  return width > 600 ? 28 : 18
}

/** One decorative notch, from its two draws. */
export function autoNotchSize(
  corner: Corner,
  a: number,
  b: number,
  o: { width: number; height: number; lg: boolean; cap: number | null },
): [number, number] {
  const { width: W, height: H } = o
  const big = W > 500
  let h = big ? Math.min(H * 0.32, 40 + b * 110) : Math.min(H * 0.3, 22 + b * 50)
  let w = W * (big ? 0.1 + a * 0.24 : 0.14 + a * 0.26)
  if (o.lg) {
    w = W * (big ? 0.22 + a * 0.16 : 0.2 + a * 0.2)
    h = H * (0.18 + b * 0.14)
  }
  if (o.cap != null && !isTop(corner)) h = Math.min(h, o.cap)
  return [w, h]
}

/**
 * Notch sizes for one shape. Rules, in the export's order:
 *
 * 1. Decorative (`auto`) corners take a random size from their two draws. On a band,
 *    bottom ones are capped to 62% of the bottom padding (at least 20px) unless `nocap`.
 * 2. Text notches clear their element by `pad` (plus `breathe` × `expand`, plus a
 *    random `drift` reach on boxes wider than 640px). A text notch replaces a
 *    decorative one on the same corner.
 * 3. No thin sliver: when a bottom notch and the opposite top notch together nearly
 *    span the height, the bottom notch is narrowed to leave a 100px column.
 * 4. Two notches on one edge that would meet (less than 40px apart) drop the
 *    decorative one and keep the one making room for text. The survivor, if it is
 *    still wider than the shape less 40px, goes full width.
 * 5. Notches stacked on one side leave at least 40px between them (the bottom one gives).
 * 6. No notch cuts into text on the colour (24px clearance): it gets shorter, else
 *    narrower, else falls back to its text's own size, else disappears.
 */
export function computeGeometry(input: GeometryInput): Geometry | null {
  const W = input.width
  const H = input.height
  if (!W || !H) return null

  const r = input.draws
  const pad = input.pad ?? defaultPad(W)
  const n: Record<Corner, [number, number]> = {
    tl: [0, 0],
    tr: [0, 0],
    br: [0, 0],
    bl: [0, 0],
  }
  const nb: Partial<Record<Corner, [number, number]>> = {}

  // 1. decorative corners
  const cap =
    input.capped && !input.nocap ? Math.max(20, (input.paddingBottom ?? 0) * 0.62) : null
  ;(input.auto ?? []).forEach((k, i) => {
    const a = r[(i * 2) % 8] ?? 0
    const b = r[(i * 2 + 1) % 8] ?? 0
    n[k] = autoNotchSize(k, a, b, {
      width: W,
      height: H,
      lg: input.autoSize === 'lg',
      cap,
    })
  })

  // 2. text notches
  const breathe = input.breathe ?? 0
  const ex = input.expand ?? [0, 0]
  for (const t of input.notches ?? []) {
    const k = t.corner
    const q = t.rect
    const tp = t.pad ?? pad
    const nd = W > 640 ? (t.drift ?? 0) : 0
    const baseX = isLeft(k) ? q.right + tp : W - q.left + tp
    const baseY = isTop(k) ? q.bottom + tp : H - q.top + tp
    const x = baseX + ex[0] * breathe + (nd ? (r[6] ?? 0) * nd : 0)
    const y =
      baseY +
      ex[1] * Math.min(22, breathe * 0.5) +
      (nd ? (r[7] ?? 0) * nd * 0.12 - tp * 0.4 : 0)
    n[k] = [Math.min(W, x), Math.min(H, y)]
    nb[k] = [Math.min(W, baseX), Math.min(H, baseY)]
  }

  const g = GAP
  // 3. never leave a thin sliver where a bottom notch meets a full-height notch on the other side
  if (n.tr[0] && n.tr[1] + n.bl[1] > H - g) {
    const col = W - n.tr[0]
    if (n.bl[0] > col - 100) n.bl[0] = Math.max(0, col - 100)
  }
  if (n.tl[0] && n.tl[1] + n.br[1] > H - g) {
    const col = W - n.tl[0]
    if (n.br[0] > col - 100) n.br[0] = Math.max(0, col - 100)
  }

  // 4. two notches on one edge that would meet
  const pair = (a: Corner, b: Corner) => {
    if (n[a][0] + n[b][0] <= W - g) return
    let keep = a
    let drop = b
    if (nb[b] && !nb[a]) {
      keep = b
      drop = a
    }
    n[drop] = [0, 0]
    if (n[keep][0] > W - g) n[keep][0] = W
  }
  pair('tl', 'tr')
  pair('bl', 'br')

  // 5. stacked on one side
  if (n.tl[1] + n.bl[1] > H - g) n.bl[1] = Math.max(0, H - g - n.tl[1])
  if (n.tr[1] + n.br[1] > H - g) n.br[1] = Math.max(0, H - g - n.tr[1])

  // 6. never under text
  const tx = (input.text ?? [])
    .filter((q) => q.right - q.left > 0 && q.bottom - q.top > 0)
    .map(
      (q) =>
        [
          q.left - TEXT_CLEARANCE,
          q.top - TEXT_CLEARANCE,
          q.right + TEXT_CLEARANCE,
          q.bottom + TEXT_CLEARANCE,
        ] as const,
    )
  if (tx.length) {
    for (const k of ['tl', 'tr', 'bl', 'br'] as const) {
      let [w, h] = n[k]
      if (!w || !h) continue
      const L = isLeft(k)
      const T = isTop(k)
      const mn = nb[k] ?? [0, 0]
      for (const [x1, y1, x2, y2] of tx) {
        const nx1 = L ? 0 : W - w
        const nx2 = L ? w : W
        const ny1 = T ? 0 : H - h
        const ny2 = T ? h : H
        if (nx1 >= x2 || nx2 <= x1 || ny1 >= y2 || ny2 <= y1) continue
        const hh = T ? y1 : H - y2
        const ww = L ? x1 : W - x2
        if (hh >= Math.max(20, mn[1])) h = hh
        else if (ww >= Math.max(40, mn[0])) w = ww
        else if (nb[k]) {
          w = mn[0]
          h = mn[1]
        } else {
          w = 0
          h = 0
        }
      }
      n[k] = [Math.max(0, w), Math.max(0, h)]
    }
  }

  return { width: W, height: H, notches: n }
}

/**
 * The 12-point outline. `yL`, `yC` and `yR` are the tops of the left step, the middle
 * and the right step; at rest they are `tl.h`, `0` and `tr.h`.
 */
export function polygonPoints(g: Geometry, yL?: number, yC = 0, yR?: number): Point[] {
  const { width: W, height: H, notches: n } = g
  const l = yL ?? n.tl[1]
  const r = yR ?? n.tr[1]
  return [
    [n.tl[0], yC],
    [W - n.tr[0], yC],
    [W - n.tr[0], r],
    [W, r],
    [W, H - n.br[1]],
    [W - n.br[0], H - n.br[1]],
    [W - n.br[0], H],
    [n.bl[0], H],
    [n.bl[0], H - n.bl[1]],
    [0, H - n.bl[1]],
    [0, l],
    [n.tl[0], l],
  ]
}

export function toClipPath(points: readonly Point[]): string {
  return (
    'polygon(' +
    points.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(',') +
    ')'
  )
}

/** Where a white bar sits: hugging the shape's inner corner in the bottom-right notch, else the top-right one. */
export function barOffset(
  n: Notches,
  width: number,
  height: number,
  bar: { width: number; height: number },
): { x: number; y: number } | null {
  if (n.br[0] > bar.width + 10 && n.br[1] > bar.height) {
    return { x: width - n.br[0], y: height - n.br[1] }
  }
  if (n.tr[0] > bar.width + 10 && n.tr[1] > bar.height) {
    return { x: width - n.tr[0], y: n.tr[1] - bar.height }
  }
  return null
}

/** The SVEF mark's left offset: just inside the bottom-left notch (it sits 14px from the bottom). */
export function markLeft(g: Geometry): number {
  return Math.min(g.notches.bl[0], g.width - 80) + 16
}
