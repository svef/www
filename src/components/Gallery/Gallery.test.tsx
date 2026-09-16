import { describe, it, expect } from 'vitest'
import { axe } from 'vitest-axe'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MantineProvider } from '@mantine/core'
import { Gallery } from './Gallery'
import { is } from '@/lib/i18n/is'
import { en } from '@/lib/i18n/en'

const props = {
  count: 3,
  viewLabel: 'Skoða mynd',
  prevLabel: 'Fyrri mynd',
  nextLabel: 'Næsta mynd',
  closeLabel: is.close,
}

function renderGallery(overrides: Partial<typeof props> = {}) {
  return render(
    <MantineProvider forceColorScheme="dark">
      {/* Stands in for the site header, so a second banner landmark is detectable. */}
      <header>SVEF</header>
      <main>
        <Gallery {...props} {...overrides} />
      </main>
    </MantineProvider>,
  )
}

async function openLightbox() {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: `${props.viewLabel} 1` }))
  return user
}

describe('Gallery lightbox', () => {
  it('gives the close button a localized accessible name', async () => {
    renderGallery()
    await openLightbox()
    expect(await screen.findByRole('button', { name: is.close })).toBeInTheDocument()
  })

  it('uses the English close label under the English dictionary', async () => {
    renderGallery({ closeLabel: en.close })
    await openLightbox()
    expect(await screen.findByRole('button', { name: en.close })).toBeInTheDocument()
  })

  it('labels the other dialog controls', async () => {
    renderGallery()
    await openLightbox()
    expect(await screen.findByRole('button', { name: props.prevLabel })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: props.nextLabel })).toBeInTheDocument()
  })

  it('gives the dialog an accessible name', async () => {
    renderGallery()
    await openLightbox()
    expect(await screen.findByRole('dialog', { name: '1 / 3' })).toBeInTheDocument()
  })

  // Mantine's `Modal` shorthand renders its header as `<header>`. `dialog` is not
  // sectioning content, so that element maps to a second `banner` landmark next to the
  // site header. The rule is best-practice rather than WCAG A/AA, so the Playwright axe
  // sweep — which runs only the wcag2a/wcag2aa/wcag21a/wcag21aa tags — does not see it.
  it('does not add a second banner landmark while the lightbox is open', async () => {
    renderGallery()
    await openLightbox()
    await screen.findByRole('dialog')

    // The modal renders in a portal, so the whole document has to be scanned.
    const results = await axe(document.body, {
      runOnly: { type: 'rule', values: ['landmark-no-duplicate-banner'] },
    })

    expect(results.violations).toEqual([])
  })
})
