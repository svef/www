import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * The shared Open Graph card.
 *
 * One generator rather than a design per page: a link preview is read in a
 * tenth of a second in a feed, so the job is to be unmistakably SVEF and to
 * carry the page's own line legibly. Per-page artwork would be nice and is not
 * what this is for.
 *
 * Built with `next/og` at build time, so the cards are static files on the CDN
 * rather than something rendered per request.
 */

/** Facebook, LinkedIn and Slack all treat 1200x630 as the canonical size. */
export const OG_SIZE = { width: 1200, height: 630 }
export const OG_CONTENT_TYPE = 'image/png'

const BLACK = '#09060c'
const WHITE = '#fcfbfe'
const VIOLET = '#8917e1'

type OgFont = { name: string; data: ArrayBuffer; weight: 400 | 700; style: 'normal' }

/**
 * Archivo, fetched once per build.
 *
 * `next/font/google` cannot help here — it emits CSS for the browser, and
 * Satori needs the font bytes. So this asks Google for the stylesheet with a
 * deliberately old User-Agent, which makes it answer with a TTF URL instead of
 * woff2, which Satori cannot read.
 *
 * **It degrades rather than throwing.** A build that cannot reach Google still
 * produces a card, in a fallback sans. The wrong typeface on a link preview is
 * a small cost; a deploy that fails because a font server had a bad minute is
 * not. The build already depends on Google Fonts through `next/font`, so this
 * adds no new point of failure.
 */
async function archivo(weight: 400 | 700): Promise<OgFont | null> {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=Archivo:wght@${weight}`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8)' },
      },
    ).then((r) => r.text())
    const url = css.match(/src: url\((.+?)\) format\('(?:truetype|opentype)'\)/)?.[1]
    if (!url) return null
    const data = await fetch(url).then((r) => r.arrayBuffer())
    return { name: 'Archivo', data, weight, style: 'normal' }
  } catch {
    return null
  }
}

let fontsPromise: Promise<OgFont[]> | undefined
function archivoFonts(): Promise<OgFont[]> {
  fontsPromise ??= Promise.all([archivo(400), archivo(700)]).then((fonts) =>
    fonts.filter((f): f is OgFont => f !== null),
  )
  return fontsPromise
}

/**
 * The mark, read off disk and inlined.
 *
 * `logo.svg` is already the white-shape-with-dark-letters variant, which is the
 * one that belongs on the dark canvas — no recolouring needed.
 */
let logoPromise: Promise<string> | undefined
function logoDataUri(): Promise<string> {
  logoPromise ??= readFile(join(process.cwd(), 'public/landing/logo.svg')).then(
    (buf) => `data:image/svg+xml;base64,${buf.toString('base64')}`,
  )
  return logoPromise
}

export async function ogImage({ title, kicker }: { title: string; kicker?: string }) {
  const [logo, fonts] = await Promise.all([logoDataUri(), archivoFonts()])

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: BLACK,
        padding: '64px 72px',
        position: 'relative',
        fontFamily: fonts.length > 0 ? 'Archivo' : undefined,
      }}
    >
      {/*
          The violet block motif: one slab bled off the right edge rather than a
          scatter. It frames and punctuates, which is what the device is for,
          and it survives the square crop some clients apply to thumbnails.
          Square corners, like everything else in this brand.
        */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 232,
          height: 630,
          background: VIOLET,
          display: 'flex',
        }}
      />

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logo} width={166} height={108} alt="" style={{ position: 'relative' }} />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          maxWidth: 840,
        }}
      >
        {kicker ? (
          <div
            style={{
              display: 'flex',
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: 3,
              textTransform: 'uppercase',
              color: VIOLET,
              marginBottom: 20,
            }}
          >
            {kicker}
          </div>
        ) : null}
        <div
          style={{
            display: 'flex',
            // Long titles step down rather than overflowing; the card is a
            // fixed box and a clipped headline is worse than a smaller one.
            fontSize: title.length > 64 ? 54 : title.length > 40 ? 64 : 76,
            lineHeight: 1.12,
            fontWeight: 700,
            color: WHITE,
          }}
        >
          {title}
        </div>
      </div>
    </div>,
    { ...OG_SIZE, fonts: fonts.length > 0 ? fonts : undefined },
  )
}
