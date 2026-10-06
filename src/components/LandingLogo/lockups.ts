// Generated from the ten brand lockups in public/landing/logo-*.svg.
//
// Each lockup is a violet polygon plus the SVEF letterforms. The letterforms are
// byte-identical across all ten — the same 306.4x91.8 artwork — and only their
// position differs, so this file carries one copy of them and a per-variant
// offset rather than ten drawings.
//
// Everything lives in one 720x717 space with each lockup centred in it, which is
// what keeps the letters the same size while the shape changes. The polygons are
// padded to a common vertex count with duplicated (zero-length) points: a
// zero-length edge is neither horizontal nor vertical, so it pairs with either
// and every interpolated edge stays axis-aligned. Splitting edges instead — the
// obvious approach — pairs a horizontal edge against a vertical one and the
// shape morphs through diagonals, which this brand does not have.
//
// Three lockups are deliberately absent: logo-6 is two disjoint shapes, which one
// clip-path cannot express, and logo-8 and logo-10 collapse to under half their
// area mid-transition. The order below was chosen so no transition in the loop
// drops below 86% of the larger shape's area.
//
// Regenerate rather than hand-edit.

export const BOX = { w: 720.0, h: 717.4 }

export type Lockup = { clip: string; letters: [number, number] }

export const LOCKUPS: Lockup[] = [
  {
    /** source lockup: public/landing/logo-1.svg */
    clip:
      'polygon(93.399% 13.898%, 56.852% 13.898%, 56.852% 29.637%, 27.466% 29.637%, 27.466% 37.986%, 6.601% 37.986%, 6.601% 86.102%, 82.894% 86.102%, 82.894% 86.102%, 82.894% 86.102%, 82.894% 86.102%, 82.894% 86.102%, 82.894% 52.79%, 93.399% 52.79%)',
    letters: [0.0, 0.0],
  },
  {
    /** source lockup: public/landing/logo-3.svg */
    clip:
      'polygon(95.74% 13.997%, 64.697% 13.997%, 64.697% 21.402%, 14.315% 21.402%, 14.345% 40.126%, 4.26% 40.126%, 4.26% 86.003%, 54.326% 86.003%, 54.326% 62.161%, 64.697% 62.161%, 64.697% 71.535%, 95.74% 71.535%, 95.74% 13.997%, 95.74% 13.997%)',
    letters: [-13.121, 1.236],
  },
  {
    /** source lockup: public/landing/logo-9.svg */
    clip:
      'polygon(94.794% 27.968%, 55.703% 27.968%, 55.703% 7.725%, 5.206% 7.725%, 5.206% 71.681%, 5.206% 71.681%, 5.206% 71.681%, 5.206% 71.681%, 5.206% 71.681%, 22.047% 71.681%, 22.047% 92.275%, 78.192% 92.275%, 78.192% 49.447%, 94.794% 49.447%)',
    letters: [-22.257, 10.756],
  },
  {
    /** source lockup: public/landing/logo-4.svg */
    clip:
      'polygon(100.0% 51.593%, 67.851% 51.593%, 67.851% 13.624%, 29.262% 13.624%, 29.262% 29.362%, 0.0% 29.362%, 0.0% 75.254%, 43.097% 75.254%, 43.097% 86.376%, 100.0% 86.376%, 100.0% 86.376%, 100.0% 86.376%, 100.0% 86.376%, 100.0% 86.376%)',
    letters: [-15.04, -0.273],
  },
  {
    /** source lockup: public/landing/logo-2.svg */
    clip:
      'polygon(94.074% 39.663%, 71.86% 39.663%, 71.86% 17.077%, 35.313% 17.077%, 35.313% 30.606%, 5.926% 30.606%, 5.926% 61.897%, 22.878% 61.897%, 22.878% 82.923%, 86.793% 82.923%, 86.793% 82.923%, 86.793% 82.923%, 86.793% 67.462%, 94.074% 67.462%)',
    letters: [-21.539, 0.97],
  },
  {
    /** source lockup: public/landing/logo-7.svg */
    clip:
      'polygon(100.0% 44.192%, 87.476% 44.192%, 87.476% 27.426%, 63.01% 27.426%, 63.01% 17.14%, 0.0% 17.14%, 0.0% 57.868%, 32.022% 57.868%, 32.022% 66.923%, 48.862% 66.923%, 48.862% 73.236%, 82.989% 73.236%, 82.989% 82.86%, 100.0% 82.86%)',
    letters: [4.558, 5.998],
  },
  {
    /** source lockup: public/landing/logo-5.svg */
    clip:
      'polygon(96.531% 30.736%, 42.545% 30.736%, 42.545% 30.736%, 42.545% 30.736%, 42.545% 13.248%, 3.469% 13.248%, 3.469% 62.934%, 30.516% 62.934%, 30.516% 62.908%, 30.516% 62.934%, 30.516% 86.752%, 81.412% 86.752%, 81.412% 54.185%, 96.531% 54.185%)',
    letters: [-1.76, 1.985],
  },
]
