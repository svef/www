import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { GrowText } from './GrowText'

const meta: Meta<typeof GrowText> = {
  title: 'Controls/GrowText',
  component: GrowText,
  args: { children: 'Gerast félagi' },
  decorators: [
    (Story) => (
      <a href="#grow" style={{ color: 'inherit', padding: 12, display: 'inline-block' }}>
        <Story />
      </a>
    ),
  ],
}
export default meta

type Story = StoryObj<typeof GrowText>

/** Hover or focus the link: the label widens and nothing beside it moves. */
export const Default: Story = {}
export const Long: Story = { args: { children: 'Skoða alla viðburði ársins' } }
