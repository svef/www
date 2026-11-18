import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { Footer } from './Footer'
import { is } from '@/lib/i18n/is'
import { visibleFooterColumns } from '@/lib/nav'
import type { SocialLink } from '@/lib/content/site-settings'

const socials: SocialLink[] = [
  { icon: 'facebook', name: 'Facebook', href: 'https://www.facebook.com/vefidnadurinn' },
  { icon: 'linkedin', name: 'LinkedIn', href: 'https://www.linkedin.com/company/sveficeland/' },
]

function renderFooter(overrides: Partial<Parameters<typeof Footer>[0]> = {}) {
  return render(
    <MantineProvider forceColorScheme="dark">
      <Footer
        blurb={is.footer.blurb}
        email="svef@svef.is"
        contactHeading={is.footer.contactHeading}
        columns={visibleFooterColumns('is', is)}
        columnsLabel={is.footer.pages}
        socials={[]}
        {...overrides}
      />
    </MantineProvider>,
  )
}

describe('Footer', () => {
  it('links the contact address it is given', () => {
    renderFooter({ email: 'hallo@svef.is' })
    expect(screen.getByRole('link', { name: 'hallo@svef.is' })).toHaveAttribute(
      'href',
      'mailto:hallo@svef.is',
    )
  })

  it('shows the blurb, and marks it when it is not in the page language', () => {
    renderFooter({ blurb: 'Hello', blurbLang: 'en' })
    expect(screen.getByText('Hello')).toHaveAttribute('lang', 'en')
  })

  it('with a locale, carries the sticker and keeps the blurb only as a hidden sizer', () => {
    const { container } = renderFooter({ blurb: 'Hello', locale: 'is' })
    // The export's `.foot-about-ghost`: still laid out to size the notch, never read.
    expect(screen.getByText('Hello')).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelector('img[src*="/stickers/"]')).not.toBeNull()
  })

  it('without a locale, shows the blurb and no sticker', () => {
    const { container } = renderFooter({ blurb: 'Hello' })
    expect(screen.getByText('Hello')).not.toHaveAttribute('aria-hidden')
    expect(container.querySelector('img[src*="/stickers/"]')).toBeNull()
  })

  it('carries the trophy as a labelled image only when given a label', () => {
    const { rerender } = renderFooter({ locale: 'is', trophyLabel: is.footer.trophy })
    expect(screen.getByRole('img', { name: is.footer.trophy })).toBeInTheDocument()
    rerender(
      <MantineProvider forceColorScheme="dark">
        <Footer
          blurb="x"
          email="svef@svef.is"
          contactHeading="c"
          columns={[]}
          columnsLabel="p"
          socials={[]}
        />
      </MantineProvider>,
    )
    expect(screen.queryByRole('img', { name: is.footer.trophy })).toBeNull()
  })

  it('renders the page columns as a named navigation, headings and all', () => {
    renderFooter()
    const nav = screen.getByRole('navigation', { name: is.footer.pages })
    for (const heading of [is.footer.programme, is.footer.about, is.footer.involved]) {
      expect(within(nav).getByRole('heading', { name: heading })).toBeInTheDocument()
    }
    expect(within(nav).getByRole('link', { name: is.nav.contact })).toHaveAttribute(
      'href',
      '/is/hafa-samband',
    )
  })

  it('has no Lagalegt column', () => {
    renderFooter()
    expect(screen.queryByRole('heading', { name: 'Lagalegt' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Persónuvernd|Vafrakökur/ })).not.toBeInTheDocument()
  })

  it('renders no social row at all when no network has a URL', () => {
    const { container } = renderFooter()
    // The four `href="#"` placeholders this replaced were the whole of
    // svef/www#26's footer half, and were allowlisted in `e2e/known-links.ts`.
    expect(container.querySelector('a[href="#"]')).toBeNull()
    expect(screen.queryByRole('link', { name: /Facebook|LinkedIn/ })).not.toBeInTheDocument()
  })

  it('renders only the networks that have one', () => {
    renderFooter({ socials })
    expect(screen.getAllByRole('link', { name: /Facebook|LinkedIn/ })).toHaveLength(2)
    expect(screen.queryByRole('link', { name: /Instagram/ })).not.toBeInTheDocument()
  })

  it('names a social link by its network', () => {
    // The link's content is an icon with no text, so `aria-label` is the only
    // accessible name available.
    renderFooter({ socials })
    expect(screen.getByRole('link', { name: 'Facebook' })).toHaveAttribute('href', socials[0].href)
  })

  it('drops links to hidden pages, and a column left empty', () => {
    renderFooter({
      columns: [
        {
          heading: 'Dagskrá',
          links: [
            { href: '/is/vidburdir', label: 'Viðburðir' },
            { href: '/en/web-awards', label: 'Awards' },
            { href: '/is/vefverdlaunin', label: 'Vefverðlaun' },
          ],
        },
        { heading: 'Tóm', links: [{ href: '/is/skraning', label: 'Skrá' }] },
      ],
    })
    expect(screen.getByRole('link', { name: 'Viðburðir' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Awards' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Vefverðlaun' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Skrá' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Tóm' })).not.toBeInTheDocument()
  })

  it('leaves the navigation out entirely when every link is hidden', () => {
    renderFooter({
      columns: [{ heading: 'Tóm', links: [{ href: '/is/skraning', label: 'Skrá' }] }],
    })
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })
})
