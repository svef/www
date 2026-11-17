import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { EventPoster } from './EventPoster'
import { EventGrid } from './EventGrid'
import { EVENT_POSTER_LOOKS } from './looks'

const meta: Meta<typeof EventPoster> = {
  title: 'Content/EventPoster',
  component: EventPoster,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div style={{ width: 360 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    title: 'Klúðurkvöld',
    href: '/is/vidburdir/kludurkvold',
    date: '12. nóv 2026',
    dateTime: '2026-11-12T20:00:00.000Z',
    meta: '20:00 — 22:30 · Iðnó',
  },
}
export default meta

type Story = StoryObj<typeof EventPoster>

export const Default: Story = {}
export const NoMetaLine: Story = { args: { meta: null } }
export const LongTitle: Story = {
  args: {
    title: 'Aðgengi á vefnum í reynd: reynslusögur, mistök og það sem við lærðum á leiðinni',
    meta: '09:00 — 17:00 · Hörpu, Silfurberg, Reykjavík',
  },
}
/** An event whose title has no English translation yet, on the English site. */
export const FallbackLanguage: Story = { args: { titleLang: 'is', metaLang: 'is' } }
export const NestedHeading: Story = { args: { headingLevel: 4 } }

/** The six looks, in order — what the events index cycles through, then repeats. */
export const Looks: Story = {
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div style={{ width: 'min(1100px, 100%)', margin: '0 auto' }}>
        <Story />
      </div>
    ),
  ],
  render: (args) => (
    <EventGrid>
      {EVENT_POSTER_LOOKS.map((look, i) => (
        <EventPoster key={i} {...args} title={`Viðburður ${i + 1}`} index={i} />
      ))}
    </EventGrid>
  ),
}
