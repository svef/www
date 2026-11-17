import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { createRng } from '@/lib/shape/random'
import { pageHeadPreset } from '@/lib/shape/presets'
import { Shape, type ShapeColor } from './Shape'
import { Notch } from './Notch'
import s from './Shape.stories.module.scss'

const meta: Meta<typeof Shape> = {
  title: 'Brand/Shape',
  component: Shape,
  parameters: { layout: 'fullscreen' },
  // the page canvas, without the default story padding
  decorators: [
    (Story) => (
      <div className={s.page} style={{ margin: -32 }}>
        <Story />
      </div>
    ),
  ],
}
export default meta

type Story = StoryObj<typeof Shape>

const COLOURS: ShapeColor[] = ['violet', 'red', 'pink', 'yellow', 'white']

/** Each colour, with a title in a top-left notch and copy on the colour in `--shape-on`. */
export const Colours: Story = {
  render: () => (
    <div className={s.grid}>
      {COLOURS.map((color, i) => (
        <Shape key={color} color={color} auto="br" seed={i + 1} className={s.colourBox}>
          <Notch corner="tl">
            <h2>{color}</h2>
          </Notch>
          <p>Texti á litnum notar --shape-on.</p>
        </Shape>
      ))}
    </div>
  ),
}

/** Every `data-auto` combination the export uses (markup, the page-head roll and the gallery thumbs). */
const COMBOS = [
  'tl',
  'tr',
  'br',
  'bl',
  'tr,br',
  'br,tr',
  'bl,br',
  'br,bl',
  'tr,bl',
  'tl,br',
  'tr,br,bl',
  'tr,bl,br',
  'tl,tr,br',
]

export const AutoCorners: Story = {
  render: () => (
    <div className={s.grid}>
      {COMBOS.map((auto, i) => (
        <figure key={auto} style={{ margin: 0 }}>
          <Shape auto={auto} seed={100 + i} color={COLOURS[i % 4]} className={s.box} />
          <figcaption className={s.caption}>auto=&quot;{auto}&quot;</figcaption>
        </figure>
      ))}
    </div>
  ),
}

/** The same corners at the large size the page heads roll seven times in ten. */
export const AutoCornersLarge: Story = {
  render: () => (
    <div className={s.grid}>
      {COMBOS.map((auto, i) => (
        <figure key={auto} style={{ margin: 0 }}>
          <Shape
            auto={auto}
            autoSize="lg"
            seed={100 + i}
            color={COLOURS[i % 4]}
            className={s.box}
          />
          <figcaption className={s.caption}>
            auto=&quot;{auto}&quot; autoSize=&quot;lg&quot;
          </figcaption>
        </figure>
      ))}
    </div>
  ),
}

/**
 * A page head (`.phead`), rolled the way the export's router rolls every one: random
 * corners and size, a lively drift, and extra reach on the title's notch. Change the
 * seed to roll another.
 */
export const PageHead: StoryObj<{ seed: number }> = {
  args: { seed: 3 },
  render: ({ seed }) => {
    const p = pageHeadPreset(createRng(seed))
    return (
      <Shape
        as="header"
        band
        seed={seed}
        auto={p.auto}
        autoSize={p.autoSize}
        ambient={p.ambient}
        nocap={p.nocap}
        className={s.phead}
      >
        <div className={s.wrap}>
          <Notch corner="tl" drift={p.titleDrift} className={s.title}>
            <h1>Viðburðir</h1>
          </Notch>
          <div className={s.body}>
            <p className={s.lede}>
              Fyrirlestrar, vinnustofur og hátíðir fyrir fólkið í vefiðnaðinum. Félagar
              komast frítt á alla viðburði nema vefverðlaunin.
            </p>
          </div>
        </div>
      </Shape>
    )
  },
}

/** A page head as the export's markup writes it, before the router re-rolls it: `tr,br`, calm drift. */
export const PageHeadAsMarkup: Story = {
  render: () => (
    <Shape as="header" band auto="tr,br" ambient seed={7} className={s.phead}>
      <div className={s.wrap}>
        <Notch corner="tl" className={s.title}>
          <h1>Fréttir</h1>
        </Notch>
        <div className={s.body}>
          <p className={s.lede}>
            Allt sem við tilkynnum birtist hér fyrst — samfélagsmiðlar vísa alltaf hingað.
          </p>
        </div>
      </div>
    </Shape>
  ),
}

