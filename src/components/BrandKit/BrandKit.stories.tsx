import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { BrandKit } from './BrandKit'
import { is } from '@/lib/i18n/is'
import { en } from '@/lib/i18n/en'

const meta: Meta<typeof BrandKit> = {
  title: 'Content/BrandKit',
  component: BrandKit,
  parameters: { layout: 'fullscreen' },
  args: { copy: is.about.brand },
}
export default meta

type Story = StoryObj<typeof BrandKit>

export const Default: Story = {}
export const English: Story = { args: { copy: en.about.brand } }
/** Downloads an editor attached to the About page, one with no known size. */
export const WithFiles: Story = {
  args: {
    files: [
      { label: 'Merkjahandbók (PDF)', url: '/files/handbook.pdf', size: '2,4 MB' },
      { label: 'Merki í lit', url: '/files/logo.zip' },
    ],
  },
}
/** Pressing a swatch copies its code; the result is shown on it and announced. */
export const CopiedColour: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: /Electric violet/ }))
  },
}
