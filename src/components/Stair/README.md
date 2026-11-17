# Stair and the band inset

Issue #124. Ported from the export's `/* stair dividers */`, `/* ambient: every beat one edge ... */`
and `/* pattern inset */` scripts.

| File                          | What it is                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| `Stair.tsx`, `StairText`      | The component: section head, polygon, the block of text that sits on it              |
| `useStair.ts`                 | The hook: mounts a `StairController` (polygon, entrance, stepping)                   |
| `src/lib/stair/stairs.ts`     | Pure: the four presets (`pink`, `yellow`, `red`, `violet`), `toPolygon`, `stepStair` |
| `src/lib/stair/controller.ts` | One stair: draws the resting polygon, waits for its head, steps on the beat          |
| `src/lib/inset.ts`            | Band inset: pure target and easing maths, one shared passive scroll listener         |
| `src/lib/useInset.ts`         | The hook `Shape` and `Stair` use to opt in                                           |
| `src/styles/_mixins.scss`     | `inset-mask`: the `--hin` mask, for the element that carries the colour              |

```tsx
<Stair preset="pink" aria-labelledby="h-events">
  <StairText>
    <h2 id="h-events">Viðburðir</h2>
    <a href="/is/vidburdir">Sjá alla viðburði</a>
  </StairText>
</Stair>

<Stair bare preset="violet" revealed={loaderDone} polygonRef={heroStair} />
<Shape as="section" band inset insetAnchor={heroStair}>…</Shape>
```

## Stair

The polygon is decoration (`aria-hidden`, no pointer events) and is rendered with its resting `clip-path`, so
without JavaScript the page is complete. With motion, the head's children are held back until a quarter
of the head is on screen (or a quarter of the screen is filled by a very tall head), then rise: 0.5s in,
fade 0.6s and lift 0.8s. From then on, every 5s, one parameter of each stair that is on screen moves to a
new spot within 0.9 x its designed range (1.8s, in-out cubic). `stepStair` draws two numbers per beat, the
export's order, from a stream seeded per stair (`seed`, default `useId()`).

The beat is the shape scheduler's: one more `setInterval`, one shared arrival `IntersectionObserver`, the same
on-screen tracking, nothing runs while the tab is hidden. `bare` renders just the polygon (the hero's stair),
which steps once `revealed`.

Reduced motion (or `motion={false}`): the resting polygon, children visible, no timer, no inset.

Not part of the component: the overlap of a stair-head with the next section (a negative `margin-bottom` that
differs on every page of the export), the buttons the export places on the stair, and mirrored text positions.
Those are page composition.

## Band inset

`inset` on `Shape` / `Stair` (or `useInset(ref)` with `inset-mask` on your own element) opts a full-width band
in. `--hin` (px) is written on the element: 0 until you scroll to where the element first sits (its top at 75% of
the viewport), then up to 24px (12px under 700px wide) over 320px of scrolling, each element chasing its target
by 7% a frame. All of them share one passive `scroll` + `resize` listener, which only requests an animation
frame; it is attached with the first element and removed with the last. Nothing touches native scrolling.

Reduced motion: no listener and no inset, the band keeps its full width. (The export snaps to the inset
instead; the issue asks for none.)
