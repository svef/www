import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { LocaleToggle } from './LocaleToggle'

const pathname = vi.hoisted(() => ({ value: '/' }))

vi.mock('next/navigation', () => ({
  usePathname: () => pathname.value,
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: React.ComponentProps<'a'>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

/** jsdom allows same-origin navigation, which is how the hash/query get set. */
function setLocation(url: string) {
  window.history.replaceState(null, '', url)
}

/**
 * The href of one of the two options. Both languages are shown, so these all
 * name the one they mean rather than relying on there being a single link.
 */
function href(label: 'IS' | 'EN' = 'EN') {
  return screen.getByRole('link', { name: label }).getAttribute('href')
}

beforeEach(() => {
  pathname.value = '/'
  setLocation('/')
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('LocaleToggle', () => {
  it('links to the other locale, preserving the path (#40)', () => {
    pathname.value = '/vidburdir'
    setLocation('/vidburdir')
    render(<LocaleToggle locale="is" />)
    expect(href()).toBe('/en/vidburdir')
  })

  it('replaces the /en prefix when switching back to Icelandic', () => {
    pathname.value = '/en/vidburdir'
    setLocation('/en/vidburdir')
    render(<LocaleToggle locale="en" />)
    expect(href('IS')).toBe('/is/vidburdir')
  })

  it('does not stack one locale prefix on another', () => {
    pathname.value = '/is/myndir'
    setLocation('/is/myndir')
    render(<LocaleToggle locale="is" />)
    expect(href('EN')).toBe('/en/myndir')
    expect(href('IS')).toBe('/is/myndir')
  })

  it('preserves the query string (#49)', () => {
    pathname.value = '/myndir'
    setLocation('/myndir?ar=2025')
    render(<LocaleToggle locale="is" />)
    expect(href()).toBe('/en/myndir?ar=2025')
  })

  it('preserves the hash (#49)', () => {
    pathname.value = '/vefverdlaunin'
    setLocation('/vefverdlaunin#dagskra')
    render(<LocaleToggle locale="is" />)
    expect(href()).toBe('/en/vefverdlaunin#dagskra')
  })

  it('preserves the query string and hash together', () => {
    pathname.value = '/en/frettir'
    setLocation('/en/frettir?flokkur=svef#listi')
    render(<LocaleToggle locale="en" />)
    expect(href('IS')).toBe('/is/frettir?flokkur=svef#listi')
  })

  it('does not append a stray ? or # when there is neither', () => {
    pathname.value = '/um-svef'
    setLocation('/um-svef')
    render(<LocaleToggle locale="is" />)
    expect(href()).toBe('/en/um-svef')
  })

  it('picks up a hash added after mount', () => {
    pathname.value = '/vefverdlaunin'
    setLocation('/vefverdlaunin')
    render(<LocaleToggle locale="is" />)
    expect(href()).toBe('/en/vefverdlaunin')

    act(() => {
      setLocation('/vefverdlaunin#dagskra')
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(href()).toBe('/en/vefverdlaunin#dagskra')
  })

  it('picks up a query string restored by Back/Forward', () => {
    pathname.value = '/myndir'
    setLocation('/myndir')
    render(<LocaleToggle locale="is" />)

    act(() => {
      setLocation('/myndir?ar=2024')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(href()).toBe('/en/myndir?ar=2024')
  })

  it('renders a real link with the plain path on the server', async () => {
    // The prerendered markup cannot know the query or hash, so it must still
    // carry a usable href rather than a placeholder — that is the whole reason
    // this reads `window.location` instead of `useSearchParams()`.
    const { renderToStaticMarkup } = await import('react-dom/server')
    pathname.value = '/is/myndir'
    setLocation('/is/myndir?ar=2025#topp')
    const html = renderToStaticMarkup(<LocaleToggle locale="is" />)
    expect(html).toContain('href="/en/myndir"')
    expect(html).toContain('href="/is/myndir"')
  })

  it('shows both languages and marks the current one', () => {
    render(<LocaleToggle locale="is" />)
    const current = screen.getByRole('link', { name: 'IS' })
    const other = screen.getByRole('link', { name: 'EN' })
    // The current language stays a link so the control keeps its shape; it is
    // marked rather than removed.
    expect(current).toHaveAttribute('aria-current', 'page')
    expect(other).not.toHaveAttribute('aria-current')
    expect(other).toHaveAttribute('hrefLang', 'en')
  })
})
