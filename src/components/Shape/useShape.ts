'use client'

import { useId, useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import { ShapeController, type ShapeConfig } from '@/lib/shape/controller'
import { parseCorners, type Corner } from '@/lib/shape/geometry'
import { toSeed } from '@/lib/shape/random'

export interface ShapeOptions {
  /** Decorative corners, e.g. `"tr,br"` (`data-auto`). Order matters: it picks the draws. */
  auto?: string | readonly Corner[]
  /** Replaces `auto` at viewport widths of 900px and below (`data-auto-m`). */
  autoMobile?: string | readonly Corner[]
  /** Larger, height-relative decorative notches (`data-auto-size="lg"`). */
  autoSize?: 'lg'
  /** Clearance around notch content. Defaults to 28px on boxes wider than 600px, else 18px. */
  pad?: number
  /** How far text notches open when the shape drifts or is hovered (`data-breathe`). */
  breathe?: number
  /** A full-width band: bottom decorative notches stay within its bottom padding. */
  band?: boolean
  /** Lifts the band's cap on bottom notches (`data-nocap`). */
  nocap?: boolean
  /** Drift on the ambient beat: every 8s, or every 6s and further when `"lively"`. */
  ambient?: boolean | 'lively'
  /** Text notches step open on hover and keyboard focus (event posters). */
  morphOnHover?: boolean
  /** Extra wait before the entrance, ms (the hero's 120ms hold, or a band that follows it). */
  riseDelay?: number
  /** `false`: draw the resting shape and reveal content with no motion. */
  motion?: boolean
  /** Reveal `h1`–`h3` from behind their bottom edge on entrance. Default `true`. */
  revealHeadings?: boolean
  /** Fixes the shape's random draws. Defaults to a hash of `useId()`. */
  seed?: string | number
}

/**
 * Attaches the stepped-shape engine to an element.
 *
 * The element needs the `.shape` styles from `Shape.module.scss` (position, stacking)
 * and a `[data-shape-layer]` child to clip — `<Shape>` renders both. The hook only
 * measures and paints; the geometry is pure (`@/lib/shape/geometry`).
 */
export function useShape(
  ref: RefObject<HTMLElement | null>,
  options: ShapeOptions = {},
): void {
  const id = useId()
  const seed = toSeed(options.seed ?? id)

  const {
    auto,
    autoMobile,
    autoSize,
    pad,
    breathe,
    band = false,
    nocap = false,
    ambient = false,
    morphOnHover = false,
    riseDelay = 0,
    motion = true,
    revealHeadings = true,
  } = options
  const autoKey = typeof auto === 'string' ? auto : auto?.join(',')
  const autoMobileKey =
    typeof autoMobile === 'string' ? autoMobile : autoMobile?.join(',')

  const config = useMemo<ShapeConfig>(
    () => ({
      auto: parseCorners(autoKey),
      autoMobile: autoMobileKey == null ? undefined : parseCorners(autoMobileKey),
      autoSize,
      pad,
      breathe,
      capped: band,
      nocap,
      ambient: ambient === 'lively' ? 'lively' : ambient ? 'calm' : false,
      morphOnHover,
      riseDelay,
      motion,
      revealHeadings,
    }),
    [
      autoKey,
      autoMobileKey,
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
    ],
  )

  const configRef = useRef(config)
  const controller = useRef<ShapeController | null>(null)

  // Declared first so it runs first: keeps the latest options where the mount effect
  // can read them, and hands later changes to the live controller.
  useLayoutEffect(() => {
    configRef.current = config
    controller.current?.update(config)
  }, [config])

  // Layout effect: the shape is painted, and pending content hidden, before the
  // browser paints the frame the element first appears in.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const c = new ShapeController(el, configRef.current, seed)
    controller.current = c
    c.mount()
    return () => {
      c.destroy()
      if (controller.current === c) controller.current = null
    }
  }, [ref, seed])
}
