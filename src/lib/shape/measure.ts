/**
 * Reads what the geometry needs out of the DOM. Client only.
 *
 * Positions are measured in *layout* space (the offsetParent chain), not with
 * `getBoundingClientRect()`. Entrance motion translates headings and body copy while
 * a shape is pending; the export measured those moved boxes, so a shape drawn before
 * its content settled kept notches up to 28px deeper than its text needed until the
 * next resize. Layout positions ignore transforms, so a shape measures the same at
 * any point in its motion.
 */
import { CORNERS, type Corner, type Rect, type TextNotch } from './geometry'

/** Attributes the engine reads and writes. The component renders the first four. */
export const ATTR = {
  shape: 'data-shape',
  layer: 'data-shape-layer',
  bar: 'data-shape-bar',
  mark: 'data-shape-mark',
  /** Excludes an element and its subtree from collision and reveal (stickers, decoration). */
  ignore: 'data-shape-ignore',
  /** Keeps a heading or block out of the entrance reveal (the hero headline animates itself). */
  still: 'data-shape-still',
  /** Written by the engine. */
  state: 'data-shape-state',
  painted: 'data-shape-painted',
  reveal: 'data-shape-reveal',
  fade: 'data-shape-fade',
} as const

/** Headings slide up from behind their own bottom edge. */
const REVEAL = 'h1,h2,h3'
/**
 * Body content fades up. The export's list mixes classes (`.body`, `.meta`, `.btn`…)
 * with elements; classes don't survive CSS Modules, so any element can opt in with
 * `data-fade` and the elements carry over.
 */
const FADE = 'p,ul,ol,dl,time,a,button,[data-fade]'
/** Text that sits on the colour: no notch may cut into it. */
const TEXT = 'h1,h2,h3,h4,p,dt,dd,li,a,button,[data-shape-text]'

const isCorner = (v: string | undefined): v is Corner => CORNERS.includes(v as Corner)

/** True when `node`'s nearest shape is `root` (nested shapes measure their own content). */
export function ownedBy(node: Element, root: Element): boolean {
  return node.closest(`[${ATTR.shape}]`) === root
}

/** The export's `offsetParent` test: false for `display: none` subtrees. */
const rendered = (node: HTMLElement) => node.offsetParent !== null

/** `node`'s border box relative to `root`'s border box, ignoring transforms. */
export function layoutRect(node: HTMLElement, root: HTMLElement): Rect {
  let x = node.offsetLeft
  let y = node.offsetTop
  let p = node.offsetParent as HTMLElement | null
  while (p && p !== root) {
    x += p.offsetLeft + p.clientLeft
    y += p.offsetTop + p.clientTop
    p = p.offsetParent as HTMLElement | null
  }
  if (p !== root) {
    // root isn't in the offsetParent chain (it should be: shapes are positioned)
    const a = node.getBoundingClientRect()
    const b = root.getBoundingClientRect()
    return {
      left: a.left - b.left,
      top: a.top - b.top,
      right: a.right - b.left,
      bottom: a.bottom - b.top,
    }
  }
  x += root.clientLeft
  y += root.clientTop
  return { left: x, top: y, right: x + node.offsetWidth, bottom: y + node.offsetHeight }
}

function owned(root: HTMLElement, selector: string): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(selector)).filter((n) =>
    ownedBy(n, root),
  )
}

/** The `[data-notch]` children that count at this viewport width, in DOM order. */
export function readNotches(root: HTMLElement, viewportWidth: number): TextNotch[] {
  const out: TextNotch[] = []
  for (const t of owned(root, '[data-notch]')) {
    const corner = t.dataset.notch
    if (!isCorner(corner) || !rendered(t)) continue
    const min = t.dataset.notchMin
    if (min && viewportWidth < Number(min)) continue
    const pad = t.dataset.notchPad
    const drift = t.dataset.notchDrift
    out.push({
      corner,
      rect: layoutRect(t, root),
      pad: pad != null && pad !== '' ? Number(pad) : undefined,
      drift: drift ? Number(drift) : undefined,
    })
  }
  return out
}

/** Boxes of text on the colour (outside any notch, mark, bar or ignored decoration). */
export function readText(root: HTMLElement): Rect[] {
  const skip = `[data-notch],[${ATTR.mark}],[${ATTR.bar}],[${ATTR.ignore}]`
  const out: Rect[] = []
  for (const t of owned(root, TEXT)) {
    if (t.closest(skip) || !rendered(t)) continue
    if (!t.offsetWidth || !t.offsetHeight) continue
    out.push(layoutRect(t, root))
  }
  return out
}

/**
 * Marks the content that animates in: headings to reveal, and the outermost
 * fade-able blocks that aren't inside one. Attributes only — the markup React
 * rendered is never rewritten. Safe to call again as content changes.
 */
export function markEntrance(root: HTMLElement, revealHeadings: boolean): void {
  const out = `[${ATTR.still}],[${ATTR.ignore}]`
  if (revealHeadings) {
    for (const h of owned(root, REVEAL)) {
      if (!h.closest(out)) h.setAttribute(ATTR.reveal, '')
    }
  }
  for (const x of owned(root, FADE)) {
    if (x.hasAttribute(ATTR.fade) || x.closest(out)) continue
    if (x.closest(`[${ATTR.reveal}]`)) continue
    // outermost only: an element inside one already fading moves with it
    const parent = x.parentElement?.closest(`[${ATTR.fade}]`)
    if (parent && root.contains(parent)) continue
    x.setAttribute(ATTR.fade, '')
  }
}

/** Document order, for staggering. */
export function byDocumentOrder(a: Node, b: Node): number {
  if (a === b) return 0
  return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
}
