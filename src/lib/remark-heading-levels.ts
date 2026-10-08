/**
 * Remark plugin: rewrite the heading levels of an embedded Markdown document so its
 * outline continues the surrounding page instead of restarting it.
 *
 * The bylaws Markdown comes from another repo and is written to stand alone, so it
 * opens with an `<h1>` and then jumps to `<h3>`. Dropped verbatim into a page that
 * already has an `<h1>` and renders the block under an `<h2>`, that produces a second
 * `<h1>` and an h2 → h1 → h3 outline: an axe `heading-order` violation on the site of
 * the association that gives out an accessibility award.
 *
 * The fix maps the *distinct* levels the document actually uses, in order, onto
 * consecutive levels starting at `startLevel`. For the bylaws that is {1, 3} → {3, 4},
 * so the page outline becomes h1 → h2 → h3 → h4: continuous, no duplicate h1.
 *
 * Remapping rather than shifting by a fixed amount matters, because it also repairs
 * the skip the source document has internally — and it keeps working if svef/Laws
 * later adds or removes a level, without this repo tracking that.
 *
 * The document's own `<h1>` is demoted rather than dropped: "Lög Samtaka
 * Vefiðnaðarins" is the formal title of the bylaws and is not the same string as the
 * section heading "Lög SVEF" above it, so removing it would lose real content.
 */

const MAX_HEADING_LEVEL = 6

type HeadingNode = { type: 'heading'; depth: number }
type Node = { type: string; depth?: number; children?: Node[] }

const isHeading = (node: Node): node is HeadingNode & Node =>
  node.type === 'heading' && typeof node.depth === 'number'

function collectHeadings(node: Node, found: (HeadingNode & Node)[] = []) {
  if (isHeading(node)) found.push(node)
  for (const child of node.children ?? []) collectHeadings(child, found)
  return found
}

/**
 * A unified attacher, so it is used in the idiomatic way: bare in a `remarkPlugins`
 * array for the default, or as a `[plugin, options]` tuple to override the start level.
 *
 * @param options.startLevel the level the shallowest heading in the document becomes.
 *   Defaults to 3, i.e. one below the `<h2>` that `<Section title>` renders above it.
 */
export function remarkHeadingLevels({ startLevel = 3 }: { startLevel?: number } = {}) {
  return (tree: Node) => {
    const headings = collectHeadings(tree)
    if (headings.length === 0) return

    const usedDepths = [...new Set(headings.map((h) => h.depth))].sort((a, b) => a - b)
    const remap = new Map(
      usedDepths.map((depth, index) => [depth, Math.min(startLevel + index, MAX_HEADING_LEVEL)]),
    )

    for (const heading of headings) {
      heading.depth = remap.get(heading.depth) ?? heading.depth
    }
  }
}
