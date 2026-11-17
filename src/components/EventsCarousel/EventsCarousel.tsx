'use client'

import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import clsx from 'clsx'
import styles from './EventsCarousel.module.scss'

export interface EventsCarouselProps {
  /** The `EventPoster`s. Each becomes one slide. */
  children: ReactNode
  /** Accessible name of the carousel, e.g. "Næstu viðburðir". */
  label: string
  /** Accessible name of a slide's dot; `{n}` becomes the slide's number, e.g. "Viðburður {n}". */
  dotLabel: string
  className?: string
}

const pad = (n: number) => String(n).padStart(2, '0')

/** `01 / 06` for one visible slide, `01–03 / 06` for several. */
export function counterText(first: number, last: number, total: number): string {
  return `${first === last ? pad(first + 1) : `${pad(first + 1)}–${pad(last + 1)}`} / ${pad(total)}`
}

/**
 * A row of posters that scrolls sideways (the export's `.ev-track`).
 *
 * The scroller is native: `overflow-x` with `scroll-snap`, so touch, trackpad, the keyboard
 * (focusing a poster scrolls it into view) and a screen reader all work with no script,
 * and vertical scrolling is never captured — the wheel and touch pan over it go to the page.
 *
 * Script adds three things, each optional:
 * - **mouse drag**, for `pointerType === 'mouse'` only. A drag that moved is not a click.
 * - **an indicator**: dots, one per slide, lit for the slides in view, and a `01–03 / 06`
 *   counter. It appears once the script has run, so there are no dead buttons before it.
 * - **entrance motion**: slides near the right edge sit a few steps low and rise into place
 *   as they scroll in. Not under `prefers-reduced-motion`.
 */
export function EventsCarousel({ children, label, dotLabel, className }: EventsCarouselProps) {
  const slides = Children.toArray(children)
  const total = slides.length
  const track = useRef<HTMLUListElement>(null)
  const [enhanced, setEnhanced] = useState(false)
  const [range, setRange] = useState<[number, number]>([0, 0])

  const reduce = useCallback(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )

  // Which slides are in view, and the rise of the ones that are not quite.
  const update = useCallback(() => {
    const el = track.current
    if (!el) return
    const items = Array.from(el.children) as HTMLElement[]
    const box = el.getBoundingClientRect()
    const motion = !reduce()
    let first = -1
    let last = -1
    items.forEach((item, i) => {
      const r = item.getBoundingClientRect()
      if (r.left >= box.left - 8 && r.right <= box.right + 8) {
        if (first < 0) first = i
        last = i
      }
      // The export's stepped rise: four steps of 20px over the right 40% of the track.
      const p = (r.left - box.left) / box.width
      const k = Math.min(1, Math.max(0, (p - 0.6) / 0.4))
      item.style.transform = motion && k > 0 ? `translateY(${Math.round(k * 4) * 20}px)` : ''
    })
    if (first < 0) first = last = 0
    setRange((prev) => (prev[0] === first && prev[1] === last ? prev : [first, last]))
  }, [reduce])

  useEffect(() => {
    const el = track.current
    if (!el) return
    setEnhanced(true)

    let queued = false
    const onScroll = () => {
      if (queued) return
      queued = true
      requestAnimationFrame(() => {
        queued = false
        update()
      })
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', update)
    update()

    // Mouse drag. Touch and pen scroll natively, so they are left alone entirely.
    let startX = 0
    let startScroll = 0
    let down = false
    let moved = false

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return
      if (el.scrollWidth <= el.clientWidth) return
      down = true
      moved = false
      startX = e.clientX
      startScroll = el.scrollLeft
    }
    const onMove = (e: PointerEvent) => {
      if (!down) return
      const dx = e.clientX - startX
      if (Math.abs(dx) > 4) {
        moved = true
        el.classList.add(styles.dragging)
      }
      if (moved) el.scrollLeft = startScroll - dx
    }
    const onUp = () => {
      if (!down) return
      down = false
      if (!moved) return
      // Settle on the nearest slide, then let snapping take over again.
      const items = Array.from(el.children) as HTMLElement[]
      const origin = items[0].offsetLeft
      let best = 0
      items.forEach((item, i) => {
        if (Math.abs(item.offsetLeft - origin - el.scrollLeft) < Math.abs(items[best].offsetLeft - origin - el.scrollLeft)) best = i
      })
      el.classList.remove(styles.dragging)
      el.scrollTo({ left: items[best].offsetLeft - origin, behavior: reduce() ? 'auto' : 'smooth' })
    }
    // A drag is not a click: swallow the one that follows it.
    const onClick = (e: MouseEvent) => {
      if (!moved) return
      e.preventDefault()
      e.stopPropagation()
      moved = false
    }
    // Stops the browser starting a native drag of a link.
    const onDragStart = (e: DragEvent) => e.preventDefault()

    el.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    el.addEventListener('click', onClick, true)
    el.addEventListener('dragstart', onDragStart)

    return () => {
      el.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', update)
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      el.removeEventListener('click', onClick, true)
      el.removeEventListener('dragstart', onDragStart)
    }
  }, [update, reduce])

  const goTo = (i: number) => {
    const el = track.current
    if (!el) return
    const items = Array.from(el.children) as HTMLElement[]
    el.scrollTo({
      left: items[i].offsetLeft - items[0].offsetLeft,
      behavior: reduce() ? 'auto' : 'smooth',
    })
  }

  return (
    <div
      className={clsx(styles.carousel, className)}
      role="group"
      aria-roledescription="carousel"
      aria-label={label}
    >
      <ul ref={track} className={styles.track}>
        {slides.map((slide, i) => (
          <li key={i} className={styles.slide}>
            {slide}
          </li>
        ))}
      </ul>
      {total > 1 && (
        <div className={styles.indicator} hidden={!enhanced}>
          <ol className={styles.dots}>
            {slides.map((_, i) => (
              <li key={i}>
                <button
                  type="button"
                  className={clsx(styles.dot, i >= range[0] && i <= range[1] && styles.on)}
                  aria-label={dotLabel.replace('{n}', String(i + 1))}
                  aria-current={i >= range[0] && i <= range[1] ? 'true' : undefined}
                  onClick={() => goTo(i)}
                />
              </li>
            ))}
          </ol>
          <span className={styles.count} aria-hidden="true">
            {counterText(range[0], range[1], total)}
          </span>
        </div>
      )}
    </div>
  )
}
