import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { Footer } from './Footer'
import { is } from '@/lib/i18n/is'
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
        socials={[]}
        year={2026}
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

  it('renders no social row at all when no network has a URL', () => {
    const { container } = renderFooter()
    // The four `href="#"` placeholders this replaced were the whole of
    // svef/www#26's footer half, and were allowlisted in `e2e/known-links.ts`.
    expect(container.querySelector('ul')).toBeNull()
    expect(container.querySelector('a[href="#"]')).toBeNull()
  })

  it('renders only the networks that have one', () => {
    renderFooter({ socials })
    expect(screen.getAllByRole('link', { name: /Facebook|LinkedIn/ })).toHaveLength(2)
    expect(screen.queryByRole('link', { name: /Instagram/ })).not.toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('names a social link by its network', () => {
    // The link's content is an icon with no text, so `aria-label` is the only
    // accessible name available. WCAG 2.5.3 does not apply where there is no
    // visible label for the name to contradict.
    renderFooter({ socials })
    const link = screen.getByRole('link', { name: 'Facebook' })
    expect(link).toHaveAttribute('href', socials[0].href)
  })
})
