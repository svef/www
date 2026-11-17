# Shape — the stepped-shape engine

The redesign's signature device: a block of colour with rectangular notches cut out
of its corners, measured around the text inside it so headlines sit on black while
the colour does the shouting. Ported from the export's "shape engine"
(`.local/svef/redesign/svef-website/index.html`), issue #123.

| File                          | What it is                                                           |
| ----------------------------- | -------------------------------------------------------------------- |
| `Shape.tsx`                   | The component: the element, its colour layer, bars, mark             |
| `Notch.tsx`                   | Content that sits in a notch (works in Server Components)            |
| `useShape.ts`                 | The hook, for an element you render yourself                         |
| `src/lib/shape/geometry.ts`   | Pure geometry: notch sizes, collision rules, the polygon             |
| `src/lib/shape/motion.ts`     | Pure motion: easing, interpolation, the drift's random walk, timings |
| `src/lib/shape/random.ts`     | The export's seeded generator, one stream per shape                  |
| `src/lib/shape/presets.ts`    | The page-head roll the export does in its router                     |
| `src/lib/shape/measure.ts`    | Reads the DOM (layout boxes, notches, text)                          |
| `src/lib/shape/controller.ts` | One shape: measure, paint, rise, drift, morph                        |
| `src/lib/shape/scheduler.ts`  | What all shapes share: observers, ambient timers, fonts              |

## API

```tsx
<Shape as="header" color="violet" band auto="tr,br" ambient className={s.phead}>
  <div className={s.wrap}>
    <Notch corner="tl" className={s.title}>
      <h1>Viðburðir</h1>
    </Notch>
    <p className={s.lede}>Fyrirlestrar, vinnustofur og hátíðir …</p>
  </div>
</Shape>
```

### `<Shape>`

| Prop             | Export                | Meaning                                                                                                                             |
| ---------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `as`             |                       | Element to render (`div`). Any other props go to it.                                                                                |
| `color`          | `c-violet` …          | `violet` (default), `red`, `pink`, `yellow`, `white`. Sets `--shape-on` for text on the colour: white on violet, black on the rest. |
| `auto`           | `data-auto`           | Decorative corners, `"tr,br"` or `['tr','br']`. Order picks the random draws.                                                       |
| `autoMobile`     | `data-auto-m`         | Replaces `auto` at viewport widths ≤ 900px.                                                                                         |
| `autoSize`       | `data-auto-size`      | `"lg"`: larger, height-relative decorative notches.                                                                                 |
| `pad`            | `data-pad`            | Clearance around notch content. Default 28px on boxes wider than 600px, else 18px.                                                  |
| `breathe`        | `data-breathe`        | How far text notches open when the shape drifts (randomly) or is hovered.                                                           |
| `band`           | `.band`               | Full-width band: bottom decorative notches are capped to 62% of its bottom padding.                                                 |
| `nocap`          | `data-nocap`          | Lifts that cap.                                                                                                                     |
| `ambient`        | `data-ambient`        | `true`: drift every 8s. `"lively"`: every 6s, further.                                                                              |
| `morphOnHover`   | `.ev-stagger>.poster` | Text notches step open on hover **and keyboard focus**.                                                                             |
| `bars`           | `.bar`                | Number of white bars in the bottom-right (else top-right) notch. Hidden ≤ 760px.                                                    |
| `mark`           | `data-mark`           | The "SVEF" mark in the bottom-left.                                                                                                 |
| `inset`          | `--hin`               | Band inset: the colour pulls in 24px (12px on phones) from both edges as you scroll past. See `components/Stair/README.md`.         |
| `insetAnchor`    | `ref` in the export   | Another element's ref that decides when the inset starts.                                                                           |
| `layer`          | `.shp` children       | Content of the clipped colour layer, e.g. a photo filling the shape.                                                                |
| `riseDelay`      | `el._hold`            | Extra wait before the entrance, ms.                                                                                                 |
| `motion`         |                       | `false`: the resting shape, no motion — what reduced motion gets.                                                                   |
| `revealHeadings` |                       | `false` keeps `h1`–`h3` out of the entrance.                                                                                        |
| `seed`           |                       | Fixes the random draws. Defaults to a hash of `useId()`.                                                                            |

### `<Notch corner pad drift minViewport as>`

Renders a plain element with `data-notch`, `data-notch-pad`, `data-notch-drift` and
`data-notch-min`. The shape cuts a black notch from that corner to the element's far
edges plus `pad`. Any element inside a shape can carry `data-notch="tl"` itself.

**A notch is as big as its element's box, not its text.** A block-level `Notch` (or one
stretched by a flex column) spans the width of its container, so its notch does too,
and a notch within 40px of the full width becomes full width. Give it
`display: inline-block` or `align-self: flex-start` to fit it to its content — the
export's `.t`, `.cat` and `.foot` do.

### Attributes for content

- `data-fade` — opt an element into the body fade (`p`, `ul`, `ol`, `dl`, `time`, `a` and
  `button` fade without it).
- `data-shape-still` — keep an element out of the entrance (the hero headline, which has
  its own word animation).
- `data-shape-ignore` — decoration (stickers): out of the entrance and out of the
  never-under-text rule.
- `data-shape-text` — make a non-text element count as text the notches must avoid.

The engine writes `data-shape-state` (`pending` | `in`), `data-shape-painted`,
`data-shape-reveal` (headings) and `data-shape-fade` (body blocks).

