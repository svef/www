import { afterEach, describe, it, expect, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { render, screen, within, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrandKit, BRAND_COLOURS, BRAND_LOGOS, type BrandKitCopy } from './BrandKit'
import { ColourSwatches } from './ColourSwatches'

const copy: BrandKitCopy = {
  title: 'Vörumerki',
  mark: {
    title: 'Merkið',
    blurb: 'Notið merkið.',
    primary: 'Aðalmerki',
    primaryAlt: 'SVEF merkið',
    variants: 'Útgáfur merkisins',
    download: 'Sækja merkið',
    downloadName: 'svef-logo.svg',
  },
  files: { title: 'Fleiri skrár' },
  colours: {
    title: 'Litir',
    blurb: 'Litirnir okkar.',
    copied: 'Afritað',
    copyFailed: 'Ekki tókst að afrita',
    copyHint: 'afrita litakóða',
  },
  type: { title: 'Letur', name: 'Archivo', blurb: 'Letrið.', website: 'Vefurinn' },
}

function stubClipboard(writeText: (s: string) => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
}

afterEach(() => {
  vi.useRealTimers()
  Reflect.deleteProperty(navigator, 'clipboard')
})

describe('BrandKit', () => {
  it('lists ten versions of the mark and a download of the primary one', () => {
    render(<BrandKit copy={copy} />)
    expect(BRAND_LOGOS).toHaveLength(10)
    const list = screen.getByRole('list', { name: 'Útgáfur merkisins' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(10)
    const download = screen.getByRole('link', { name: 'Sækja merkið' })
    expect(download).toHaveAttribute('download', 'svef-logo.svg')
    expect(download.getAttribute('href')).toMatch(/^\/brand\/logo-\d\d\.svg$/)
    expect(screen.getByAltText('SVEF merkið')).toBeInTheDocument()
  })

  it('shows extra downloads only when an editor added some', () => {
    const { rerender } = render(<BrandKit copy={copy} />)
    expect(screen.queryByRole('heading', { name: 'Fleiri skrár' })).toBeNull()
    rerender(
      <BrandKit
        copy={copy}
        files={[
          { label: 'Merkjahandbók', url: '/media/handbook.pdf', size: '2 MB' },
          { label: 'Tákn', url: '/media/icon.svg' },
        ]}
      />,
    )
    expect(screen.getByRole('heading', { name: 'Fleiri skrár' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Merkjahandbók/ })).toHaveTextContent('2 MB')
    expect(screen.getByRole('link', { name: 'Tákn' })).toHaveAttribute('href', '/media/icon.svg')
  })

  it('has every brand colour as a swatch, in the brand’s own names', () => {
    render(<BrandKit copy={copy} />)
    const buttons = within(screen.getByRole('list', { name: 'Litir' })).getAllByRole('button')
    expect(buttons).toHaveLength(BRAND_COLOURS.length)
    expect(buttons[0]).toHaveAccessibleName(/Blackety black.*#09060C.*afrita litakóða/)
  })

  it('has no accessibility violations', async () => {
    const { container } = render(<BrandKit copy={copy} />)
    expect((await axe(container)).violations).toEqual([])
  })
})

describe('ColourSwatches', () => {
  const props = {
    swatches: BRAND_COLOURS,
    copied: 'Afritað',
    copyFailed: 'Mistókst',
    hint: 'afrita',
    label: 'Litir',
  }

  it('copies the hex code as written and announces it', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    stubClipboard(writeText) // after setup(): userEvent installs its own clipboard
    render(<ColourSwatches {...props} />)
    await user.click(screen.getByRole('button', { name: /Electric violet/ }))
    expect(writeText).toHaveBeenCalledWith('#8917E1')
    expect(screen.getByTestId('copy-status')).toHaveTextContent('Afritað: #8917E1')
  })

  it('says so, and keeps the code visible, when the clipboard is refused', async () => {
    const user = userEvent.setup()
    stubClipboard(() => Promise.reject(new Error('denied')))
    render(<ColourSwatches {...props} />)
    await user.click(screen.getByRole('button', { name: /Solid red/ }))
    expect(screen.getByTestId('copy-status')).toHaveTextContent('Mistókst: #FF0000')
    expect(screen.getByRole('button', { name: /Solid red/ })).toHaveTextContent('#FF0000')
  })

  it('also fails cleanly where there is no clipboard at all', async () => {
    const user = userEvent.setup()
    render(<ColourSwatches {...props} />)
    // userEvent installs its own clipboard stub; remove it to model an insecure context.
    Reflect.deleteProperty(navigator, 'clipboard')
    await user.click(screen.getByRole('button', { name: /Shy white/ }))
    expect(screen.getByTestId('copy-status')).toHaveTextContent('Mistókst: #FCFBFE')
  })

  it('clears the confirmation after a moment', async () => {
    vi.useFakeTimers()
    stubClipboard(vi.fn().mockResolvedValue(undefined))
    render(<ColourSwatches {...props} />)
    await act(async () => {
      screen.getByRole('button', { name: /Solid red/ }).click()
    })
    expect(screen.getByTestId('copy-status')).toHaveTextContent('Afritað')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000)
    })
    expect(screen.getByTestId('copy-status')).toBeEmptyDOMElement()
  })
})
