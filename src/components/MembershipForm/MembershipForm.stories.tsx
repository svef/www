import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { is } from '@/lib/i18n/is'
import { en } from '@/lib/i18n/en'
import { MembershipForm } from './MembershipForm'

const meta: Meta<typeof MembershipForm> = {
  title: 'Content/MembershipForm',
  component: MembershipForm,
  args: { labels: is.membership.form, contactEmail: 'svef@svef.is' },
}
export default meta

type Story = StoryObj<typeof MembershipForm>

export const Icelandic: Story = {}

export const English: Story = { args: { labels: en.membership.form } }
