'use client'

import { Fragment, useRef, type CSSProperties } from 'react'
import { Shape } from '@/components/Shape/Shape'
import { Notch } from '@/components/Shape/Notch'
import { Stair } from '@/components/Stair/Stair'
import { PageStickers } from '@/components/Sticker/PageStickers'
import { ButtonLink } from '@/components/ButtonLink/ButtonLink'
import type { Locale } from '@/lib/i18n'
import { useHeroMorph } from './useHeroMorph'
import styles from './HomeOpening.module.scss'

export interface HomeOpeningProps {
  locale: Locale
  /** The headline, one entry per line. Each word animates on its own. */
  lines: string[]
  /** `lang` of the headline, when it is not the page's. */
  titleLang?: string
  /** The hero's buttons. A hidden page's button is left out by the caller. */
  actions: { label: string; href: string; lang?: string }[]
  /** The statement in the intro band. Left out: no band. */
  intro?: { text: string; lang?: string }
}

/**
 * The home page's opening (the export's hero and intro band).
 *
 * - **The hero**: a headline whose words rise one after another while each morphs
 *   between narrow-and-light and wide-and-heavy before settling (`useHeroMorph`). Every
 *   word sits in a box fixed to its settled size, so the morph never reflows the
 *   headline. The hero has no colour layer of its own: its colour is the violet stair
 *   at its foot.
 * - **The intro band** follows the stair: both start to pull in from the edges together
 *   (`insetAnchor`), and the band's entrance waits for the headline to get going.
 *
 * Under `prefers-reduced-motion`: the settled headline and the buttons at once, a stair
 * at rest, and a band at its full width.
 */
export function HomeOpening({ locale, lines, titleLang, actions, intro }: HomeOpeningProps) {
  const hero = useRef<HTMLElement>(null)
  const title = useRef<HTMLDivElement>(null)
  const heroStair = useRef<HTMLDivElement>(null)
  useHeroMorph(hero, title)

  // One running index across lines: it staggers the words' animation delays.
  let index = 0

  return (
    <>
      <section ref={hero} className={styles.hero}>
        <PageStickers page="forsida" band="hero" locale={locale} />
        <div className={styles.wrap}>
          <div ref={title} className={styles.title}>
            <h1 lang={titleLang} className={styles.h1}>
              {lines.map((line, l) => (
                <Fragment key={l}>
                  {l > 0 && ' '}
                  <span className={styles.line}>
                    {line.split(/\s+/).map((word, w) => (
                      <Fragment key={w}>
                        {w > 0 && ' '}
                        <span
                          className={styles.word}
                          data-word=""
                          style={{ '--i': index++ } as CSSProperties}
                        >
                          {word}
                        </span>
                      </Fragment>
                    ))}
                  </span>
                </Fragment>
              ))}
            </h1>
          </div>
          <div className={styles.actions}>
            {actions.map((action, i) => (
              <ButtonLink
                key={action.href}
                href={action.href}
                lang={action.lang}
                size="large"
                variant={i === 0 ? 'solid' : 'text'}
              >
                {action.label}
              </ButtonLink>
            ))}
          </div>
        </div>
        <Stair
          bare
          preset="violet"
          polygonRef={heroStair}
          className={styles.heroStair}
        />
      </section>

      {intro && (
        <Shape
          as="section"
          band
          inset
          insetAnchor={heroStair}
          auto="bl"
          nocap
          ambient="lively"
          riseDelay={520}
          className={styles.introBand}
        >
          <div className={`${styles.wrap} ${styles.introWrap}`}>
            <Notch corner="tr" drift={120}>
              <p className={styles.introText} lang={intro.lang}>
                {intro.text}
              </p>
            </Notch>
          </div>
        </Shape>
      )}
    </>
  )
}
