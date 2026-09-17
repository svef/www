import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { WinnerCard } from './WinnerCard'

const meta: Meta<typeof WinnerCard> = {
  title: 'Content/WinnerCard',
  component: WinnerCard,
  args: {
    siteName: 'nafn.is',
    category: 'Vefur ársins',
    year: 2025,
    blurb: 'Framúrskarandi heildarupplifun, hraði og efnistök.',
    url: 'https://nafn.is',
    accent: 'pink',
  },
}
export default meta

type Story = StoryObj<typeof WinnerCard>

export const Default: Story = {}

/** The four accents, rotated across a grid the way a page uses them. */
export const Accents: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 26 }}>
      <WinnerCard {...args} accent="pink" siteName="nafn.is" />
      <WinnerCard {...args} accent="yellow" siteName="studio.is" />
      <WinnerCard {...args} accent="red" siteName="adgengi.is" />
      <WinnerCard {...args} accent="violet" siteName="appid.is" />
    </div>
  ),
}

/**
 * A winner brought in from the paper archive: a site and a category, no jury
 * note and no screenshot. This is what most of 2020–2024 will look like.
 */
export const HistoricalRow: Story = {
  args: { blurb: null, url: null, siteName: 'arid20.is', year: 2020, category: 'Aðgengi' },
}

/** No link recorded — the card is a static block rather than a dead link. */
export const WithoutLink: Story = { args: { url: null } }

/** On the English site, with a category that has not been translated yet. */
export const FallbackCategory: Story = { args: { categoryLang: 'is', blurbLang: 'is' } }

/** Nested one level deeper, e.g. under an extra heading on the home page. */
export const NestedHeadingLevel: Story = { args: { headingLevel: 4 } }
