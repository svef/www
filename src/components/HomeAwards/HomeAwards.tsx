'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useParallax } from '@/lib/useParallax'
import styles from './HomeAwards.module.scss'

/**
 * The award-night photos behind the home page's Web Awards headline (the export's
 * `.aw-ph`): the photo, its stepped frame, and the speed it drifts at while you scroll.
 * Offsets are the export's `(section centre - viewport centre) * factor`, which the
 * registry writes as `centre * speed * 0.5`, hence the doubled speeds.
 */
const PHOTOS = [
  { src: '/home/awards/ev-veitingar.webp', width: 801, height: 1200, frame: 'c1 tl', speed: -0.06 },
  { src: '/home/awards/ev-2023.webp', width: 1200, height: 801, frame: 'c2 tr', speed: 0.04 },
  { src: '/home/awards/ev-verdlaun.webp', width: 801, height: 1200, frame: 'c3 tl', speed: -0.09 },
] as const

function Photo({ photo }: { photo: (typeof PHOTOS)[number] }) {
  const ref = useRef<HTMLElement>(null)
  useParallax(ref, { speed: photo.speed })
  const [a, b] = photo.frame.split(' ')
  return (
    <figure ref={ref} className={`${styles.card} ${styles[a]} ${styles[b]}`}>
      <div className={styles.ph}>
        {/* Decorative, as in the export: the headline says what the section is about. */}
        <Image
          src={photo.src}
          alt=""
          fill
          sizes="(max-width: 900px) 40vw, 21vw"
        />
      </div>
    </figure>
  )
}

/**
 * Decorative, `aria-hidden`. Placed against the nearest positioned ancestor (the section).
 *
 * Entrance: the photos step up one after another when the section first comes into view.
 * Until the script has run, and under `prefers-reduced-motion`, they simply sit in place:
 * the hidden starting state is only set once it is known that something will show them.
 */
export function HomeAwardsPhotos() {
  const ref = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<'rest' | 'armed' | 'in'>('rest')

  useEffect(() => {
    const el = ref.current
    const section = el?.closest('section')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!el || !section || reduce || !('IntersectionObserver' in window)) return
    setPhase('armed')
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect()
          setPhase('in')
        }
      },
      { threshold: 0.25 },
    )
    io.observe(section)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={ref} className={styles.photos} data-phase={phase} aria-hidden="true">
      {PHOTOS.map((photo) => (
        <Photo key={photo.src} photo={photo} />
      ))}
    </div>
  )
}
