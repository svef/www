import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { EventCard } from './EventCard'

const meta: Meta<typeof EventCard> = {
  title: 'Content/EventCard',
  component: EventCard,
  args: {
    title: 'Íslensku vefverðlaunin',
    dateLabel: '14. nóvember 2026',
    location: 'Harpa',
  },
}
export default meta

type Story = StoryObj<typeof EventCard>

export const Default: Story = {}
export const Featured: Story = { args: { featured: true } }
