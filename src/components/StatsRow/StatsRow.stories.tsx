import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { StatsRow } from './StatsRow'

const meta: Meta<typeof StatsRow> = {
  title: 'Content/StatsRow',
  component: StatsRow,
  parameters: { layout: 'padded' },
  args: {
    items: [
      { value: '2008', label: 'Stofnað' },
      { value: '140', label: 'Félagar' },
      { value: '22', label: 'Viðburðir á ári' },
    ],
  },
}
export default meta

type Story = StoryObj<typeof StatsRow>

export const Default: Story = {}
/** The colours cycle pink, yellow, violet, so a fourth figure starts again. */
export const FourFigures: Story = {
  args: {
    items: [
      { value: '2008', label: 'Stofnað' },
      { value: '140', label: 'Félagar' },
      { value: '22', label: 'Viðburðir á ári' },
      { value: '13', label: 'Flokkar í Vefverðlaununum' },
    ],
  },
}
/** English site, label not translated yet. */
export const FallbackLabel: Story = {
  args: { items: [{ value: '140', label: 'Félagar', labelLang: 'is' }] },
}
export const Empty: Story = { args: { items: [] } }
