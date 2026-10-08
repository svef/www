import { useLayoutEffect, useRef } from 'react'

/**
 * Makes a textarea as tall as its content.
 *
 * Reset to `auto` first so it can also shrink when text is deleted, then size
 * to `scrollHeight`. Runs on every value change, which covers typing, paste and
 * the form being repopulated. CSS caps the height so a very long message
 * scrolls instead of pushing the submit button out of reach.
 */
export function useAutoGrow(value: string) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])
  return ref
}
