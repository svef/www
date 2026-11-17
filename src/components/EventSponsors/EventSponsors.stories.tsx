import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { EventSponsors, type EventSponsor } from './EventSponsors'

const sponsor = (name: string, file: string, extra: Partial<EventSponsor> = {}): EventSponsor => ({
  name,
  logo: { url: `/dev-fixtures/sponsors/${file}`, width: null, height: null },
  url: 'https://example.com',
  label: null,
  labelLocale: 'is',
  ...extra,
})

const meta: Meta<typeof EventSponsors> = {
  title: 'Content/EventSponsors',
  component: EventSponsors,
  parameters: { layout: 'padded' },
  args: {
    title: 'Samstarfsaðilar',
    locale: 'is',
    sponsors: [
      sponsor('Kaldur', 'kaldur.svg'),
      sponsor('Norðurljós', 'nordurljos.svg'),
      sponsor('Hraunmolar', 'hraunmolar.png', { url: null }),
    ],
  },
}
export default meta

type Story = StoryObj<typeof EventSponsors>

export const Default: Story = {}
/** Neighbouring sponsors with the same label share one line above their logos. */
export const Labelled: Story = {
  args: {
    sponsors: [
      sponsor('Kaldur', 'kaldur.svg', { label: 'Drykkir í boði' }),
      sponsor('Norðurljós', 'nordurljos.svg', { label: 'Drykkir í boði' }),
      sponsor('Hraunmolar', 'hraunmolar.png', { label: 'Húsnæði í boði' }),
    ],
  },
}
/** The English site, with a label that has no English text yet. */
export const FallbackLabel: Story = {
  args: {
    locale: 'en',
    title: 'Partners',
    sponsors: [sponsor('Kaldur', 'kaldur.svg', { label: 'Drykkir í boði', labelLocale: 'is' })],
  },
}
export const Empty: Story = { args: { sponsors: [] } }
