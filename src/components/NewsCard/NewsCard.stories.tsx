import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { NewsCard } from './NewsCard'
import { NewsGrid } from '../NewsGrid/NewsGrid'

const meta: Meta<typeof NewsCard> = {
  title: 'Content/NewsCard',
  component: NewsCard,
  args: {
    date: '22. maí 2026',
    dateTime: '2026-05-22T12:00:00.000Z',
    title: 'Ný stjórn tekin við',
    excerpt: 'Ný stjórn SVEF tók við á aðalfundi. Við kynnum hópinn og áherslur ársins.',
    href: '/frettir/ny-stjorn-tekin-vid',
    cta: 'Lesa fréttina',
  },
}
export default meta

type Story = StoryObj<typeof NewsCard>

export const Default: Story = {}
export const NestedHeadingLevel: Story = { args: { headingLevel: 3 } }
export const WithoutCallToAction: Story = { args: { cta: undefined } }
/** An article on the English site that has no English translation yet. */
export const FallbackLanguage: Story = {
  args: { titleLang: 'is', excerptLang: 'is' },
}
/** A translated headline whose summary has not been translated yet. */
export const PartiallyTranslated: Story = { args: { excerptLang: 'is' } }

/** The six looks, in order — what the news index cycles through. */
export const Looks: Story = {
  render: (args) => (
    <NewsGrid>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <NewsCard key={i} {...args} index={i} />
      ))}
    </NewsGrid>
  ),
}
