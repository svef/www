'use client'

import {
  useRef,
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactNode,
  type RefObject,
} from 'react'
import clsx from 'clsx'
import { useInset } from '@/lib/useInset'
import { useShape, type ShapeOptions } from './useShape'
import styles from './Shape.module.scss'

export type ShapeColor = 'violet' | 'red' | 'pink' | 'yellow' | 'white'

interface ShapeOwnProps extends ShapeOptions {
  /** Colour of the shape. Text on it uses `var(--shape-on)` (white on violet, black on the rest). */
  color?: ShapeColor
  /** White bars that sit in the bottom-right (else top-right) notch. Hidden under 760px. */
  bars?: number
  /** The "SVEF" mark, set in the bottom-left notch. */
  mark?: boolean
  /** Content of the clipped colour layer itself, e.g. a photo filling the shape. */
  layer?: ReactNode
  /**
   * The band inset: the colour pulls in from both edges (24px, 12px on phones) as you
   * scroll past where the shape first sits. For full-width bands. One shared passive
   * scroll listener serves every inset element; reduced motion gets none.
   */
  inset?: boolean
  /** Another element that decides when the inset starts (the export's intro band follows the hero stair). */
  insetAnchor?: RefObject<HTMLElement | null>
  className?: string
  children?: ReactNode
}

export type ShapeProps<T extends ElementType = 'div'> = ShapeOwnProps & {
  /** The element to render. Default `div`. */
  as?: T
} & Omit<ComponentPropsWithoutRef<T>, keyof ShapeOwnProps | 'as'>

/**
 * A block of colour with stepped corners cut out of it, the redesign's signature device.
 *
 * Decorative corners (`auto`) take a seeded random size; children wrapped in `<Notch>`
 * get a black cut-out around themselves, so a headline can sit on black while the
 * colour does the shouting. The outline is a `clip-path` on the colour layer only, so
 * it never affects layout.
 *
 * **Server render.** The colour layer has no `clip-path` until the client has measured
 * the box: a notch's size depends on the box and on the text in it, neither of which the
 * server knows, and the decorative corners have to avoid that same text. Guessing
 * them on the server would put black cut-outs under text set in black for the light
 * colours. So the resting state without JavaScript is the plain rectangle, and each
 * `<Notch>` carries a black backing until the shape is painted — everything is
 * readable, and since `clip-path` and `box-shadow` don't take part in layout, nothing
 * moves when the client paints. Where scripting is on (and motion allowed), the
 * shape is painted by the client, and the entrance (content rising over the resting
 * shape) plays when it mounts. On the *first load of a document* the shapes already
 * above the fold skip it: they are what the visitor has been reading since first paint,
 * and hiding them until hydration only delays LCP. They settle in place (state
 * `settled`); shapes below the fold, and every shape mounted by a client navigation,
 * still get the entrance.
 */
export function Shape<T extends ElementType = 'div'>(props: ShapeProps<T>) {
  const {
    as,
    color = 'violet',
    bars = 0,
    mark = false,
    layer,
    inset = false,
    insetAnchor,
    className,
    children,
    // engine options
    auto,
    autoMobile,
    autoSize,
    pad,
    breathe,
    band,
    nocap,
    ambient,
    morphOnHover,
    riseDelay,
    motion,
    revealHeadings,
    seed,
    ...rest
  } = props as ShapeProps
  const Tag: ElementType = as ?? 'div'
  // typed as a div for JSX; the hook only needs an HTMLElement
  const ref = useRef<HTMLDivElement>(null)
  useShape(ref, {
    auto,
    autoMobile,
    autoSize,
    pad,
    breathe,
    band,
    nocap,
    ambient,
    morphOnHover,
    riseDelay,
    motion,
    revealHeadings,
    seed,
  })

  useInset(ref, inset && motion !== false, insetAnchor)

  return (
    <Tag
      ref={ref}
      data-shape=""
      className={clsx(styles.shape, styles[color], inset && styles.inset, className)}
      {...rest}
    >
      <span className={styles.layer} data-shape-layer="" aria-hidden="true">
        {layer}
      </span>
      {children}
      {Array.from({ length: bars }, (_, i) => (
        <span key={i} className={styles.bar} data-shape-bar="" aria-hidden="true" />
      ))}
      {mark && (
        <span className={styles.mark} data-shape-mark="" aria-hidden="true">
          SVEF
        </span>
      )}
    </Tag>
  )
}
