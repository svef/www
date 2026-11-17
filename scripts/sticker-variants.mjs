// Writes the recoloured copies of the sticker artwork that sit on violet bands.
//
// A violet sticker on a violet band disappears, so the design recolours it pink or red
// there. An <img> cannot be recoloured by CSS, so the two variants are generated from
// the originals: `public/stickers/<art>.svg` -> `<art>-pink.svg` and `<art>-red.svg`.
// Re-run after changing the artwork: `node scripts/sticker-variants.mjs`.
// (`src/lib/stickers/artwork.test.ts` fails if the committed variants are stale.)
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = new URL('../public/stickers/', import.meta.url).pathname
const VIOLET = '#8917E1'
const TONES = { pink: '#FF0FCA', red: '#FF0000' }

for (const file of readdirSync(dir)) {
  if (!file.endsWith('.svg') || /-(pink|red)\.svg$/.test(file)) continue
  const source = readFileSync(join(dir, file), 'utf8')
  if (!source.includes(VIOLET)) continue
  for (const [tone, hex] of Object.entries(TONES)) {
    writeFileSync(join(dir, file.replace(/\.svg$/, `-${tone}.svg`)), source.split(VIOLET).join(hex))
  }
  console.log('variants for', file)
}