### `pageHeadPreset(rng)`

The export's router re-rolls every page head on each visit: one of eight corner sets,
the large size seven times in ten, a lively drift, no cap, and 0–260px of extra reach
on the title notch. `pageHeadPreset(createRng(seed))` returns those props from a seeded
stream so the server and client agree. See the `PageHead` story.

## Geometry rules

`computeGeometry()` is a line-for-line port of the export's `geom()` (verified against
the export's own function on 20,000 random shapes). In order:

1. **Decorative corners** take a size from two of the shape's eight random draws. Boxes
   wider than 500px: width 10–34% of the box, height `min(32% H, 40–150px)`. Narrower:
   14–40% and `min(30% H, 22–72px)`. `lg`: 22–38% (20–40%) wide, 18–32% of the height.
   On a `band`, bottom ones are capped to `max(20, 0.62 × padding-bottom)` unless `nocap`.
2. **Text notches** reach the element's far edges plus `pad`, plus `breathe × expand`
   (full across, half and at most 22px down), plus a random `drift` reach on boxes wider
   than 640px. They replace a decorative notch on the same corner; the last in DOM
   order wins. Never larger than the box.
3. **No thin slivers**: if a bottom notch and the opposite top notch together come within
   40px of the full height, the bottom notch is narrowed to leave a 100px column.
4. **Two notches on one edge** that would come within 40px of each other: the decorative
   one is dropped and the text one kept (if both are the same kind, the first). If the
   survivor is still within 40px of the full width, it becomes full width.
5. **Stacked notches** on one side keep 40px between them; the bottom one gives way.
6. **Never under text**: no notch may overlap text on the colour (headings, paragraphs,
   list items, links, buttons, with 24px clearance). It gets shorter (if ≥ 20px is left),
   else narrower (if ≥ 40px), else falls back to its own text's size, else disappears.

The outline is a 12-point polygon (`polygonPoints`), written as `clip-path` on the colour
layer only, so it never affects layout.

**Measuring.** Boxes are read in layout space (the offsetParent chain), which ignores
transforms. The export used `getBoundingClientRect()` while content was still moved by
its entrance, so its first drawing of a shape had notches up to 28px deeper than the
text needed (until the next resize or drift). Ours measure the resting layout every time.

## Server render

The server renders the element, the colour layer with **no** `clip-path`, and the
content. A notch's size depends on the box and its text, which the server doesn't know,
and the decorative corners have to avoid that same text — guessed on the server they
could cut black under text set in black on the light colours. So without JavaScript the
shape is a plain rectangle and each `[data-notch]` carries a black backing until the
shape is painted: everything readable, nothing laid out differently, no layout shift
when the client paints (measured CLS ≈ 0.0002).

The server render is shown as it is: nothing is held back, so LCP does not wait for
hydration. When the client takes over, shapes below the fold hide their content and play
the entrance as they scroll in; shapes already above the fold on the **first load of a
document** settle in place (`data-shape-state="settled"`) and skip it — the rectangle
snaps to its shape, which measured at ~1s LCP instead of 2.2–3.7s on a throttled
phone-class load. Shapes mounted by a client navigation always play the entrance — and when a page turn
(`lib/page-turn.ts`, #138) is covering the screen, they hold it for `PAGE_TURN_RISE_HOLD_MS` so
they rise as the block leaves rather than behind it.

## Motion

All of it is skipped under `prefers-reduced-motion: reduce` (and `motion={false}`): the
resting shape is drawn at once, content is visible, nothing drifts or morphs, and no
ambient timer runs.

- **Entrance.** A shape mounts `pending`: drawn at rest, headings below their own bottom
  edge, body content faded and 28px low. Shapes mounting together are armed together,
  in document order: those already on screen (top above 90% of the viewport) rise 120ms
  in, 90ms apart; the rest rise when 20% of them scrolls into view (or they fill 20% of
  the screen, for very tall shapes). Rising reveals the content — headings slide up over
  0.95s, body copy fades up after 0.35s. The shape itself does not grow in: the export
  disabled that. Reveals are CSS animations, not transitions, so they never replace an
  element's own `transition`.
- **Ambient drift.** Every 8s, each `ambient` shape on screen drifts, 900ms after the one
  before it; every 6s, each `"lively"` one does. Drift nudges every random draw by up to
  ±0.2 (±0.3 lively), re-randomises the breathe, re-measures, and slides the corners to
  the new shape one at a time (tl, tr, br, bl; 1.9s each, 220ms apart, in-out quart).
- **Hover morph** (`morphOnHover`). Text notches open by 40px across and 20px down
  (0.56s per corner, 70ms apart), and close again on leave. Keyboard focus does the same.
- **One scheduler.** There is one IntersectionObserver for the entrance, one for
  on-screen tracking, one ResizeObserver, and two `setInterval`s for the whole page —
  never one per shape. Shapes off screen don't drift, and both timers stop while the
  tab is hidden. Only one animation runs per shape; a new one starts from wherever the
  last one had got to.
- **Resize.** A shape re-measures 120ms after its width changes. A height-only change
  is ignored when the viewport's height changed with it (a phone's address bar moving
  mid-scroll) and honoured otherwise (its content changed size). Everything re-measures
  when web fonts finish loading.

Shapes don't nest: a shape inside another shape measures its own content, but the
entrance styles of the outer one would reach into it.
