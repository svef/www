import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { BlockMotif } from './BlockMotif'

const meta: Meta<typeof BlockMotif> = {
  title: 'Brand/BlockMotif',
  component: BlockMotif,
}
export default meta

type Story = StoryObj<typeof BlockMotif>

export const Violet: Story = { args: { tone: 'violet' } }
export const Mixed: Story = { args: { tone: 'mixed' } }
