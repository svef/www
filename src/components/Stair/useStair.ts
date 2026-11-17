'use client'

import { useEffect, useId, useLayoutEffect, useRef, type RefObject } from 'react'
import { StairController } from '@/lib/stair/controller'
import type { StairPreset } from '@/lib/stair/stairs'
import { toSeed } from '@/lib/shape/random'

export interface StairOptions {
  preset: StairPreset
  motion?: boolean
  revealed?: boolean
  seed?: string | number
}

/** Attaches a stair's polygon, entrance and ambient stepping to its elements. */
export function useStair(
  el: RefObject<HTMLElement | null>,
  head: RefObject<HTMLElement | null>,
  { preset, motion = true, revealed = true, seed }: StairOptions,
): void {
  const id = useId()
  const s = toSeed(seed ?? id)
  const controller = useRef<StairController | null>(null)
  const revealedRef = useRef(revealed)

  // Layout effect: the head's children are hidden before the first paint.
  useLayoutEffect(() => {
    const node = el.current
    if (!node) return
    const c = new StairController(
      node,
      head.current,
      { preset, motion, revealed: revealedRef.current },
      s,
    )
    controller.current = c
    c.mount()
    return () => {
      c.destroy()
      if (controller.current === c) controller.current = null
    }
  }, [el, head, preset, motion, s])

  useEffect(() => {
    revealedRef.current = revealed
    controller.current?.setRevealed(revealed)
  }, [revealed])
}
