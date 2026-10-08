import { describe, it, expect, vi, afterEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ShareRow } from './ShareRow'

const labels = {
  label: 'Deila',
  facebook: 'Deila á Facebook',
  x: 'Deila á X',
  linkedin: 'Deila á LinkedIn',
  copyLink: 'Afrita hlekk',
  copied: 'Hlekkur afritaður',
}

const props = {
  url: 'https://svef.is/frettir/ny-stjorn-er-tekin-vid',
  title: 'Ný stjórn er tekin við',
  labels,
}

function stubClipboard(writeText: () => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  })
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'clipboard')
})

describe('ShareRow', () => {
  it('names the row so its links are not four loose icons', () => {
    render(<ShareRow {...props} />)
    expect(screen.getByRole('group', { name: labels.label })).toBeInTheDocument()
  })

  it('points each network at the article', () => {
    render(<ShareRow {...props} />)
    const encoded = encodeURIComponent(props.url)
    expect(screen.getByRole('link', { name: labels.facebook })).toHaveAttribute(
      'href',
      `https://www.facebook.com/sharer/sharer.php?u=${encoded}`,
    )
    expect(screen.getByRole('link', { name: labels.x })).toHaveAttribute(
      'href',
      expect.stringContaining(encodeURIComponent(props.title)),
    )
    expect(screen.getByRole('link', { name: labels.linkedin })).toHaveAttribute(
      'href',
      `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`,
    )
  })

  it('copies the article URL and says so', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    stubClipboard(writeText)
    render(<ShareRow {...props} />)

    fireEvent.click(screen.getByRole('button', { name: labels.copyLink }))

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(props.url))
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(labels.copied),
    )
  })

  it('stays quiet when the browser refuses the clipboard', async () => {
    stubClipboard(vi.fn().mockRejectedValue(new Error('NotAllowedError')))
    render(<ShareRow {...props} />)

    fireEvent.click(screen.getByRole('button', { name: labels.copyLink }))

    // The URL is still in the address bar, so there is nothing to apologise for
    // — but the confirmation must not claim something that did not happen.
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(''))
  })
})
