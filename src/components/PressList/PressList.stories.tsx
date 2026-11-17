import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { PressList } from './PressList'

const meta: Meta<typeof PressList> = {
  title: 'Content/PressList',
  component: PressList,
  parameters: { layout: 'padded' },
  args: {
    lang: 'is',
    items: [
      { title: 'Vefverðlaunin afhent í Silfurbergi', outlet: 'Vísir', url: 'https://example.com/a', date: { iso: '2025-03-01T12:00:00.000Z', label: 'Mars 2025' } },
      { title: 'Ný stjórn tekin við hjá SVEF', outlet: 'mbl.is', url: 'https://example.com/b', date: { iso: '2025-02-01T12:00:00.000Z', label: 'Febrúar 2025' } },
      { title: 'Aðgengi á vefnum: hvar stöndum við?', outlet: 'RÚV', url: 'https://example.com/c' },
      { title: 'Vefiðnaðurinn kemur saman', outlet: 'Viðskiptablaðið', url: 'https://example.com/d', date: { iso: '2024-11-01T12:00:00.000Z', label: 'Nóvember 2024' } },
      { title: 'Fimmta fréttin fær rauðan lit', outlet: 'Kjarninn', url: 'https://example.com/e' },
    ],
  },
}
export default meta

type Story = StoryObj<typeof PressList>

/** Five rows: pink, yellow, violet, red, then the cycle starts again. */
export const Default: Story = {}
/** A mention with no link is listed as text, not as a link that goes nowhere. */
export const WithoutLink: Story = {
  args: { items: [{ title: 'Umfjöllun sem er ekki lengur á netinu', outlet: 'Fréttablaðið', url: null }] },
}
export const LongHeadline: Story = {
  args: {
    items: [
      {
        title:
          'Samtök vefiðnaðarins halda árlega vefverðlaunahátíð þar sem bestu vefir ársins eru verðlaunaðir í þrettán flokkum og aðgengi fær sérstaka viðurkenningu',
        outlet: 'Morgunblaðið',
        url: 'https://example.com/long',
        date: { iso: '2025-03-01T12:00:00.000Z', label: 'Mars 2025' },
      },
    ],
  },
}
export const Empty: Story = { args: { items: [] } }
