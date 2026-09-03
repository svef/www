import type { ReactNode } from 'react'
import styles from './BlockPanel.module.scss'

interface Shape {
  src: string
  l: number
  t: number
  w: number
  h: number
}

export interface PanelConfig {
  baseW: number
  baseH: number
  shapes: Shape[]
  text: { l: number; t: number; w: number }
  titleSize: number
  bodyIndent: number
}

// Desktop: the exact Figma composition (real shape SVGs) sized in cqw so text scales
// with it. Mobile: a robust flow layout — purple Tetris band + white panel + readable
// text (the fixed composition doesn't reflow, and text lengths vary).
export function BlockPanel({
  desktop,
  mobileBand,
  title,
  children,
}: {
  desktop: PanelConfig
  mobileBand: string
  title: string
  children: ReactNode
}) {
  const q = (px: number) => `${((px / desktop.baseW) * 100).toFixed(3)}cqw`
  return (
    <>
      <div
        className={styles.panel}
        style={{ maxWidth: desktop.baseW, aspectRatio: `${desktop.baseW} / ${desktop.baseH}` }}
      >
        {desktop.shapes.map((s, i) => (
          <img
            key={i}
            className={styles.shape}
            src={s.src}
            alt=""
            style={{ left: q(s.l), top: q(s.t), width: q(s.w), height: q(s.h) }}
          />
        ))}
        <div
          className={styles.text}
          style={{ left: q(desktop.text.l), top: q(desktop.text.t), width: q(desktop.text.w) }}
        >
          <h2 className={styles.title} style={{ fontSize: q(desktop.titleSize) }}>
            {title}
          </h2>
          <p className={styles.body} style={{ fontSize: q(22), paddingLeft: q(desktop.bodyIndent) }}>
            {children}
          </p>
        </div>
      </div>

      <div className={styles.mobile}>
        <img className={styles.mobileBand} src={mobileBand} alt="" />
        <div className={styles.mobileWhite}>
          <h2 className={styles.mobileTitle}>{title}</h2>
          <p className={styles.mobileBody}>{children}</p>
        </div>
      </div>
    </>
  )
}
