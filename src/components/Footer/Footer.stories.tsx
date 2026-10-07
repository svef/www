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
      { icon: 'facebook', name: 'Facebook', href: 'https://www.facebook.com/vefidnadurinn' },
      { icon: 'instagram', name: 'Instagram', href: 'https://www.instagram.com/_svef_/' },
      { icon: 'messenger', name: 'Messenger', href: 'https://m.me/vefidnadurinn' },
      { icon: 'linkedin', name: 'LinkedIn', href: 'https://www.linkedin.com/company/sveficeland/' },
    ],
  },
}

/** Only some networks set — the rest simply are not there. */
export const SomeSocials: Story = {
  args: {
    socials: [
      { icon: 'facebook', name: 'Facebook', href: 'https://www.facebook.com/vefidnadurinn' },
      { icon: 'linkedin', name: 'LinkedIn', href: 'https://www.linkedin.com/company/sveficeland/' },
    ],
  },
}

export const English: Story = {
  args: { blurb: en.footer.blurb },
}
