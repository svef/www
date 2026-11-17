import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { GrowText } from '@/components/GrowText/GrowText'
import styles from './Foundations.module.scss'

const meta: Meta = {
  title: 'Foundations/Type & tokens',
  parameters: { layout: 'fullscreen' },
}
export default meta
type Story = StoryObj

const colours = [
  { name: 'violet', v: '--color-violet', on: '--on-violet' },
  { name: 'red', v: '--accent-red', on: '--on-red' },
  { name: 'pink', v: '--accent-pink', on: '--on-pink' },
  { name: 'yellow', v: '--accent-yellow', on: '--on-yellow' },
  { name: 'white', v: '--color-white', on: '--on-white' },
  { name: 'black', v: '--color-black', on: '--color-white' },
  { name: 'ink-2', v: '--ink-2', on: '--color-white' },
  { name: 'ink-3', v: '--ink-3', on: '--color-white' },
  { name: 'muted', v: '--muted', on: '--color-black' },
  { name: 'line', v: '--line', on: '--color-white' },
]

// export % -> token. Mirrors the comment table in tokens.scss.
const stretches: [string, number, string][] = [
  ['--stretch-min', 50, '62'],
  ['--stretch-intro', 55, '65.8'],
  ['--stretch-lede', 62, '71.12'],
  ['--stretch-body', 75, '81'],
  ['--stretch-loop-low', 78, '83.28'],
  ['--stretch-normal', 100, '100'],
  ['--stretch-loop-high', 112, '106'],
  ['--stretch-flip', 114, '107'],
  ['--stretch-button', 115, '107.5'],
  ['--stretch-cta', 118, '109'],
  ['--stretch-count', 120, '110'],
  ['--stretch-hover', 125, '112.5'],
  ['--stretch-crumb', 130, '115'],
  ['--stretch-button-hover', 135, '117.5'],
  ['--stretch-row', 140, '120'],
  ['--stretch-display', 150, '125'],
]

export const TypeAndTokens: Story = {
  render: () => (
    <div className={styles.page}>
      <section aria-labelledby="f-colour">
        <h2 id="f-colour" className="h2">Colour</h2>
        <ul className={styles.swatches}>
          {colours.map((c) => (
            <li
              key={c.name}
              className={styles.swatch}
              style={{ background: `var(${c.v})`, color: `var(${c.on})` }}
            >
              <strong>{c.name}</strong>
              <code>{c.v}</code>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="f-type">
        <h2 id="f-type" className="h2">Type scale</h2>
        <p className="eyebrow no-condense">Eyebrow — Overpass Mono labels stay mono</p>
        <h1 className={styles.hero}>Hero h1</h1>
        <h1 className={styles.phead}>Page heading h1</h1>
        <h2 className="h2">Section heading .h2</h2>
        <h3 className={styles.h3}>Card heading h3</h3>
        <p className="lede">A lede paragraph in the display face, semibold, at 46ch.</p>
        <p>
          Body copy is set in the display face at the condensed body stretch (81 percent in
          Archivo, 75 in the export), 18px on a 1.6 line.
        </p>
      </section>

      <section aria-labelledby="f-stretch">
        <h2 id="f-stretch" className="h2">Stretch tokens</h2>
        <ul className={styles.stretches}>
          {stretches.map(([token, from, to]) => (
            <li key={token}>
              <code>{token}</code>
              <span>
                {from} to {to}
              </span>
              <span className={styles.sample} style={{ fontStretch: `var(${token})` }}>
                Samtök vefiðnaðarins
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="f-hover">
        <h2 id="f-hover" className="h2">Hover-widen</h2>
        <p className="no-condense">Hover or focus each; the box is already as wide as the hovered text.</p>
        <div className={styles.row}>
          <a href="#x" className={`${styles.btn} btn-grow`}>
            <GrowText>Kaupa miða</GrowText>
          </a>
          <a href="#x" className={`${styles.link} more`}>
            <GrowText>Lesa meira</GrowText>
          </a>
          <a href="#x" className={`${styles.link} crumb`}>
            <GrowText>Til baka</GrowText>
          </a>
          <a href="#x" className={styles.link}>
            <GrowText>Nav link</GrowText>
          </a>
        </div>
      </section>
    </div>
  ),
}
