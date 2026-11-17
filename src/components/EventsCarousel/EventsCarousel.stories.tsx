import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { EventsCarousel } from './EventsCarousel'
import { EventPoster } from '../EventPoster/EventPoster'

const posters = (n: number) =>
  Array.from({ length: n }, (_, i) => (
    <EventPoster
      key={i}
      index={i}
      title={`Viðburður ${i + 1}`}
      href={`/is/vidburdir/e-${i + 1}`}
      date={`${i + 10}. nóv 2026`}
      dateTime={`2026-11-${i + 10}T20:00:00.000Z`}
      meta="20:00 — 22:30 · Iðnó"
    />
  ))

const meta: Meta<typeof EventsCarousel> = {
  title: 'Content/EventsCarousel',
  component: EventsCarousel,
  parameters: { layout: 'fullscreen' },
  args: { label: 'Næstu viðburðir', dotLabel: 'Viðburður {n}' },
}
export default meta

type Story = StoryObj<typeof EventsCarousel>

export const Six: Story = { render: (args) => <EventsCarousel {...args}>{posters(6)}</EventsCarousel> }
/** Everything fits: one dot range, nothing to scroll. */
export const Two: Story = { render: (args) => <EventsCarousel {...args}>{posters(2)}</EventsCarousel> }
export const One: Story = { render: (args) => <EventsCarousel {...args}>{posters(1)}</EventsCarousel> }
export const English: Story = {
  args: { label: 'Upcoming events', dotLabel: 'Event {n}' },
  render: (args) => <EventsCarousel {...args}>{posters(4)}</EventsCarousel>,
}
