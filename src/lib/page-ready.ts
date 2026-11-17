/**
 * Resolves once the first page is ready to look at: the caller is hydrated
 * (call this from an effect) and the web fonts have settled, with the fonts
 * raced against a short timeout so a slow or failing font never holds the page
 * up. Memoised, so every caller shares one wait.
 */
export const FONT_WAIT_MS = 1000

let ready: Promise<void> | null = null

export function whenPageReady(): Promise<void> {
  ready ??= Promise.race([
    typeof document !== 'undefined' && document.fonts?.ready
      ? document.fonts.ready.then(() => undefined)
      : Promise.resolve(),
    new Promise<void>((resolve) => setTimeout(resolve, FONT_WAIT_MS)),
  ])
  return ready
}

/** Test seam: forget the memoised wait. */
export function resetPageReady() {
  ready = null
}
