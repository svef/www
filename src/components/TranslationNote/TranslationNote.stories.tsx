import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { TranslationNote } from './TranslationNote'

const meta: Meta<typeof TranslationNote> = {
  title: 'Content/TranslationNote',
  component: TranslationNote,
  args: {
    pageLocale: 'en',
    contentLocale: 'is',
    children: 'English copy is not available for this page yet — showing Icelandic.',
  },
}
export default meta

type Story = StoryObj<typeof TranslationNote>

export const Fallback: Story = {}
export const Translated: Story = { args: { contentLocale: 'en' } }
