import { describe, it, expect } from 'vitest'
import { axe } from 'vitest-axe'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MantineProvider } from '@mantine/core'
import { Gallery, type GalleryImage } from './Gallery'
import styles from './Gallery.module.scss'
import { is } from '@/lib/i18n/is'
import { en } from '@/lib/i18n/en'

const props = {
  placeholderCount: 3,
  viewLabel: 'Skoða mynd',
  prevLabel: 'Fyrri mynd',
  nextLabel: 'Næsta mynd',
  closeLabel: is.close,
}

const photos: GalleryImage[] = [
  {
    url: 'https://assets.svef.is/harpa-salur.jpg',
    alt: 'Fullur salur í Hörpu',
    caption: 'Fullur salur í Hörpu',
    width: 1200,
    height: 800,
  },
  {
    url: 'https://assets.svef.is/verdlaunagripir.jpg',
    alt: 'Verðlaunagripirnir á borði',
    caption: null,
    width: 1200,
    height: 800,
  },
]

function renderGallery(overrides: Partial<React.ComponentProps<typeof Gallery>> = {}) {
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

async function openLightbox(name = `${props.viewLabel} 1`) {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name }))
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

  it('closes on Escape', async () => {
    renderGallery()
    const user = await openLightbox()
    await screen.findByRole('dialog')
    await user.keyboard('{Escape}')
    // Mantine unmounts the modal after its exit transition, so this is a wait
    // rather than an immediate assertion.
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  // The arrow keys are the reason the lightbox is worth having at all, and
  // wrapping is what stops the last photo being a dead end.
  it('steps with the arrow keys and wraps at both ends', async () => {
    renderGallery()
    const user = await openLightbox()
    await screen.findByRole('dialog', { name: '1 / 3' })

    await user.keyboard('{ArrowRight}')
    expect(await screen.findByRole('dialog', { name: '2 / 3' })).toBeInTheDocument()

    await user.keyboard('{ArrowLeft}')
    expect(await screen.findByRole('dialog', { name: '1 / 3' })).toBeInTheDocument()

    await user.keyboard('{ArrowLeft}')
    expect(await screen.findByRole('dialog', { name: '3 / 3' })).toBeInTheDocument()

    await user.keyboard('{ArrowRight}')
    expect(await screen.findByRole('dialog', { name: '1 / 3' })).toBeInTheDocument()
  })

  it('moves focus into the dialog and restores it to the thumbnail on close', async () => {
    renderGallery()
    const thumb = screen.getByRole('button', { name: `${props.viewLabel} 1` })
    const user = await openLightbox()
    const dialog = await screen.findByRole('dialog')

    expect(dialog.contains(document.activeElement)).toBe(true)

    await user.keyboard('{Escape}')
    // Focus goes back to the thumbnail that opened the dialog — without it,
    // closing drops a keyboard user at the top of the document.
    await waitFor(() => expect(document.activeElement).toBe(thumb))
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

describe('Gallery thumbnails', () => {
  it('renders an image per photo and names the button from the caption', async () => {
    renderGallery({ photos })

    const grid = screen.getByRole('list')
    expect(within(grid).getAllByRole('listitem')).toHaveLength(photos.length)

    // The button carries the description; the image inside it is decorative, so
    // the name is announced once rather than twice.
    const thumb = screen.getByRole('button', { name: `${props.viewLabel}: ${photos[0].alt}` })
    expect(within(thumb).getByRole('presentation', { hidden: true })).toBeInTheDocument()
  })

  it('falls back to placeholder tiles when the album has no images yet', () => {
    renderGallery({ photos: [] })

    expect(screen.getAllByRole('listitem')).toHaveLength(props.placeholderCount)
    expect(screen.getByRole('button', { name: `${props.viewLabel} 1` })).toBeInTheDocument()
    // Nothing to show, so nothing claims to be an image.
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('shows the enlarged photo with its caption as alt text', async () => {
    renderGallery({ photos })
    await openLightbox(`${props.viewLabel}: ${photos[0].alt}`)

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('img', { name: photos[0].alt })).toBeInTheDocument()
    // The caption is repeated under the photo for people who can see it.
    expect(within(dialog).getByText(photos[0].caption!)).toBeInTheDocument()
  })

  // The placeholder's striped texture and its fixed 3:2 box used to live on the
  // same class as the enlarged photo, so every photo that was not 3:2 rendered
  // letterboxed with placeholder stripes in the bars. Every committed asset in
  // the repo is 3:2, which is why it was invisible.
  it('does not put the placeholder texture on a real photo', async () => {
    renderGallery({ photos })
    await openLightbox(`${props.viewLabel}: ${photos[0].alt}`)

    const dialog = await screen.findByRole('dialog')
    const img = within(dialog).getByRole('img', { name: photos[0].alt })
    expect(img).toHaveClass(styles.fullImage)
    expect(img).not.toHaveClass(styles.placeholder)
  })

  it('leaves out the caption line for a photo that has none', async () => {
    renderGallery({ photos })
    await openLightbox(`${props.viewLabel}: ${photos[1].alt}`)

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('img', { name: photos[1].alt })).toBeInTheDocument()
    expect(within(dialog).queryByText(photos[0].alt)).not.toBeInTheDocument()
  })
})

// Three albums means three galleries on one page, each with its own lightbox and
// its own counter. Nothing else covers that: the page renders one component per
// album and both e2e specs scope to the first one.
describe('several galleries on one page', () => {
  function renderTwo() {
    return render(
      <MantineProvider forceColorScheme="dark">
        <header>SVEF</header>
        <main>
          <section aria-label="Fyrra myndasafn">
            <Gallery {...props} placeholderCount={2} />
          </section>
          <section aria-label="Seinna myndasafn">
            <Gallery {...props} photos={photos} />
          </section>
        </main>
      </MantineProvider>,
    )
  }

  it('opens the lightbox belonging to the album that was clicked', async () => {
    renderTwo()
    const user = userEvent.setup()
    const second = screen.getByRole('region', { name: 'Seinna myndasafn' })

    await user.click(
      within(second).getByRole('button', { name: `${props.viewLabel}: ${photos[1].alt}` }),
    )

    // The counter is the second album's, not a total across the page.
    const dialog = await screen.findByRole('dialog', { name: `2 / ${photos.length}` })
    expect(within(dialog).getByRole('img', { name: photos[1].alt })).toBeInTheDocument()
  })

  it('returns focus to the thumbnail in the album that opened it', async () => {
    renderTwo()
    const user = userEvent.setup()
    const second = screen.getByRole('region', { name: 'Seinna myndasafn' })
    const thumb = within(second).getByRole('button', {
      name: `${props.viewLabel}: ${photos[1].alt}`,
    })

    await user.click(thumb)
    await screen.findByRole('dialog')
    await user.keyboard('{Escape}')

    await waitFor(() => expect(document.activeElement).toBe(thumb))
  })
})
