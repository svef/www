import { useEffect, type RefObject } from 'react'

/** The headline waits this long after the page is ready before its words start. */
export const HERO_HOLD = 200
/** The buttons come in this long after the words start (the export: 1750 from the lock, 200 of it hold). */
export const HERO_ACTIONS_AT = 1550
/** Each word starts this much after the one before. */
export const HERO_WORD_STAGGER = 90
/** A word's rise starts this long after its turn comes, and the morph runs this long (the CSS's). */
const WORD_RISE_DELAY = 450
const WORD_MORPH = 1700

/**
 * Drives the hero headline's word-by-word morph (the export's `lockHero`).
 *
 * The page is rendered with the words in place and settled, so without scripting, and
 * under `prefers-reduced-motion`, nothing moves and nothing is hidden. With both on, the
 * words are held back (CSS, with a failsafe) until this hook has:
 *
 * 1. waited for the fonts, then **fixed each word's box to its settled size**. The morph
 *    swings a word between narrow-and-light and wide-and-heavy; with the boxes fixed that
 *    only repaints the word, instead of reflowing the whole headline every frame.
 * 2. started the words (`data-hero="play"`), then the buttons (`data-actions`), and, once
 *    the last word has landed, marked the headline settled (`data-hero="settled"`), which
 *    drops the animation so a resize can measure the settled words again.
 */
export function useHeroMorph(
  hero: RefObject<HTMLElement | null>,
  title: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const heroEl = hero.current
    const titleEl = title.current
    if (!heroEl || !titleEl) return

    const setAttr = (name: string, value: string | null) => {
      if (value === null) heroEl.removeAttribute(name)
      else heroEl.setAttribute(name, value)
    }

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setAttr('data-hero', 'settled')
      setAttr('data-actions', '')
      return
    }

    const words = () => Array.from(titleEl.querySelectorAll<HTMLElement>('[data-word]'))

    /** Fix the title and every word to its settled size. Only while no animation runs. */
    function lock() {
      const list = words()
      titleEl!.style.width = ''
      titleEl!.style.height = ''
      list.forEach((w) => {
        w.style.width = ''
        w.style.height = ''
      })
      // Read everything, then write everything: one layout, not one per word.
      const box = titleEl!.getBoundingClientRect()
      const sizes = list.map((w) => w.getBoundingClientRect())
      titleEl!.style.width = `${Math.ceil(box.width)}px`
      titleEl!.style.height = `${Math.ceil(box.height)}px`
      list.forEach((w, i) => {
        w.style.width = `${sizes[i].width.toFixed(2)}px`
        w.style.height = `${sizes[i].height.toFixed(2)}px`
      })
    }

    const timers: number[] = []
    const later = (fn: () => void, ms: number) => {
      timers.push(window.setTimeout(fn, ms))
    }
    let cancelled = false
    let relock = false
    let startWidth = window.innerWidth

    setAttr('data-hero', 'wait')
    setAttr('data-actions', null)

    const fonts = document.fonts?.ready ?? Promise.resolve()
    fonts.then(() => {
      if (cancelled) return
      lock()
      const count = words().length
      later(() => {
        setAttr('data-hero', 'play')
      }, HERO_HOLD)
      later(() => {
        setAttr('data-actions', '')
      }, HERO_HOLD + HERO_ACTIONS_AT)
      later(
        () => {
          setAttr('data-hero', 'settled')
          if (relock) lock()
        },
        HERO_HOLD + (count - 1) * HERO_WORD_STAGGER + WORD_RISE_DELAY + WORD_MORPH + 100,
      )
    })

    // A new width re-wraps nothing (each line is a line), but it changes the type size,
    // so the boxes are measured again. Phones fire height-only resizes while scrolling
    // (the address bar): those are ignored.
    let resizeTimer: number | undefined
    const onResize = () => {
      if (window.innerWidth === startWidth) return
      startWidth = window.innerWidth
      window.clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(() => {
        if (heroEl.getAttribute('data-hero') === 'settled') lock()
        else relock = true
      }, 120)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelled = true
      timers.forEach((t) => window.clearTimeout(t))
      window.clearTimeout(resizeTimer)
      window.removeEventListener('resize', onResize)
    }
  }, [hero, title])
}
