'use client'

import { useEffect, useRef, type CSSProperties } from 'react'
import clsx from 'clsx'
import type { Locale } from '@/lib/i18n'
import { ARTWORK, artworkSrc, type ArtworkName, type Recolor } from '@/lib/stickers/artwork'
import type { StickerPosition } from '@/lib/stickers/placements'
import { textLayout, type LocalizedCopy, type StickerTone } from '@/lib/stickers/text'
import { registerSpring } from '@/lib/sticker-spring'
import { useParallax } from '@/lib/useParallax'
import styles from './Sticker.module.scss'

interface CommonProps {
  /** Where it sits, inside the nearest positioned ancestor. Left out: it flows in place (stories, demos). */
  position?: StickerPosition
  /** Degrees. */
  rotate?: number
  /** Parallax speed against the parent. 0: none. */
  speed?: number
  /** Shown on phones at this place and width instead of being hidden there. */
  mobile?: StickerPosition & { width?: string }
  /** `false`: no parallax and no spring, the resting placement. What reduced motion gets anyway. */
  motion?: boolean
  className?: string
}

export interface ArtworkStickerProps extends CommonProps {
  kind: 'artwork'
  art: ArtworkName
  /** The colour that replaces the artwork's violet (it sits on a violet band). */
  recolor?: Recolor
}

export interface TextStickerProps extends CommonProps {
  kind: 'text'
  copy: LocalizedCopy
  /** Which language's copy. */
  locale: Locale
  tone: StickerTone
}

export type StickerProps = ArtworkStickerProps | TextStickerProps

function placeStyle(p: StickerProps): CSSProperties {
  const style: Record<string, string | number> = { '--rot': `${p.rotate ?? 0}deg` }
  const set = (prefix: string, pos?: StickerPosition & { width?: string }) => {
    if (!pos) return
    if (pos.top) style[`--${prefix}t`] = pos.top
    if (pos.right) style[`--${prefix}r`] = pos.right
    if (pos.bottom) style[`--${prefix}b`] = pos.bottom
    if (pos.left) style[`--${prefix}l`] = pos.left
    if (pos.width) style[`--${prefix}w`] = pos.width
  }
  set('', p.position)
  set('m', p.mobile)
  return style as CSSProperties
}

/**
 * A die-cut sticker, decorative only: `aria-hidden`, `inert` (so nothing in it can take
 * focus), no pointer events.
 *
 * Two kinds: **artwork** (the designers' SVG, optionally recoloured off violet) and
 * **text** (the brand label in CSS, its copy chosen by `locale`). Placed absolutely when
 * given a `position`, so the parent must be `position: relative`.
 *
 * Moves two ways, both off under reduced motion and both writing custom properties the
 * stylesheet applies: scroll parallax (`speed`) and, with a fine pointer, a nudge away
 * from the mouse. See `lib/parallax` and `lib/sticker-spring`.
 */
export function Sticker(props: StickerProps) {
  const { speed = 0, motion = true, className } = props
  const ref = useRef<HTMLDivElement>(null)

  useParallax(ref, { speed }, motion && speed !== 0)

  useEffect(() => {
    const el = ref.current
    if (!motion || !el) return
    return registerSpring(el)
  }, [motion])

  const placed = !!props.position
  const toneClass = props.kind === 'text' ? styles[props.tone] : undefined
  return (
    <div
      ref={ref}
      aria-hidden="true"
      inert
      className={clsx(
        styles.sticker,
        placed && styles.placed,
        props.mobile && styles.mobile,
        toneClass,
        className,
      )}
      style={placeStyle(props)}
      data-kind={props.kind}
    >
      {props.kind === 'artwork' ? (
        // The SVGs are die-cut artwork with fixed colours: next/image has nothing to optimise.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className={styles.art}
          src={artworkSrc(props.art, props.recolor)}
          width={ARTWORK[props.art].width}
          height={ARTWORK[props.art].height}
          alt=""
          draggable={false}
        />
      ) : (
        <TextLabel copy={props.copy} locale={props.locale} />
      )}
    </div>
  )
}

function Lines({ lines }: { lines: string[] }) {
  return lines.map((line, i) => (
    <span key={i}>
      {i > 0 && <br />}
      {line}
    </span>
  ))
}

function TextLabel({ copy, locale }: { copy: LocalizedCopy; locale: Locale }) {
  const layout = textLayout(copy[locale])
  if (layout.kind === 'strip-block') {
    return (
      <span className={clsx(styles.sk, styles.skA)}>
        <span className={styles.up}>{layout.strip}</span>
        <span className={styles.frame}>
          <span className={clsx(styles.block, layout.upper && styles.up, layout.upper && styles.blockUpper)}>
            <Lines lines={layout.block} />
          </span>
        </span>
      </span>
    )
  }
  if (layout.kind === 'word-block-word') {
    return (
      <span className={clsx(styles.sk, styles.skB)}>
        <span className={styles.up}>{layout.top}</span>
        <span className={styles.blk} />
        <span className={styles.up}>{layout.bottom}</span>
      </span>
    )
  }
  return (
    <span className={clsx(styles.sk, styles.skC)}>
      <span className={styles.block}>
        <Lines lines={layout.lines} />
      </span>
    </span>
  )
}
