import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { SectionHead } from './SectionHead'

const meta: Meta<typeof SectionHead> = {
  title: 'Layout/SectionHead',
  component: SectionHead,
  parameters: { layout: 'padded' },
  args: { title: 'Fréttir' },
}
export default meta

type Story = StoryObj<typeof SectionHead>

export const Default: Story = {}
/** The brand kit's head: the title on the right. */
export const Right: Story = { args: { right: true, title: 'Vörumerki' } }
export const WithMarker: Story = {
  args: { children: <span>Aðeins á íslensku</span> },
}
export const LongTitle: Story = {
  args: { title: 'Samtök vefiðnaðarins á Íslandi og starfið sem unnið er allt árið um kring' },
}
