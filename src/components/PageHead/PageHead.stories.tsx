import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { PageHead } from './PageHead'

const meta: Meta<typeof PageHead> = {
  title: 'Layout/PageHead',
  component: PageHead,
  parameters: { layout: 'fullscreen' },
  args: { locale: 'is', title: 'Fréttir' },
}
export default meta

type Story = StoryObj<typeof PageHead>

/** An index page: the title, a standfirst at the foot, and the page's sticker. */
export const Index: Story = {
  args: {
    lede: 'Allt sem við tilkynnum birtist hér fyrst — samfélagsmiðlar vísa alltaf hingað.',
    stickers: 'frettir',
  },
}

/** A detail page: crumb back to the index, the date as an eyebrow, a sentence for a title. */
export const Article: Story = {
  args: {
    long: true,
    title: 'Vefverðlaunin færast í Silfurberg',
    crumb: { href: '/is/frettir', label: 'Til baka', ariaLabel: 'Til baka í fréttir' },
    eyebrow: <time dateTime="2026-01-15T12:00:00.000Z">15. janúar 2026</time>,
  },
}

/** Another seed rolls another set of corners. */
export const AnotherRoll: Story = { args: { ...Index.args, seed: 'another' } }
