import { describe, it, expect, vi, beforeEach } from 'vitest'
import { axe } from 'vitest-axe'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MantineProvider } from '@mantine/core'
import { SiteNav } from './SiteNav'
import { is } from '@/lib/i18n/is'

/**
 * `usePathname()` is the only thing `SiteNav` needs from the router, and both
 * of its answers matter: the internally rewritten `/is/...` that prerendering
 * and hydration see, and the visible `/...` after a client-side navigation.
 * `localePath` is supposed to reconcile them, so the tests below drive both.
 */
const pathname = vi.hoisted(() => ({ current: '/is' }))
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }))

const items = [
  { href: '/vefverdlaunin', label: is.nav.awards },
  { href: '/vidburdir', label: is.nav.events },
  { href: '/frettir', label: is.nav.news },
]

function renderNav(path = '/is') {
  pathname.current = path
  return render(
    <MantineProvider forceColorScheme="dark">
      <header>
        <SiteNav
          items={items}
          contactHref="/hafa-samband"
          contactLabel={is.nav.contact}
          menuLabel={is.nav.menu}
          navLabel={is.nav.primary}
          locale="is"
        >
          <button type="button">EN</button>
        </SiteNav>
      </header>
      <main>
        <button type="button">Annað</button>
      </main>
    </MantineProvider>,
  )
}

const toggle = () => screen.getByRole('button', { name: is.nav.menu })

beforeEach(() => {
  // jsdom has `matchMedia` only when asked; `SiteNav` subscribes to it while open.
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  )
})

describe('SiteNav', () => {
  it('renders one navigation holding every link, at any width', () => {
    renderNav()
    const nav = screen.getByRole('navigation', { name: is.nav.primary })
    expect(nav).toBeInTheDocument()
    for (const item of items) {
      expect(screen.getByRole('link', { name: item.label })).toHaveAttribute('href', item.href)
    }
    expect(screen.getByRole('link', { name: is.nav.contact })).toHaveAttribute(
      'href',
      '/hafa-samband',
    )
  })

  it('labels the toggle and starts collapsed', () => {
    renderNav()
    expect(toggle()).toHaveAttribute('aria-expanded', 'false')
    expect(toggle()).toHaveAttribute('aria-controls', 'site-menu')
    // `aria-controls` has to resolve to something, open or closed.
    expect(document.getElementById('site-menu')).toBeInTheDocument()
  })

  it('opens and closes on the toggle', async () => {
    const user = userEvent.setup()
    renderNav()
    await user.click(toggle())
    expect(toggle()).toHaveAttribute('aria-expanded', 'true')
    await user.click(toggle())
    expect(toggle()).toHaveAttribute('aria-expanded', 'false')
  })

  it('moves focus into the menu when it opens', async () => {
    const user = userEvent.setup()
    renderNav()
    await user.click(toggle())
    await waitFor(() =>
      expect(screen.getByRole('link', { name: items[0].label })).toHaveFocus(),
    )
  })

  it('keeps Tab inside the menu while it is open', async () => {
    const user = userEvent.setup()
    renderNav()
    await user.click(toggle())
    await waitFor(() =>
      expect(screen.getByRole('link', { name: items[0].label })).toHaveFocus(),
    )

    const panel = document.getElementById('site-menu')!
    const region = panel.parentElement!
    for (let i = 0; i < 8; i += 1) {
      await user.tab()
      expect(region.contains(document.activeElement), `Tab ${i + 1} escaped the menu`).toBe(
        true,
      )
    }
  })

  it('closes on Escape and returns focus to the toggle', async () => {
    const user = userEvent.setup()
    renderNav()
    await user.click(toggle())
    await waitFor(() =>
      expect(screen.getByRole('link', { name: items[0].label })).toHaveFocus(),
    )

    await user.keyboard('{Escape}')
    expect(toggle()).toHaveAttribute('aria-expanded', 'false')
    expect(toggle()).toHaveFocus()
  })

  it('closes when a click lands outside the header', async () => {
    const user = userEvent.setup()
    renderNav()
    await user.click(toggle())
    expect(toggle()).toHaveAttribute('aria-expanded', 'true')

    await user.click(screen.getByRole('button', { name: 'Annað' }))
    expect(toggle()).toHaveAttribute('aria-expanded', 'false')
  })

  it('marks the current page with aria-current', () => {
    renderNav('/is/frettir')
    expect(screen.getByRole('link', { name: is.nav.news })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('link', { name: is.nav.events })).not.toHaveAttribute('aria-current')
  })

  it('marks the contact link when the contact page is current', () => {
    renderNav('/hafa-samband')
    expect(screen.getByRole('link', { name: is.nav.contact })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('marks nothing on a page the nav does not list', () => {
    renderNav('/is/frettir/einhver-frett')
    expect(document.querySelectorAll('[aria-current]')).toHaveLength(0)
  })

  it('has no axe violations open or closed', async () => {
    const user = userEvent.setup()
    const { container } = renderNav()
    expect((await axe(container)).violations).toEqual([])
    await user.click(toggle())
    expect((await axe(container)).violations).toEqual([])
  })
})
