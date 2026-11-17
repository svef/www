import type { ShapeColor } from '@/components/Shape/Shape'

// A plain module, not part of the client `EventPoster`: a Server Component (the event page
// picks its ticket colour from these) cannot read a value exported from a client module.

/**
 * The export's event posters are hand-dressed like its news posters: a colour, and which
 * side the title and the foot sit on. Six looks (the six events of the export, in order),
 * repeated, so a poster's look depends only on its place in the list.
 */
export interface EventPosterLook {
  color: ShapeColor
  /** Where the title sits: `tl` or `tr`. */
  titleAt: 'tl' | 'tr'
  /** Where the date and meta line sit: `bl` or `br`. */
  footAt: 'bl' | 'br'
}

export const EVENT_POSTER_LOOKS: readonly EventPosterLook[] = [
  { color: 'red', titleAt: 'tl', footAt: 'bl' },
  { color: 'violet', titleAt: 'tr', footAt: 'bl' },
  { color: 'pink', titleAt: 'tl', footAt: 'br' },
  { color: 'yellow', titleAt: 'tr', footAt: 'br' },
  { color: 'violet', titleAt: 'tl', footAt: 'bl' },
  { color: 'red', titleAt: 'tr', footAt: 'bl' },
]

export function eventPosterLook(index: number): EventPosterLook {
  const n = EVENT_POSTER_LOOKS.length
  return EVENT_POSTER_LOOKS[((index % n) + n) % n]
}
