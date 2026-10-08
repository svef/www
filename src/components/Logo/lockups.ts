// Generated from the brand lockups in public/landing/logo-*.svg. Do not hand-edit.
//
// Each lockup is a violet polygon plus the SVEF letterforms. The letterforms are
// identical across every file — the same 306.4x91.8 artwork — and only their
// position differs, so this carries one copy of them and a per-variant offset.
// Everything sits in one 720x717 space with each lockup centred, which is what
// keeps the letters the same size while the shape changes.
//
// Three steps matter for the morph, and skipping any of them makes it jump:
//
//  1. Sub-unit drift in the source is snapped to the axis. logo-3 has an edge that
//     moves 0.2 units sideways over 134 — invisible, but it interpolates as a
//     diagonal that straightens at the end of the transition.
//  2. Vertices sitting on a straight run are dropped. They break the H/V
//     alternation, which is what the next step relies on.
//  3. Polygons are padded to a common vertex count by DUPLICATING points, never by
//     splitting edges. A zero-length edge is neither horizontal nor vertical, so it
//     pairs with either and parity is preserved; every real edge then meets one of
//     the same orientation and stays axis-aligned. Splitting edges instead pairs a
//     horizontal edge against a vertical one and the mark morphs through diagonals
//     this brand does not have.
//
//  4. Every polygon is translated so its left edge sits at 0. The lockups are
//     different widths and were each centred in the box, so their left edges
//     landed in different places and the mark jumped sideways on every
//     transition. A translation is safe for the three steps above: it moves
//     horizontal and vertical edges without changing which they are, and leaves
//     the vertex count and pairing alone. Each lockup's letters are translated
//     by the same amount, so they keep their place within the shape.
//
//     The right edges still differ, because the shapes genuinely do. Only the
//     left edge is anchored, which is the one against the page's gutter.
//
// With that done there are zero orientation conflicts between any two lockups.
//
// Left out: logo-6 is two disjoint shapes, which one clip-path cannot express.
// logo-5 and logo-8 collapse too far mid-transition. The order below was chosen so
// no transition drops below 83% of the larger shape's area.

export const BOX = { w: 720.0, h: 717.4 }

export type Lockup = { clip: string; letters: [number, number] }

export const LOCKUPS: Lockup[] = [
  {
    /** public/landing/logo-1.svg */
    clip:
      'polygon(86.798% 13.898%, 50.251% 13.898%, 50.251% 29.637%, 20.865% 29.637%, 20.865% 37.986%, 0% 37.986%, 0% 86.102%, 76.293% 86.102%, 76.293% 86.102%, 76.293% 86.102%, 76.293% 86.102%, 76.293% 86.102%, 76.293% 52.79%, 86.798% 52.79%)',
    letters: [-6.601, 0.0],
  },
  {
    /** public/landing/logo-2.svg */
    clip:
      'polygon(88.148% 39.663%, 65.934% 39.663%, 65.934% 17.077%, 29.387% 17.077%, 29.387% 30.606%, 0% 30.606%, 0% 61.897%, 16.952% 61.897%, 16.952% 82.923%, 80.867% 82.923%, 80.867% 82.923%, 80.867% 82.923%, 80.867% 67.462%, 88.148% 67.462%)',
    letters: [-27.465, 0.97],
  },
  {
    /** public/landing/logo-7.svg */
    clip:
      'polygon(100% 44.192%, 87.476% 44.192%, 87.476% 27.426%, 63.01% 27.426%, 63.01% 17.14%, 0% 17.14%, 0% 57.868%, 32.022% 57.868%, 32.022% 66.923%, 48.862% 66.923%, 48.862% 73.236%, 82.989% 73.236%, 82.989% 82.86%, 100% 82.86%)',
    letters: [4.558, 5.998],
  },
  {
    /** public/landing/logo-4.svg */
    clip:
      'polygon(100% 51.593%, 67.851% 51.593%, 67.851% 13.624%, 29.262% 13.624%, 29.262% 29.362%, 0% 29.362%, 0% 75.254%, 43.097% 75.254%, 43.097% 86.376%, 100% 86.376%, 100% 86.376%, 100% 86.376%, 100% 86.376%, 100% 86.376%)',
    letters: [-15.04, -0.273],
  },
  {
    /** public/landing/logo-9.svg */
    clip:
      'polygon(89.588% 27.968%, 50.497% 27.968%, 50.497% 7.725%, 0% 7.725%, 0% 71.681%, 0% 71.681%, 0% 71.681%, 0% 71.681%, 0% 71.681%, 16.841% 71.681%, 16.841% 92.275%, 72.986% 92.275%, 72.986% 49.447%, 89.588% 49.447%)',
    letters: [-27.463, 10.756],
  },
  {
    /** public/landing/logo-3.svg */
    clip:
      'polygon(91.48% 13.997%, 60.437% 13.997%, 60.437% 21.402%, 10.085% 21.402%, 10.085% 40.126%, 0% 40.126%, 0% 86.003%, 50.066% 86.003%, 50.066% 62.161%, 60.437% 62.161%, 60.437% 71.535%, 91.48% 71.535%, 91.48% 13.997%, 91.48% 13.997%)',
    letters: [-17.381, 1.236],
  },
  {
    /** public/landing/logo-10.svg */
    clip:
      'polygon(94.69% 10.11%, 50.11% 10.11%, 50.11% 35.513%, 0% 35.513%, 0% 81.395%, 15.123% 81.395%, 15.123% 89.89%, 70.551% 89.89%, 70.551% 67.653%, 94.69% 67.653%, 94.69% 10.11%, 94.69% 10.11%, 94.69% 10.11%, 94.69% 10.11%)',
    letters: [-12.343, 28.967],
  },
]
