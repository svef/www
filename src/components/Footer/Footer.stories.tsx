import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Footer } from './Footer'
import { is } from '@/lib/i18n/is'
import { en } from '@/lib/i18n/en'

const meta: Meta<typeof Footer> = {
  title: 'Chrome/Footer',
  component: Footer,
  parameters: { layout: 'fullscreen' },
  args: {
    blurb: is.footer.blurb,
    email: 'svef@svef.is',
    socials: [],
    year: 2026,
  },
}
export default meta

type Story = StoryObj<typeof Footer>

/**
 * How the footer looks today: the `site-settings` global carries no social
 * URLs, so the row is omitted rather than filled with links to nowhere.
 */
export const Default: Story = {}

/** With profiles filled in, in the order the design draws them. */
export const WithSocials: Story = {
  args: {
    socials: [
      { short: 'FB', name: 'Facebook', href: 'https://www.facebook.com/svef' },
      { short: 'IG', name: 'Instagram', href: 'https://www.instagram.com/svef' },
      { short: 'X', name: 'X', href: 'https://x.com/svef' },
      { short: 'LI', name: 'LinkedIn', href: 'https://www.linkedin.com/company/svef' },
    ],
  },
}

/** Only some networks set — the rest simply are not there. */
export const SomeSocials: Story = {
  args: {
    socials: [
      { short: 'FB', name: 'Facebook', href: 'https://www.facebook.com/svef' },
      { short: 'LI', name: 'LinkedIn', href: 'https://www.linkedin.com/company/svef' },
    ],
  },
}

export const English: Story = {
  args: { blurb: en.footer.blurb },
}
