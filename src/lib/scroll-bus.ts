/**
 * One passive scroll/resize listener, shared by everything that follows the scroll
 * position (parallax, the stickers' spring). Subscribers are called once per animation
 * frame, never per event, and never in the handler itself.
 *
 * - The listeners are attached with the first subscriber and removed with the last.
 * - Nothing here calls `preventDefault`, moves the scroll position or hooks wheel/touch
 *   events: native scrolling is never touched.
 */

type Subscriber = () => void

const subscribers = new Set<Subscriber>()
let frame: number | null = null
let attached = false

function run() {
  frame = null
  subscribers.forEach((fn) => fn())
}

/** Asks for the subscribers to run on the next frame (coalesced). */
export function requestScrollFrame(): void {
  if (frame === null && subscribers.size > 0) frame = requestAnimationFrame(run)
}

function onEvent() {
  requestScrollFrame()
}

/** Subscribes `fn` to run once per frame while the page scrolls or resizes. Returns the unsubscribe. */
export function subscribeScroll(fn: Subscriber): () => void {
  subscribers.add(fn)
  if (!attached) {
    attached = true
    window.addEventListener('scroll', onEvent, { passive: true })
    window.addEventListener('resize', onEvent, { passive: true })
  }
  return () => {
    subscribers.delete(fn)
    if (subscribers.size === 0 && attached) {
      attached = false
      window.removeEventListener('scroll', onEvent)
      window.removeEventListener('resize', onEvent)
      if (frame !== null) cancelAnimationFrame(frame)
      frame = null
    }
  }
}

/** For tests: how many subscribers there are. */
export function _scrollSubscriberCount(): number {
  return subscribers.size
}