/**
 * The home hero: one decorative top-right corner, a lively drift, and a title notch that
 * breathes up to 140px wider as it drifts. In the export the hero's own colour layer is
 * hidden behind the violet staircase (`Stair`, #124); here it is shown so the shape can be seen.
 * The headline has its own word animation, so it opts out of the reveal.
 */
export const Hero: Story = {
  render: () => (
    <Shape
      as="section"
      band
      auto="tr"
      ambient="lively"
      breathe={140}
      riseDelay={120}
      seed={11}
      className={s.hero}
    >
      <div className={s.wrap}>
        <Notch corner="tl" className={s.heroTitle}>
          <h1 data-shape-still="">
            <span className={s.line}>Félag fólksins</span>{' '}
            <span className={s.line}>sem býr til</span>{' '}
            <span className={s.line}>vefinn á Íslandi.</span>
          </h1>
        </Notch>
        <div className={s.actions}>
          <a className={s.button} href="#skraning">
            Gerast félagi
          </a>
          <a className={s.button} href="#vidburdir">
            Sjá viðburði
          </a>
        </div>
      </div>
    </Shape>
  ),
}

const EVENTS = [
  {
    color: 'red',
    cat: 'tl',
    foot: 'bl',
    title: 'Klúðurkvöld: haustútgáfa',
    date: '12. nóv 2026',
    where: '20:00 — 22:30 · Iðnó',
  },
  {
    color: 'violet',
    cat: 'tr',
    foot: 'bl',
    title: 'Aðgengi í verki: vinnustofa',
    date: '26. nóv 2026',
    where: '13:00 — 16:00 · Gróska',
  },
  {
    color: 'pink',
    cat: 'tl',
    foot: 'br',
    title: 'Morgunkaffi: hönnunarkerfi í raunheimum',
    date: '14. jan 2027',
    where: '08:30 — 10:00 · Bíó Paradís',
  },
  {
    color: 'yellow',
    cat: 'tr',
    foot: 'br',
    title: 'Framendakvöld: CSS í dag',
    date: '11. feb 2027',
    where: '17:00 — 19:30 · Hafnarhúsið',
  },
] as const

/**
 * Event posters: the category in a top notch, the date in a bottom one, and no
 * decorative corners. Hover (or tab to) a card and its notches step open.
 */
export const PosterCards: Story = {
  render: () => (
    <div className={s.wrap} style={{ paddingBlock: 64 }}>
      <ul className={s.cards}>
        {EVENTS.map((e, i) => (
          <Shape
            key={e.title}
            as="li"
            color={e.color}
            morphOnHover
            seed={200 + i}
            className={s.poster}
          >
            <Notch
              as="a"
              corner={e.cat}
              href="#"
              className={`${s.cat} ${e.cat === 'tr' ? s.right : ''}`}
            >
              {e.title}
            </Notch>
            <Notch
              corner={e.foot}
              className={`${s.foot} ${e.foot === 'br' ? s.right : ''}`}
            >
              <h3>
                <time dateTime="2026-11-12">{e.date}</time>
              </h3>
              <p className={s.blurb}>{e.where}</p>
            </Notch>
          </Shape>
        ))}
      </ul>
    </div>
  ),
}

const NEWS = [
  {
    color: 'violet',
    auto: 'tr',
    date: 'tl',
    foot: 'bl',
    title: 'Ný stjórn er tekin við',
    ex: 'Ný stjórn SVEF tók við störfum á aðalfundi samtakanna þann 22. maí.',
  },
  {
    color: 'yellow',
    auto: 'tl,br',
    date: 'tr',
    foot: 'bl',
    title: 'Innsendingar opna í ágúst',
    ex: 'Flokkarnir verða 13 talsins og nýr flokkur bætist við: Nýliði ársins.',
  },
  {
    color: 'red',
    auto: 'tl',
    date: 'tr',
    foot: 'br',
    title: 'Klúðurkvöld í mars: það sem við lærðum',
    ex: 'Sjö sögur af mistökum og ein mjög dýr lexía um gagnaflutninga.',
  },
] as const

