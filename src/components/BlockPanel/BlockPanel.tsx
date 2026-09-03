import type { ReactNode } from 'react'
import styles from './BlockPanel.module.scss'

interface Box {
  l: number
  t: number
  w: number
  h: number
}

// Reproduces the Figma "purple Tetris shape behind a stepped white panel" sections
// (Um SVEF, Fyrsti viðburður) using the real shape SVGs at their exact positions.
// Everything is sized in cqw (container-query width) so the whole composition scales
// proportionally — text included — matching the fixed-width design at any size.
export function BlockPanel({
  baseW,
  baseH,
  purpleSrc,
  purple,
  whiteSrc,
  white,
  text,
  title,
  titleSize,
  children,
}: {
  baseW: number
  baseH: number
  purpleSrc: string
  purple: Box
  whiteSrc: string
  white: Box
  text: { l: number; t: number; w: number }
  title: string
  titleSize: number
  children: ReactNode
}) {
  const q = (px: number) => `${((px / baseW) * 100).toFixed(3)}cqw`
  return (
    <div className={styles.panel} style={{ maxWidth: baseW, aspectRatio: `${baseW} / ${baseH}` }}>
      <img
        className={styles.shape}
        src={purpleSrc}
        alt=""
        style={{ left: q(purple.l), top: q(purple.t), width: q(purple.w), height: q(purple.h) }}
      />
      <img
        className={styles.shape}
        src={whiteSrc}
        alt=""
        style={{ left: q(white.l), top: q(white.t), width: q(white.w), height: q(white.h) }}
      />
      <div className={styles.text} style={{ left: q(text.l), top: q(text.t), width: q(text.w) }}>
        <h2 className={styles.title} style={{ fontSize: q(titleSize) }}>
          {title}
        </h2>
        <p className={styles.body} style={{ fontSize: q(22), paddingLeft: q(93) }}>
          {children}
        </p>
      </div>
    </div>
  )
}
