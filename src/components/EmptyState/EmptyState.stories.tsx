import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { EmptyState } from './EmptyState'

const meta: Meta<typeof EmptyState> = {
  title: 'Content/EmptyState',
  component: EmptyState,
  args: {
    title: 'Engar fréttir enn',
    body: 'Hér birtast tilkynningar frá SVEF um leið og þær koma.',
  },
}
export default meta

type Story = StoryObj<typeof EmptyState>

export const Default: Story = {}
export const NestedHeadingLevel: Story = { args: { headingLevel: 3 } }
