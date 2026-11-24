import { Archivo, Overpass_Mono } from 'next/font/google'

// Shared by the site's layout and the portal's, which are separate root layouts.
//
// Archivo carries body and headings alike, as the *variable* font with both axes:
// wght 100-900 and wdth 62-125. The redesign leans on the width axis everywhere
// (hover-widen, the hero word morph, condensed running text), so a static cut would
// silently ignore `font-stretch`. Omitting `weight` selects the variable weight
// range; `axes: ['wdth']` adds the width axis. (Roc Grotesk, which the export uses,
// is licensed and cannot go in a public repository.)
export const archivo = Archivo({
  subsets: ['latin'],
  variable: '--font-archivo',
  axes: ['wdth'],
  display: 'swap',
})

// The design sets small uppercase labels — eyebrows, album meta, the share row —
// in Overpass Mono. Nothing loaded a mono face before, so all of them fell back
// to the body font and quietly stopped reading as labels.
export const mono = Overpass_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' })

/** The `<html>` class and font variables every root layout sets. */
export const fontClassName = `${archivo.variable} ${mono.variable}`
export const fontStyle = {
  ['--font-body' as string]: 'var(--font-archivo)',
  ['--font-heading' as string]: 'var(--font-archivo)',
}
