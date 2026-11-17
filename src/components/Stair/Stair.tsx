'use client'

import {
  useImperativeHandle,
  useRef,
  type Ref,
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactNode,
  type RefObject,
} from 'react'
import clsx from 'clsx'
import { useInset } from '@/lib/useInset'
import { restingPolygon, type StairPreset } from '@/lib/stair/stairs'
import { useStair } from './useStair'
import styles from './Stair.module.scss'

interface StairOwnProps {
  /** The staircase: `pink` (events), `yellow`, `red`, or the hero's `violet`. */
  preset?: StairPreset
  /** Mirror it left to right (the export's `.stair-flip`, `.stair-sep`). */
  flip?: boolean
  /**
   * Just the polygon, no section head: an absolutely positioned decoration the page
   * places itself (the hero's violet stair). It is drawn at once and starts stepping
   * when `revealed`.
   */
  bare?: boolean
  /**
   * Holds the entrance and the stepping until true. The hero's stair waits for the
   * loader. Default `true`.
   */
  revealed?: boolean
  /** Gives access to the polygon element (a bare stair is often another element's inset anchor). */
  polygonRef?: Ref<HTMLDivElement>
  /** Pull in from both edges while scrolling past (the band inset). Default `true`. */
  inset?: boolean
  /** Another element that decides when the inset starts (the export's intro band follows the hero stair). */
  insetAnchor?: RefObject<HTMLElement | null>
  /** `false`: the resting shape, no entrance, no stepping, no inset. What reduced motion gets. */
  motion?: boolean
  /** Fixes the random steps. Defaults to a hash of `useId()`. */
  seed?: string | number
  className?: string
  /** What sits on the stair: heading, button. They rise when the head arrives. */
  children?: ReactNode
}

export type StairProps<T extends ElementType = 'div'> = StairOwnProps & {
  /** The head element. Default `div`. */
  as?: T
} & Omit<ComponentPropsWithoutRef<T>, keyof StairOwnProps | 'as'>

/**
 * A stepped section divider: a coloured polygon whose edges keep stepping to new spots.
 *
 * The component renders the section head (`.stair-head`) — a box with the polygon
 * behind it and whatever you put on the stair in front, at its own pace. The polygon is
 * decoration (`aria-hidden`, never takes a pointer event) and is drawn at its resting
 * shape from the first byte, so with scripting off the page is complete.
 *
 * With motion: children are held back until a quarter of the head is on screen, then
 * rise (heading first, then the rest, the export's `pre` class). From then on, once
 * per beat, one edge of every stair on screen steps to a new spot — never while the
 * tab is hidden or the stair is off screen. Under `prefers-reduced-motion` (or
 * `motion={false}`): the resting shape, nothing else.
 *
 * Page composition is the page's: the export's overlap with the next section
 * (negative `margin-bottom`, which differs per page) and the button placement are not
 * part of the component.
 */
export function Stair<T extends ElementType = 'div'>(props: StairProps<T>) {
  const {
    as,
    preset = 'pink',
    flip = false,
    bare = false,
    revealed = true,
    inset = true,
    insetAnchor,
    polygonRef,
    motion = true,
    seed,
    className,
    children,
    ...rest
  } = props as StairProps
  const Tag: ElementType = as ?? 'div'
  const polygon = useRef<HTMLDivElement>(null)
  useImperativeHandle(polygonRef, () => polygon.current!, [])
  const head = useRef<HTMLDivElement>(null)
  const none = useRef<HTMLElement>(null)

  useStair(polygon, bare ? none : head, { preset, motion, revealed, seed })
  useInset(polygon, inset && motion, insetAnchor)

  const shape = (
    <div
      ref={polygon}
      data-stair={preset}
      aria-hidden="true"
      className={clsx(
        styles.stair,
        styles[preset],
        flip && styles.flip,
        bare && className,
      )}
      style={{ clipPath: restingPolygon(preset) }}
      {...(bare ? rest : {})}
    />
  )
  if (bare) return shape

  return (
    <Tag
      ref={head}
      data-stair-head=""
      className={clsx(styles.head, styles[`head-${preset}`], className)}
      {...rest}
    >
      {shape}
      {children}
    </Tag>
  )
}

/** The block of text that sits on a stair, placed where the export's `.stair-txt` is for that preset. */
export function StairText({ className, ...rest }: ComponentPropsWithoutRef<'div'>) {
  return <div className={clsx(styles.txt, className)} {...rest} />
}
