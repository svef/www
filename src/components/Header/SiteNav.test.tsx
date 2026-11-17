import type React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { axe } from 'vitest-axe'
import { render, screen, waitFor, within } from '@testing-library/react'
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
  { href: '/is/vidburdir', label: is.nav.events },
  { href: '/is/frettir', label: is.nav.news },
]

const withSubmenu = [
  {
    href: '/is/um-svef',
    label: is.nav.about,
    children: [
      { href: '/is/stjorn', label: 'Stjórn SVEF' },
      { href: '/is/log-svef', label: 'Lög SVEF' },
    ],
  },
]

/** Entries for pages switched off in `HIDDEN_PAGES`, mixed in by the filtering tests. */
const hiddenItems = [
  { href: '/is/vefverdlaunin', label: is.nav.awards },
  { href: '/is/skraning', label: is.nav.membership },
]

function markup(navItems: typeof items = items) {
  return (
    <MantineProvider forceColorScheme="dark">
      <header>
        <SiteNav
          items={navItems}
          menuLabel={is.nav.menu}
          closeLabel={is.close}
          email="svef@svef.is"
          submenuLabel="undirsíður"
          navLabel={is.nav.primary}
          locale="is"
        >
          <button type="button">EN</button>
        </SiteNav>
      </header>
      <main>
        <button type="button">Annað</button>
      </main>
    </MantineProvider>
  )
}

function renderNav(path = '/is') {
  pathname.current = path
  return render(markup())
}

/** A client-side navigation: `usePathname()` changes and the tree re-renders. */
function navigate(rerender: (ui: React.ReactElement) => void, path: string) {
  pathname.current = path
  rerender(markup())
}

