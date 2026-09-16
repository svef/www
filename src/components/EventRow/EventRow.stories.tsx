import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { EventRow } from './EventRow'

const meta: Meta<typeof EventRow> = {
  title: 'Content/EventRow',
  component: EventRow,
  args: {
    day: '09',
    month: 'okt',
    dateTime: '2026-10-09',
    dateLabel: '9. október 2026',
    title: 'Klúðurkvöld',
    description: 'Grandi 101 · 20:00 — afslappað kvöld um að læra af mistökum.',
    href: '/vidburdir',
    ctaLabel: 'Nánar',
  },
}
export default meta

type Story = StoryObj<typeof EventRow>

export const Default: Story = {}
export const WithoutDescription: Story = { args: { description: undefined } }
