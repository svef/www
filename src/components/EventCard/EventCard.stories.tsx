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
export const NestedHeadingLevel: Story = { args: { headingLevel: 4 } }

// "Liðnir viðburðir" on /vidburdir: the card carries its own links, so it is a
// plain element with the event link on the title and the album link beneath.
export const PastWithPhotos: Story = {
  args: {
    title: 'Klúðurkvöld',
    dateLabel: '13. mar 2026',
    dateTime: '2026-03-13T12:00:00.000Z',
    location: 'Grandi 101 — Sjö sögur af mistökum, ein af þeim mjög dýr.',
    href: '/vidburdir/kludurkvold-mars-2026',
    secondary: { href: '/myndir', label: 'Myndir frá viðburði' },
  },
}

// The same card for an event with no album — no second link to offer.
export const PastWithoutPhotos: Story = {
  args: {
    title: 'Vinnustofa: Hönnunarkerfi frá grunni',
    dateLabel: '5. sep 2026',
    dateTime: '2026-09-05T13:00:00.000Z',
    location: 'Kvosin — Hálfsdagsvinnustofa, 20 sæti.',
    href: '/vidburdir/vinnustofa-honnunarkerfi-fra-grunni',
  },
}