/** The menu button: its text swaps to `Loka` while open, so it is found by what it controls. */
const toggle = () =>
  document.querySelector<HTMLButtonElement>('button[aria-controls="site-menu"]')!

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
  })

  it('labels the toggle and starts collapsed', () => {
    renderNav()
    expect(toggle()).toHaveAttribute('aria-expanded', 'false')
    expect(toggle()).toHaveAttribute('aria-controls', 'site-menu')
    // `aria-controls` has to resolve to something, open or closed.
    expect(document.getElementById('site-menu')).toBeInTheDocument()
  })

  it('swaps the toggle text between Valmynd and Loka', async () => {
    const user = userEvent.setup()
    renderNav()
    expect(toggle()).toHaveAccessibleName(is.nav.menu)
    await user.click(toggle())
    expect(toggle()).toHaveAccessibleName(is.close)
  })

  it('puts the address and the passed-in children in the foot of the menu', () => {
    renderNav()
    const panel = document.getElementById('site-menu')!
    expect(within(panel).getByRole('link', { name: 'svef@svef.is' })).toHaveAttribute(
      'href',
      'mailto:svef@svef.is',
    )
    expect(within(panel).getByRole('button', { name: 'EN' })).toBeInTheDocument()
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

  it('closes when a link inside it is followed', async () => {
    const user = userEvent.setup()
    const { rerender } = renderNav('/is')
    await user.click(toggle())
    await user.click(screen.getByRole('link', { name: is.nav.news }))

    navigate(rerender, '/is/frettir')
    expect(toggle()).toHaveAttribute('aria-expanded', 'false')
  })

  it('stays closed when the reader goes Back to a page it was opened on', async () => {
    // The bug this replaced derived `open` from `openedAt === pathname`, which
    // is true again the moment you return to that path: the menu reopened by
    // itself, re-armed the focus trap and pulled focus onto the first item.
    const user = userEvent.setup()
    const { rerender } = renderNav('/is/frettir')
    await user.click(toggle())
    expect(toggle()).toHaveAttribute('aria-expanded', 'true')

    navigate(rerender, '/is/vidburdir')
    expect(toggle()).toHaveAttribute('aria-expanded', 'false')

    navigate(rerender, '/is/frettir')
    expect(toggle()).toHaveAttribute('aria-expanded', 'false')
    // Whether focus is *also* released is a browser question — jsdom has no
    // layout, so nothing is blurred by becoming `display: none`. The e2e suite
    // presses Back for real and checks the panel is hidden there.
  })

  it('closes when the item for the current page is activated', async () => {
    // No navigation happens, so nothing changes `pathname` — without the
    // link's own `onClick` the menu would sit there having done nothing.
    const user = userEvent.setup()
    renderNav('/is/frettir')
    await user.click(toggle())
    await user.click(screen.getByRole('link', { name: is.nav.news }))

    expect(toggle()).toHaveAttribute('aria-expanded', 'false')
    // That link is about to be `display: none`, so focus has to go somewhere.
    expect(toggle()).toHaveFocus()
  })

  it('marks the current page with aria-current', () => {
    renderNav('/is/frettir')
    expect(screen.getByRole('link', { name: is.nav.news })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('link', { name: is.nav.events })).not.toHaveAttribute('aria-current')
  })

  it('marks nothing on a page the nav does not list', () => {
    renderNav('/is/frettir/einhver-frett')
    expect(document.querySelectorAll('[aria-current]')).toHaveLength(0)
  })

  it('drops hidden pages from the nav, in both languages', () => {
    pathname.current = '/is'
    render(
      <MantineProvider forceColorScheme="dark">
        <SiteNav
          items={[
            hiddenItems[0],
            ...items,
            { href: '/en/web-awards', label: 'Web Awards' },
            { href: '/en/membership', label: 'Membership' },
            hiddenItems[1],
          ]}
          menuLabel={is.nav.menu}
          submenuLabel="undirsíður"
          navLabel={is.nav.primary}
          locale="is"
        />
      </MantineProvider>,
    )
    const nav = screen.getByRole('navigation', { name: is.nav.primary })
    const hrefs = within(nav)
      .getAllByRole('link')
      .map((a) => a.getAttribute('href'))
    expect(hrefs).toEqual(['/is/vidburdir', '/is/frettir'])
  })

  it('drops a hidden page from a submenu and keeps the parent', () => {
    pathname.current = '/is'
    render(
      <MantineProvider forceColorScheme="dark">
        <SiteNav
          items={[
            {
              href: '/is/um-svef',
              label: is.nav.about,
              children: [{ href: '/is/stjorn', label: 'Stjórn' }, hiddenItems[1]],
            },
          ]}
          menuLabel={is.nav.menu}
          submenuLabel="undirsíður"
          navLabel={is.nav.primary}
          locale="is"
        />
      </MantineProvider>,
    )
    expect(screen.getByRole('link', { name: 'Stjórn' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: is.nav.membership })).not.toBeInTheDocument()
  })

  it('has no axe violations open or closed', async () => {
    const user = userEvent.setup()
    const { container } = renderNav()
    expect((await axe(container)).violations).toEqual([])
    await user.click(toggle())
    expect((await axe(container)).violations).toEqual([])
  })

  describe('submenu', () => {
    const trigger = () => screen.getByRole('button', { name: /undirsíður/ })

    function renderSubmenu() {
      pathname.current = '/is'
      return render(
        <MantineProvider forceColorScheme="dark">
          <header>
            <SiteNav
              items={withSubmenu}
              menuLabel={is.nav.menu}
              submenuLabel="undirsíður"
              navLabel={is.nav.primary}
              locale="is"
            />
          </header>
          <main>
            <button type="button">Annað</button>
          </main>
        </MantineProvider>,
      )
    }

    it('keeps the parent a link and the disclosure a separate button', () => {
      renderSubmenu()
      expect(screen.getByRole('link', { name: is.nav.about })).toHaveAttribute('href', '/is/um-svef')
      expect(trigger()).toHaveAttribute('aria-expanded', 'false')
    })

    it('opens on the button and closes on Escape, returning focus to it', async () => {
      const user = userEvent.setup()
      renderSubmenu()
      await user.click(trigger())
      expect(trigger()).toHaveAttribute('aria-expanded', 'true')

      await user.keyboard('{Escape}')
      expect(trigger()).toHaveAttribute('aria-expanded', 'false')
      expect(trigger()).toHaveFocus()
    })

    it('opens with ArrowDown from the button', async () => {
      const user = userEvent.setup()
      renderSubmenu()
      trigger().focus()
      await user.keyboard('{ArrowDown}')
      expect(trigger()).toHaveAttribute('aria-expanded', 'true')
    })

    it('closes on a click outside it', async () => {
      const user = userEvent.setup()
      renderSubmenu()
      await user.click(trigger())
      await user.click(screen.getByRole('button', { name: 'Annað' }))
      expect(trigger()).toHaveAttribute('aria-expanded', 'false')
    })
  })
})
