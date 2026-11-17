'use client'

import { useEffect, type RefObject } from 'react'
import { registerInset } from './inset'

/**
 * Opts an element into the band inset (see `@/lib/inset`). All elements share one
 * passive scroll listener. Pair it with `@include inset-mask` on the element that
 * carries the colour.
 */
export function useInset(
  ref: RefObject<HTMLElement | null>,
  enabled = true,
  anchor?: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    const el = ref.current
    if (!enabled || !el) return
    return registerInset(el, { anchor: anchor ? () => anchor.current : undefined })
  }, [ref, enabled, anchor])
}
