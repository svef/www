import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { TranslationNote } from './TranslationNote'

const meta: Meta<typeof TranslationNote> = {
  title: 'Content/TranslationNote',
  component: TranslationNote,
  args: {
    pageLocale: 'en',
    contentLocale: 'is',
  },
}
export default meta

type Story = StoryObj<typeof TranslationNote>

export const NotTranslatedYet: Story = {}
/** Pages that are Icelandic-only by editorial decision, not by backlog. */
export const IcelandicByDesign: Story = {
  args: { reason: 'icelandic-by-design' },
}
export const Translated: Story = { args: { contentLocale: 'en' } }
