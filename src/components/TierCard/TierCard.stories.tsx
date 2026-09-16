import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { TierCard } from './TierCard'

const meta: Meta<typeof TierCard> = {
  title: 'Content/TierCard',
  component: TierCard,
  args: {
    name: 'Einstaklingsaðild',
    price: '23.900 kr.',
    priceNote: 'á ári',
    benefits: [
      'Frítt á alla viðburði (nema vefverðlaunin)',
      '20% afsláttur af miðum á Íslensku vefverðlaunin',
    ],
    ctaLabel: 'Ganga í SVEF',
    ctaHref: '/hafa-samband',
  },
}
export default meta

type Story = StoryObj<typeof TierCard>

export const Default: Story = {}
export const Featured: Story = { args: { featured: true } }
