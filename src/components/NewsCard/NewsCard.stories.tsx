import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { NewsCard } from './NewsCard'

const meta: Meta<typeof NewsCard> = {
  title: 'Content/NewsCard',
  component: NewsCard,
  args: {
    date: '22. maí 2026',
    title: 'Ný stjórn tekin við',
    excerpt: 'Ný stjórn SVEF tók við á aðalfundi. Við kynnum hópinn og áherslur ársins.',
    href: '/frettir',
  },
}
export default meta

type Story = StoryObj<typeof NewsCard>

export const Default: Story = {}
export const NestedHeadingLevel: Story = { args: { headingLevel: 3 } }
