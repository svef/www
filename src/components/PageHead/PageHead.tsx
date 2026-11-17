import clsx from 'clsx'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr'
import { Shape, type ShapeColor } from '@/components/Shape/Shape'
import { Notch } from '@/components/Shape/Notch'
import { PageStickers } from '@/components/Sticker/PageStickers'
import { GrowText } from '@/components/GrowText/GrowText'
import type { Locale } from '@/lib/i18n'
import type { StickerPage } from '@/lib/stickers/placements'
import { createRng, toSeed } from '@/lib/shape/random'
import { pageHeadPreset } from '@/lib/shape/presets'
import styles from './PageHead.module.scss'

export interface PageHeadProps {
  /** The page's `<h1>`. Sits in the top-left notch. */
  title: string
  /** The page's language, for the sticker copy. */
  locale: Locale
  /** `lang` of the title, when it is not the page's (content that fell back to Icelandic). */
  titleLang?: string
  /** Small line above the title inside the notch, e.g. an article's `<time>`. */
  eyebrow?: ReactNode
  /** Link above the eyebrow, back to the parent page. */
  crumb?: { href: string; label: string; ariaLabel?: string }
  /** Standfirst at the foot of the band. */
  lede?: string
  /** `lang` of the lede, when it is not the page's. */
  ledeLang?: string
  /** The smaller title size, for headlines that are sentences (an article's). */
  long?: boolean
  /** The page whose stickers sit on this band (`lib/stickers/placements`). */
  stickers?: StickerPage
  /** Band colour. The export's page heads are all violet. */
  color?: ShapeColor
  /**
   * Fixes the random roll (corners, size, drift). Defaults to the title, so the same
   * page always has the same shape on the server and the client.
   */
  seed?: string | number
  /** Class for the foot of the band (the part under the title), for a page that sets it differently. */
  bodyClassName?: string
  /** Anything else for the foot of the band, beside the lede. */
  children?: ReactNode
}

/**
 * The page head every inner page opens with (the export's `header.band.phead`): a violet
 * band as tall as the screen, a title in a notch cut from its top-left corner, a
 * standfirst at its foot and the page's stickers, all on the shape engine.
 *
 * The export re-rolls the band's corners on every visit; here the roll is seeded
 * (`pageHeadPreset`), so each page keeps one shape and the server and client agree.
 *
 * The header overlays the top of the band, which is why the band carries no top margin of
 * its own — a page that starts with a `PageHead` needs no padding for the site header.
 */
export function PageHead({
  title,
  locale,
  titleLang,
  eyebrow,
  crumb,
  lede,
  ledeLang,
  long = false,
  stickers,
  color = 'violet',
  seed,
  bodyClassName,
  children,
}: PageHeadProps) {
  const shapeSeed = toSeed(seed ?? title)
  const preset = pageHeadPreset(createRng(shapeSeed))

  return (
    <Shape
      as="header"
      band
      color={color}
      seed={shapeSeed}
      auto={preset.auto}
      autoSize={preset.autoSize}
      ambient={preset.ambient}
      nocap={preset.nocap}
      className={styles.head}
    >
      {stickers && <PageStickers page={stickers} band="header" locale={locale} />}
      <div className={styles.wrap}>
        <Notch corner="tl" drift={preset.titleDrift} className={styles.title}>
          {crumb && (
            <Link className={styles.crumb} href={crumb.href} aria-label={crumb.ariaLabel}>
              <ArrowLeft className={styles.arrow} weight="bold" aria-hidden="true" />
              <GrowText>{crumb.label}</GrowText>
            </Link>
          )}
          {eyebrow && <p className={clsx('no-condense', styles.eyebrow)}>{eyebrow}</p>}
          <h1 className={clsx(long && styles.long)} lang={titleLang}>
            {title}
          </h1>
        </Notch>
        {(lede || children) && (
          <div className={clsx(styles.body, bodyClassName)}>
            {lede && (
              <p className={styles.lede} lang={ledeLang}>
                {lede}
              </p>
            )}
            {children}
          </div>
        )}
      </div>
    </Shape>
  )
}
