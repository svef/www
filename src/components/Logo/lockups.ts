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
      'polygon(93.399% 13.898%, 56.852% 13.898%, 56.852% 29.637%, 27.466% 29.637%, 27.466% 37.986%, 6.601% 37.986%, 6.601% 86.102%, 82.894% 86.102%, 82.894% 86.102%, 82.894% 86.102%, 82.894% 86.102%, 82.894% 86.102%, 82.894% 52.79%, 93.399% 52.79%)',
    letters: [0.0, 0.0],
  },
  {
    /** public/landing/logo-2.svg */
    clip:
      'polygon(94.074% 39.663%, 71.86% 39.663%, 71.86% 17.077%, 35.313% 17.077%, 35.313% 30.606%, 5.926% 30.606%, 5.926% 61.897%, 22.878% 61.897%, 22.878% 82.923%, 86.793% 82.923%, 86.793% 82.923%, 86.793% 82.923%, 86.793% 67.462%, 94.074% 67.462%)',
    letters: [-21.539, 0.97],
  },
  {
    /** public/landing/logo-7.svg */
    clip:
      'polygon(100.0% 44.192%, 87.476% 44.192%, 87.476% 27.426%, 63.01% 27.426%, 63.01% 17.14%, 0.0% 17.14%, 0.0% 57.868%, 32.022% 57.868%, 32.022% 66.923%, 48.862% 66.923%, 48.862% 73.236%, 82.989% 73.236%, 82.989% 82.86%, 100.0% 82.86%)',
    letters: [4.558, 5.998],
  },
  {
    /** public/landing/logo-4.svg */
    clip:
      'polygon(100.0% 51.593%, 67.851% 51.593%, 67.851% 13.624%, 29.262% 13.624%, 29.262% 29.362%, 0.0% 29.362%, 0.0% 75.254%, 43.097% 75.254%, 43.097% 86.376%, 100.0% 86.376%, 100.0% 86.376%, 100.0% 86.376%, 100.0% 86.376%, 100.0% 86.376%)',
    letters: [-15.04, -0.273],
  },
  {
    /** public/landing/logo-9.svg */
    clip:
      'polygon(94.794% 27.968%, 55.703% 27.968%, 55.703% 7.725%, 5.206% 7.725%, 5.206% 71.681%, 5.206% 71.681%, 5.206% 71.681%, 5.206% 71.681%, 5.206% 71.681%, 22.047% 71.681%, 22.047% 92.275%, 78.192% 92.275%, 78.192% 49.447%, 94.794% 49.447%)',
    letters: [-22.257, 10.756],
  },
  {
    /** public/landing/logo-3.svg */
    clip:
      'polygon(95.74% 13.997%, 64.697% 13.997%, 64.697% 21.402%, 14.345% 21.402%, 14.345% 40.126%, 4.26% 40.126%, 4.26% 86.003%, 54.326% 86.003%, 54.326% 62.161%, 64.697% 62.161%, 64.697% 71.535%, 95.74% 71.535%, 95.74% 13.997%, 95.74% 13.997%)',
    letters: [-13.121, 1.236],
  },
  {
    /** public/landing/logo-10.svg */
    clip:
      'polygon(97.345% 10.11%, 52.765% 10.11%, 52.765% 35.513%, 2.655% 35.513%, 2.655% 81.395%, 17.778% 81.395%, 17.778% 89.89%, 73.206% 89.89%, 73.206% 67.653%, 97.345% 67.653%, 97.345% 10.11%, 97.345% 10.11%, 97.345% 10.11%, 97.345% 10.11%)',
    letters: [-9.688, 28.967],
  },
]
