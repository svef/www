import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { HomeOpening } from './HomeOpening'

const meta: Meta<typeof HomeOpening> = {
  title: 'Pages/HomeOpening',
  component: HomeOpening,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div style={{ margin: -32 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    locale: 'is',
    lines: ['Félag fólksins', 'sem býr til', 'vefinn á Íslandi.'],
    actions: [
      { label: 'Gerast félagi', href: '/is/skraning' },
      { label: 'Sjá viðburði', href: '/is/vidburdir' },
    ],
    intro: { text: 'Við erum fólkið á bak við vefinn: hönnuðir, forritarar, textahöfundar og allir hinir.' },
  },
}
export default meta

type Story = StoryObj<typeof HomeOpening>

export const Default: Story = {}
/** A hidden page's button is left out by the page, leaving one. */
export const OneButton: Story = {
  args: { actions: [{ label: 'Sjá viðburði', href: '/is/vidburdir' }] },
}
export const English: Story = {
  args: {
    locale: 'en',
    lines: ['The people who', 'make the web', 'in Iceland.'],
    actions: [{ label: 'See events', href: '/en/events' }],
    intro: { text: 'We are the people behind the web.' },
  },
}
/** The headline, intro and buttons in Icelandic on the English site (no translation yet). */
export const FallbackLanguage: Story = {
  args: { locale: 'en', titleLang: 'is', intro: { text: 'Við erum fólkið á bak við vefinn.', lang: 'is' } },
}
/**
 * Long words and a long headline; useful with the browser's reduced-motion setting on, where
 * the settled headline, a resting stair and a full-width band are shown at once.
 */
export const LongHeadline: Story = {
  args: { lines: ['Vefverðlaunahátíðarundirbúningsnefndin', 'hittist í hverjum mánuði', 'til að skipuleggja allt.'] },
}
