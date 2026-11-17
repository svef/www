import { useRef } from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Shape } from '@/components/Shape/Shape'
import { ARTWORK_NAMES } from '@/lib/stickers/artwork'
import { useParallax } from '@/lib/useParallax'
import { STICKER_PLACEMENTS } from '@/lib/stickers/placements'
import { TEXT_STICKERS, type TextStickerName } from '@/lib/stickers/text'
import { PageStickers } from './PageStickers'
import { Sticker } from './Sticker'
import s from './Sticker.stories.module.scss'

const meta: Meta<typeof Sticker> = {
  title: 'Brand/Sticker',
  component: Sticker,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className={s.page} style={{ margin: -32 }}>
        <Story />
      </div>
    ),
  ],
}
export default meta

type Story = StoryObj<typeof Sticker>

const TEXT_NAMES = Object.keys(TEXT_STICKERS) as TextStickerName[]

/** All ten artworks, as the designers drew them. Violet ones are on a dark canvas here. */
export const Artwork: Story = {
  render: () => (
    <div className={s.gallery}>
      {ARTWORK_NAMES.map((art) => (
        <div key={art} className={s.cell}>
          <Sticker kind="artwork" art={art} motion={false} />
          <span className={s.label}>{art}</span>
        </div>
      ))}
    </div>
  ),
}

/** The brand label in CSS, Icelandic. The copy is chosen by locale at render time. */
export const TextIcelandic: Story = {
  render: () => (
    <div className={s.gallery}>
      {TEXT_NAMES.map((name, i) => (
        <div key={name} className={s.cell}>
          <Sticker
            kind="text"
            copy={TEXT_STICKERS[name]}
            locale="is"
            tone={(['yellow', 'pink', 'violet', 'red'] as const)[i % 4]}
            motion={false}
          />
          <span className={s.label}>{name}</span>
        </div>
      ))}
    </div>
  ),
}

/** The same stickers in English. */
export const TextEnglish: Story = {
  render: () => (
    <div className={s.gallery}>
      {TEXT_NAMES.map((name, i) => (
        <div key={name} className={s.cell}>
          <Sticker
            kind="text"
            copy={TEXT_STICKERS[name]}
            locale="en"
            tone={(['yellow', 'pink', 'violet', 'red'] as const)[i % 4]}
            motion={false}
          />
          <span className={s.label}>{name}</span>
        </div>
      ))}
    </div>
  ),
}

/**
 * Never a violet sticker on a violet background: on a violet band the violet artwork is
 * recoloured pink or red, alternating. Left, the artwork as drawn on a dark band; right,
 * the same on violet.
 */
export const VioletBandRecolour: Story = {
  render: () => (
    <>
      <div className={s.band} style={{ background: 'var(--color-black)' }}>
        <div className={s.gallery}>
          {(['trust-me-developer', 'love-design-system', 'cool', 'developer-friendly'] as const).map((art) => (
            <Sticker key={art} kind="artwork" art={art} motion={false} />
          ))}
        </div>
      </div>
      <Shape as="div" band color="violet" auto="tr,br" seed={5} className={s.band}>
        <div className={s.gallery}>
          {(['trust-me-developer', 'love-design-system', 'cool', 'developer-friendly'] as const).map((art, i) => (
            <Sticker key={art} kind="artwork" art={art} recolor={i % 2 ? 'red' : 'pink'} motion={false} />
          ))}
        </div>
      </Shape>
    </>
  ),
}

/**
 * A page header with its sticker, rendered from the placement data
 * (`lib/stickers/placements`): <PageStickers page="vidburdir" />. The sticker nudges away
 * from the pointer (fine pointers only) and drifts against the scroll; both stop under
 * reduced motion. Hidden under 760px, as in the export.
 */
export const PageHeader: Story = {
  args: { kind: 'artwork', art: 'cool' },
  render: () => (
    <Shape as="header" band color="violet" auto="tr,br" seed={7} className={s.header}>
      <PageStickers page="vidburdir" band="header" locale="is" />
      <h1 className={s.h1}>Viðburðir</h1>
    </Shape>
  ),
}

/** Every placement in the data, each on a band of its colour, to compare with the export. */
export const AllPlacements: Story = {
  args: { kind: 'artwork', art: 'cool' },
  render: () => {
    const pages = [...new Set(STICKER_PLACEMENTS.map((p) => p.page))]
    return (
      <>
        {pages.map((page, i) => (
          <Shape
            key={page}
            as="section"
            band
            color={page === 'forsida' ? undefined : 'violet'}
            auto="tr,br"
            seed={i + 1}
            className={s.header}
            style={{ minHeight: 480 }}
          >
            <PageStickers page={page} locale="is" />
            <h2 className={s.h1}>{page}</h2>
          </Shape>
        ))}
      </>
    )
  },
}

/**
 * The parallax: stickers move against the scroll at `data-speed` (±0.15, ±0.12 in the
 * data), photos drift up to 18px. Scroll to see both. One passive scroll listener serves
 * all of them; native scrolling is never touched.
 */
export const ParallaxDemo: Story = {
  args: { kind: 'artwork', art: 'cool' },
  render: () => (
    <>
      <p className={s.filler}>Skrunaðu niður.</p>
      <Shape as="section" band color="yellow" auto="br" seed={3} className={s.band}>
        <Sticker
          kind="artwork"
          art="needs-sparkles"
          position={{ right: '7%', bottom: '16%' }}
          rotate={-6}
          speed={-0.15}
        />
        <Sticker
          kind="artwork"
          art="not-accessible"
          position={{ left: '9%', top: '90px' }}
          rotate={-7}
          speed={0.15}
        />
        <h2 className={s.h1} style={{ color: 'var(--color-black)' }}>
          Stickers: speed ±0.15
        </h2>
      </Shape>
      <p className={s.filler}>…</p>
    </>
  ),
}

/** The photo drift: the image inside slides up to 18px as the frame crosses the viewport. */
function DriftingPhoto() {
  const img = useRef<HTMLDivElement>(null)
  useParallax(img, { mode: 'drift' })
  return (
    <div className={s.photo}>
      {/* A stand-in for a photo: the drift is written as --drift on this element. */}
      <div ref={img} className={s.fakePhotoImg} role="img" aria-label="Stand-in photo" />
    </div>
  )
}

export const PhotoDrift: Story = {
  args: { kind: 'artwork', art: 'cool' },
  render: () => (
    <>
      <p className={s.filler}>Skrunaðu niður.</p>
      <DriftingPhoto />
      <p className={s.filler}>…</p>
    </>
  ),
}
