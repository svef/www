import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Eyebrow } from './Eyebrow'

const meta: Meta<typeof Eyebrow> = {
  title: 'Primitives/Eyebrow',
  component: Eyebrow,
  args: { children: 'Samtök vefiðnaðarins · Síðan 2005' },
}
export default meta

export const Default: StoryObj<typeof Eyebrow> = {}
