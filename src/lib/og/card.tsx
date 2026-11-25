import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Locale } from '@/lib/i18n'
import type { ArtworkName } from '@/lib/stickers/artwork'
import { ARTWORK } from '@/lib/stickers/artwork'
import { OG_SIZE, cardContent, type CardKey } from './cards'

/**
 * The Open Graph card, drawn after the November redesign's own (`og.png` beside the export,
 * svef/www#121): the dark canvas, the violet lockup top left, the headline in heavy Archivo
 * sitting on a stepped violet block that runs off the foot of the card, and the page's
 * sticker tilted on the right.
 *
 * One layout for every page rather than a design per page: a preview is read in a tenth of
 * a second in a feed, so the job is to be unmistakably SVEF and to carry the page's name.
 * The front page carries the hero's three lines instead, broken where the hero breaks them.
 *
 * Rendered at build time (see `src/app/og/[locale]/[card]/route.tsx`), so every card is a
 * static file on the CDN.
 */

// The brand's colours (`src/styles/tokens.scss`). Satori takes no CSS variables.
const BLACK = '#09060C'
const WHITE = '#FCFBFE'
const VIOLET = '#8917E1'

/** Where the headline's last line sits: just above the stepped block. */
const HEADLINE_BOTTOM = 182
/** How wide the headline may run before it reaches the sticker. */
const HEADLINE_WIDTH = 880

type OgFont = { name: string; data: ArrayBuffer; weight: 800; style: 'normal' }

/**
 * Archivo ExtraBold at normal width, fetched once per build.
 *
 * The site sets its headlines in Archivo 800 at `font-stretch: 100%` (the export's Roc
 * Grotesk at 100%, unchanged by #121's remapping). Satori reads neither woff2 nor variable
 * axes, so this asks Google Fonts for that one instance with an old User-Agent, which gets a
 * static TTF back. Archivo is OFL; it is fetched rather than committed only because
 * `next/font` already fetches it from the same place on every build, and a second copy in
 * the repository would drift from it.
 *
 * **It degrades rather than throwing.** If Google cannot be reached the card still renders,
 * in `next/og`'s built-in sans, and the build says so. The wrong typeface on a link preview
 * is a small cost; a deploy that fails because a font server had a bad minute is not.
 */
async function archivo(): Promise<OgFont | null> {
  try {
    const css = await fetch(
      'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@100,800',
      {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8)' },
      },
    ).then((r) => r.text())
    const url = css.match(/src: url\((.+?)\) format\('(?:truetype|opentype)'\)/)?.[1]
    if (!url) throw new Error('no TTF in the Google Fonts stylesheet')
    const data = await fetch(url).then((r) => r.arrayBuffer())
    return { name: 'Archivo', data, weight: 800, style: 'normal' }
  } catch (error) {
    console.warn(
      `[og] Archivo could not be fetched; cards fall back to a default sans.`,
      error,
    )
    return null
  }
}

let fontPromise: Promise<OgFont | null> | undefined
const font = () => (fontPromise ??= archivo())

const svgCache = new Map<string, Promise<string>>()
/**
 * A file under `public/`, inlined as a data URI (Satori fetches nothing itself). With
 * `silhouette`, every fill is painted white first: the sticker's die-cut edge.
 */
function publicSvg(path: string, { silhouette = false } = {}): Promise<string> {
  const cacheKey = `${path}${silhouette ? '#silhouette' : ''}`
  let cached = svgCache.get(cacheKey)
  if (!cached) {
    cached = readFile(join(process.cwd(), 'public', path), 'utf8').then((svg) => {
      const painted = silhouette
        ? svg.replace(/fill="#[0-9A-Fa-f]{3,8}"/g, `fill="${WHITE}"`)
        : svg
      return `data:image/svg+xml;base64,${Buffer.from(painted).toString('base64')}`
    })
    svgCache.set(cacheKey, cached)
  }
  return cached
}

/**
 * The headline's size. The front page's three lines are set as the export's card sets them.
 * A page name is set as large as fits beside the sticker (Archivo 800 runs about 0.75em a
 * character, with room to spare), between 104 and 150px; below that it wraps instead.
 */
function headlineSize(lines: readonly string[]): number {
  if (lines.length > 1) return 104
  const length = Math.max(lines[0]?.length ?? 1, 1)
  return Math.max(104, Math.min(150, Math.floor(HEADLINE_WIDTH / (length * 0.75))))
}

/** The sticker's box on the card: the artwork's own proportions, about 170px across. */
function stickerBox(art: ArtworkName) {
  const { width, height } = ARTWORK[art]
  const scale = Math.min(170 / width, 190 / height)
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

export async function renderCard(key: CardKey, locale: Locale): Promise<ImageResponse> {
  const { lines, sticker } = cardContent(key, locale)
  const [archivoFont, logo, stickerSrc, stickerEdge] = await Promise.all([
    font(),
    publicSvg('brand/logo-02.svg'),
    sticker ? publicSvg(`stickers/${sticker.art}.svg`) : null,
    sticker ? publicSvg(`stickers/${sticker.art}.svg`, { silhouette: true }) : null,
  ])
  const size = headlineSize(lines)
  const box = sticker ? stickerBox(sticker.art) : null

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        background: BLACK,
        fontFamily: archivoFont ? 'Archivo' : undefined,
      }}
    >
      {/* The lockup the export's card uses: violet block, white letters. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logo}
        width={74}
        height={55}
        alt=""
        style={{ position: 'absolute', left: 24, top: 30 }}
      />

      {/*
        The stepped block: a slab across the foot with a raised step on its left, square
        corners, running off the bottom edge. Three rectangles, because it is three
        rectangles in the export too.
      */}
      <div
        style={{
          position: 'absolute',
          left: 6,
          top: 537,
          width: 83,
          height: 93,
          background: VIOLET,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 89,
          top: 477,
          width: 309,
          height: 153,
          background: VIOLET,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 398,
          top: 542,
          width: 680,
          height: 88,
          background: VIOLET,
        }}
      />

      {stickerSrc && stickerEdge && sticker && box ? (
        // The site draws the die-cut edge with four white `drop-shadow`s (Sticker.module.scss).
        // Satori has no `filter`, so the same edge is four white silhouettes 3px out, under
        // the artwork.
        <div
          style={{
            position: 'absolute',
            right: 160 - box.width / 2,
            top: 360 - box.height / 2,
            width: box.width,
            height: box.height,
            display: 'flex',
            transform: `rotate(${sticker.rotate}deg)`,
          }}
        >
          {[
            [3, 0],
            [-3, 0],
            [0, 3],
            [0, -3],
          ].map(([x, y]) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${x},${y}`}
              src={stickerEdge}
              width={box.width}
              height={box.height}
              alt=""
              style={{ position: 'absolute', left: x, top: y }}
            />
          ))}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={stickerSrc}
            width={box.width}
            height={box.height}
            alt=""
            style={{ position: 'absolute', left: 0, top: 0 }}
          />
        </div>
      ) : null}

      <div
        style={{
          position: 'absolute',
          left: 24,
          bottom: HEADLINE_BOTTOM,
          width: HEADLINE_WIDTH,
          display: 'flex',
          flexDirection: 'column',
          color: WHITE,
          fontWeight: 800,
          fontSize: size,
          lineHeight: 0.95,
          letterSpacing: -0.025 * size,
        }}
      >
        {lines.map((line) => (
          <div key={line} style={{ display: 'flex' }}>
            {line}
          </div>
        ))}
      </div>
    </div>,
    { ...OG_SIZE, fonts: archivoFont ? [archivoFont] : undefined },
  )
}
