import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { CategoryGrid } from './CategoryGrid'

/** The 13 categories in the design export's order. */
const CATEGORIES = [
  'Vefur ársins',
  'Hönnun & viðmót',
  'Fyrirtækjavefur — lítið',
  'Fyrirtækjavefur — meðalstórt',
  'Fyrirtækjavefur — stórt',
  'Markaðsvefur',
  'Söluvefur',
  'Snjalllausn',
  'Vefkerfi',
  'App ársins',
  'Aðgengi',
  'Efnistök & texti',
  'Nýliði ársins',
].map((name) => ({ name }))

const meta: Meta<typeof CategoryGrid> = {
  title: 'Content/CategoryGrid',
  component: CategoryGrid,
  args: { categories: CATEGORIES },
}
export default meta

type Story = StoryObj<typeof CategoryGrid>

export const Default: Story = {}

/** On the English site, before the names have been translated. */
export const FallbackLanguage: Story = {
  args: { categories: CATEGORIES.map((c) => ({ ...c, lang: 'is' })) },
}

/** A board that has trimmed the list — the numbering follows the list, not the year. */
export const ShortList: Story = { args: { categories: CATEGORIES.slice(0, 4) } }
