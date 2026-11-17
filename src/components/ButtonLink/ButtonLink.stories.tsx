import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { ButtonLink } from './ButtonLink'

const meta: Meta<typeof ButtonLink> = {
  title: 'Controls/ButtonLink',
  component: ButtonLink,
  args: { href: '/is/vidburdir', children: 'Skoða viðburði' },
}
export default meta

type Story = StoryObj<typeof ButtonLink>

export const Solid: Story = {}
export const Text: Story = { args: { variant: 'text', children: 'Allir viðburðir' } }
export const Large: Story = { args: { size: 'large' } }
export const LargeText: Story = { args: { size: 'large', variant: 'text' } }
/** A label in another language than the page's. */
export const OtherLanguage: Story = { args: { children: 'Join SVEF', lang: 'en' } }
export const LongLabel: Story = {
  args: { children: 'Skoða alla viðburði og skrá þig á þá sem þér líst best á' },
}
