import { useRef } from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Shape } from '@/components/Shape/Shape'
import { Notch } from '@/components/Shape/Notch'
import { Stair, StairText } from './Stair'
import s from './Stair.stories.module.scss'

const meta: Meta<typeof Stair> = {
  title: 'Brand/Stair',
  component: Stair,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className={s.page} style={{ margin: -32 }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    preset: { control: 'inline-radio', options: ['pink', 'yellow', 'red', 'violet'] },
  },
}
export default meta

type Story = StoryObj<typeof Stair>

/**
 * The polygon on its own, one box per staircase. Each steps one edge on its own beat
 * (every 5s, only while on screen). Resize the window: the shape is in percent.
 */
export const StairAlone: Story = {
  render: () => (
    <div className={s.wrap}>
      {(['pink', 'yellow', 'red'] as const).map((preset, i) => (
        <Stair key={preset} preset={preset} seed={i + 1} className={s.alone} />
      ))}
      <Stair preset="pink" flip seed={9} className={s.alone} />
    </div>
  ),
}

/**
 * Under a section heading: the heading and button hold back until a quarter of the head
 * has scrolled into view, then rise (the export's `pre` class), and the stair starts
 * stepping. Scroll down to see it.
 */
export const UnderSectionHead: Story = {
  render: () => (
    <div className={s.wrap}>
      <p className={s.filler}>Skrunaðu niður.</p>
      <Stair preset="pink" seed={3} className={s.bleed} aria-labelledby="h-events">
        <StairText>
          <h2 id="h-events" className={s.h2}>
            Viðburðir
          </h2>
          <a className={s.button} href="#vidburdir">
            Sjá alla viðburði
          </a>
        </StairText>
      </Stair>
      <Stair preset="yellow" seed={5} className={s.bleed}>
        <StairText>
          <h2 className={s.h2}>Fréttir</h2>
        </StairText>
      </Stair>
      <p className={s.filler}>…</p>
    </div>
  ),
}

/**
 * A full-width band with the inset: scroll past it and the colour pulls in 24px from
 * each edge (12px under 700px wide), eased so a fast flick still glides. The band's
 * content is not inset, only the colour. Under reduced motion there is no inset.
 */
export const BandInset: Story = {
  render: () => (
    <>
      <p className={s.filler}>Skrunaðu niður.</p>
      <Shape
        as="section"
        band
        inset
        auto="br"
        seed={21}
        color="yellow"
        className={s.band}
      >
        <div className={s.wrap}>
          <Notch corner="tl">
            <h2 className={s.h2}>Band</h2>
          </Notch>
        </div>
      </Shape>
      <Stair preset="red" className={s.alone} seed={2} />
      <Shape
        as="section"
        band
        inset
        auto="tr"
        seed={22}
        color="violet"
        className={s.band}
      >
        <div className={s.wrap}>
          <Notch corner="tl">
            <h2 className={s.h2}>Annað band</h2>
          </Notch>
        </div>
      </Shape>
      <p className={s.filler}>…</p>
    </>
  ),
}

function HomeHeroAndIntro() {
  // The export's intro band follows the hero stair: both start to pull in together.
  const heroStair = useRef<HTMLDivElement>(null)
  return (
    <>
      <section className={s.hero}>
        <div className={s.wrap}>
          <h1>
            <span className={s.line}>Félag fólksins</span>{' '}
            <span className={s.line}>sem býr til</span>{' '}
            <span className={s.line}>vefinn á Íslandi.</span>
          </h1>
        </div>
        <Stair
          bare
          preset="violet"
          seed={11}
          className={s.heroStair}
          polygonRef={heroStair}
        />
      </section>
      <Shape
        as="section"
        band
        inset
        insetAnchor={heroStair}
        auto="bl"
        nocap
        ambient="lively"
        seed={12}
        className={s.introBand}
      >
        <div className={`${s.wrap} ${s.introWrap}`}>
          <Notch corner="tr" drift={120}>
            <p className={s.introText}>
              Við erum fólkið á bak við vefinn á Íslandi. Við hittumst á viðburðum, veitum
              Íslensku vefverðlaunin og lærum hvert af öðru.
            </p>
          </Notch>
        </div>
      </Shape>
    </>
  )
}

/**
 * The export's home page opening, for comparing: a violet staircase rising from the
 * bottom of the hero, and the violet intro band below it. The hero's own colour layer
 * is not rendered here. How the page chains the two and times the stair to the loader
 * is the home page's job (#129).
 */
export const HeroAndIntroBand: Story = {
  render: () => <HomeHeroAndIntro />,
}