/** News cards: a whole-card link with the date in a top notch, plus decorative corners. */
export const NewsPosters: Story = {
  render: () => (
    <div className={s.wrap} style={{ paddingBlock: 64 }}>
      <div className={s.news}>
        {NEWS.map((n, i) => (
          <Shape
            key={n.title}
            as="a"
            href="#"
            color={n.color}
            auto={n.auto}
            seed={300 + i}
            className={s.poster}
          >
            <Notch
              as="time"
              corner={n.date}
              dateTime="2026-05-22"
              className={`${s.date} ${n.date === 'tr' ? s.right : ''}`}
            >
              22. maí 2026
            </Notch>
            <Notch
              corner={n.foot}
              className={`${s.foot} ${n.foot === 'br' ? s.right : ''}`}
            >
              <h2>{n.title}</h2>
              <span className={s.blurb} style={{ display: 'block' }}>
                {n.ex}
              </span>
              <span className={s.read}>Lesa fréttina</span>
            </Notch>
          </Shape>
        ))}
      </div>
    </div>
  ),
}

/** White bars hug the bottom-right notch's inner corner (else the top-right); the mark sits in the bottom-left. */
export const BarsAndMark: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 64, paddingBlock: 64 }}>
      <Shape as="section" band auto="tr,br,bl" bars={1} mark seed={41} className={s.band}>
        <div className={s.wrap}>
          <Notch corner="tl" className={s.inline}>
            <h2>Bars and the mark</h2>
          </Notch>
        </div>
      </Shape>
      <Shape
        as="section"
        band
        nocap
        auto="tr,bl"
        bars={2}
        mark
        color="yellow"
        seed={42}
        className={s.band}
      >
        <div className={s.wrap}>
          <Notch corner="tl" className={s.inline}>
            <h2>Top-right fallback</h2>
          </Notch>
        </div>
      </Shape>
    </div>
  ),
}

/**
 * The footer band: two corners on wide screens, one (`autoMobile`) at 900px and below,
 * and a notch whose content only counts from 640px up.
 */
export const MobileCorners: Story = {
  render: () => (
    <Shape
      as="section"
      band
      auto="tr,bl"
      autoMobile="tr"
      ambient="lively"
      seed={51}
      className={s.band}
    >
      <div className={s.wrap}>
        <Notch corner="tl" minViewport={640} className={s.inline}>
          <h2>svef@svef.is</h2>
        </Notch>
        <p style={{ maxWidth: '40ch' }}>Breiðir skjáir: tr og bl. Símar: aðeins tr.</p>
      </div>
    </Shape>
  ),
}

/**
 * `motion={false}` draws exactly what `prefers-reduced-motion: reduce` gets: the resting
 * shape at once, content visible, no entrance, no drift, no hover morph.
 */
export const ReducedMotion: Story = {
  render: () => (
    <div className={s.wrap} style={{ display: 'grid', gap: 40, paddingBlock: 64 }}>
      <Shape
        as="header"
        band
        auto="tr,br"
        ambient="lively"
        motion={false}
        seed={7}
        className={s.phead}
      >
        <div className={s.wrap}>
          <Notch corner="tl" className={s.title}>
            <h1>Kyrrt</h1>
          </Notch>
          <div className={s.body}>
            <p className={s.lede}>Engin hreyfing: lögunin er teiknuð í hvíldarstöðu.</p>
          </div>
        </div>
      </Shape>
      <ul className={s.cards}>
        {EVENTS.slice(0, 3).map((e, i) => (
          <Shape
            key={e.title}
            as="li"
            color={e.color}
            morphOnHover
            motion={false}
            seed={200 + i}
            className={s.poster}
          >
            <Notch
              as="a"
              corner={e.cat}
              href="#"
              className={`${s.cat} ${e.cat === 'tr' ? s.right : ''}`}
            >
              {e.title}
            </Notch>
            <Notch
              corner={e.foot}
              className={`${s.foot} ${e.foot === 'br' ? s.right : ''}`}
            >
              <h3>{e.date}</h3>
              <p className={s.blurb}>{e.where}</p>
            </Notch>
          </Shape>
        ))}
      </ul>
    </div>
  ),
}
