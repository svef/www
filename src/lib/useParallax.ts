'use client'

import { useEffect, type RefObject } from 'react'
import { registerParallax, type ParallaxOptions } from './parallax'

/**
 * Opts an element into scroll parallax (see `@/lib/parallax`). All elements share one
 * passive scroll listener. The element's CSS applies the result:
 * `translate: 0 var(--py, 0px)` for an offset, `translate: 0 var(--drift, 0px)` for a drift.
 */
export function useParallax(
  ref: RefObject<HTMLElement | null>,
  options: ParallaxOptions,
  enabled = true,
): void {
  const mode = options.mode ?? 'offset'
  const value = 'speed' in options ? options.speed : (options.amplitude ?? 0)
  useEffect(() => {
    const el = ref.current
    if (!enabled || !el) return
    return registerParallax(el, mode === 'drift' ? { mode, amplitude: value || undefined } : { speed: value })
  }, [ref, enabled, mode, value])
}
