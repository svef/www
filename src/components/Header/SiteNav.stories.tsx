import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { SiteNav } from './SiteNav'
import { is } from '@/lib/i18n/is'
import { en } from '@/lib/i18n/en'

/**
 * The menu is a width-dependent component: above 900px it is a row, below it a
 * disclosure. Storybook's viewport addon is how you see the second state — the
 * `Mobile` stories below set it, and the toggle only appears there.
 */
const meta: Meta<typeof SiteNav> = {
  title: 'Chrome/SiteNav',
  component: SiteNav,
  parameters: {
    layout: 'fullscreen',
    nextjs: { appDirectory: true, navigation: { pathname: '/is' } },
    viewport: {
      options: {
        phone: { name: 'Phone 390', styles: { width: '390px', height: '844px' } },
      },
    },
  },
  args: {
    items: [
      { href: '/vefverdlaunin', label: is.nav.awards },
      { href: '/vidburdir', label: is.nav.events },
      { href: '/frettir', label: is.nav.news },
      { href: '/um-svef', label: is.nav.about },
      { href: '/skraning', label: is.nav.membership },
    ],
    contactHref: '/hafa-samband',
    contactLabel: is.nav.contact,
    menuLabel: is.nav.menu,
    navLabel: is.nav.primary,
    locale: 'is',
  },
  decorators: [
    (Story) => (
      // `SiteNav` is `display: contents` by design — it lays itself out in the
      // header's flex row — so it needs a stand-in header to look right.
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-8)',
          flexWrap: 'wrap',
          padding: 'var(--space-4) var(--space-6)',
          background: 'var(--bg)',
        }}
      >
        <Story />
      </header>
    ),
  ],
}
export default meta

type Story = StoryObj<typeof SiteNav>

export const Desktop: Story = {}

/** The current page carries the design's violet underline. */
export const CurrentPage: Story = {
  parameters: { nextjs: { navigation: { pathname: '/is/frettir' } } },
}

export const English: Story = {
  args: {
    items: [
      { href: '/en/vefverdlaunin', label: en.nav.awards },
      { href: '/en/vidburdir', label: en.nav.events },
      { href: '/en/frettir', label: en.nav.news },
      { href: '/en/um-svef', label: en.nav.about },
      { href: '/en/skraning', label: en.nav.membership },
    ],
    contactHref: '/en/hafa-samband',
    contactLabel: en.nav.contact,
    menuLabel: en.nav.menu,
    navLabel: en.nav.primary,
    locale: 'en',
  },
}

/** Collapsed: only the toggle shows, and the links are out of the tab ring. */
export const Mobile: Story = {
  globals: { viewport: { value: 'phone', isRotated: false } },
}

/** The same width with the menu open: full-width rows, 44px tall. */
export const MobileOpen: Story = {
  globals: { viewport: { value: 'phone', isRotated: false } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: is.nav.menu }))
  },
}
