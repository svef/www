import { beforeAll, describe, it, expect } from 'vitest'
import { axe } from 'vitest-axe'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PhotoAlbum, type AlbumPhoto } from './PhotoAlbum'
import { is } from '@/lib/i18n/is'

// jsdom has no modal dialog. This stands in for the two methods the lightbox calls: it
// sets `open` and fires `close`, which is what the browser does (Escape included).
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
})

const c = is.photos
const labels = {
  view: c.viewPhoto,
  prev: c.prevPhoto,
  next: c.nextPhoto,
  close: is.close,
  placeholder: c.placeholder,
  showMore: c.showMore,
  shown: c.shown,
  counter: c.counter,
}

const photo = (n: number, extra: Partial<AlbumPhoto> = {}): AlbumPhoto => ({
  url: `https://assets.svef.is/p${n}.jpg`,
  alt: `Mynd úr salnum ${n}`,
  caption: null,
  width: 1200,
  height: 800,
  ...extra,
})

const dialog = () => document.querySelector('dialog') as HTMLDialogElement

describe('PhotoAlbum', () => {
  it('draws placeholder tiles for an album with no photos', () => {
    render(<PhotoAlbum title="Klúðurkvöld" labels={labels} placeholderCount={5} />)
    expect(screen.getAllByRole('button', { name: /^Skoða mynd \d$/ })).toHaveLength(5)
    expect(screen.getByText('Mynd 3')).toBeInTheDocument()
  })

  it('names a photo tile after its description', () => {
    render(<PhotoAlbum title="A" labels={labels} photos={[photo(1)]} />)
    expect(
      screen.getByRole('button', { name: 'Skoða mynd: Mynd úr salnum 1' }),
    ).toBeInTheDocument()
  })

  it('marks each tile with its orientation', () => {
    render(
      <PhotoAlbum
        title="A"
        labels={labels}
        photos={[photo(1), photo(2, { width: 800, height: 1200 })]}
      />,
    )
    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveAttribute('data-orient', 'l')
    expect(items[1]).toHaveAttribute('data-orient', 'p')
  })

  it('opens the lightbox on the clicked tile, with the photo described and the count announced', async () => {
    const user = userEvent.setup()
    render(
      <PhotoAlbum title="Aðalfundur" labels={labels} photos={[photo(1), photo(2)]} />,
    )
    await user.click(screen.getByRole('button', { name: /Mynd úr salnum 2/ }))
    const box = within(dialog())
    expect(dialog()).toHaveAccessibleName('Aðalfundur')
    expect(box.getByRole('img', { name: 'Mynd úr salnum 2' })).toBeInTheDocument()
    expect(box.getByRole('status')).toHaveTextContent('Mynd 2 af 2')
  })

  it('moves focus to the close button, and back to the tile on close', async () => {
    const user = userEvent.setup()
    render(<PhotoAlbum title="A" labels={labels} photos={[photo(1), photo(2)]} />)
    const tile = screen.getByRole('button', { name: /Mynd úr salnum 2/ })
    await user.click(tile)
    expect(within(dialog()).getByRole('button', { name: is.close })).toHaveFocus()
    await user.click(within(dialog()).getByRole('button', { name: is.close }))
    expect(dialog()).not.toHaveAttribute('open')
    expect(tile).toHaveFocus()
  })

  it('walks with the arrow keys and wraps at both ends', async () => {
    const user = userEvent.setup()
    render(
      <PhotoAlbum title="A" labels={labels} photos={[photo(1), photo(2), photo(3)]} />,
    )
    await user.click(screen.getByRole('button', { name: /Mynd úr salnum 1/ }))
    const status = () => within(dialog()).getByRole('status')
    await user.keyboard('{ArrowLeft}')
    expect(status()).toHaveTextContent('Mynd 3 af 3')
    await user.keyboard('{ArrowRight}')
    expect(status()).toHaveTextContent('Mynd 1 af 3')
    await user.keyboard('{ArrowRight}')
    expect(status()).toHaveTextContent('Mynd 2 af 3')
  })

  it('walks with the buttons', async () => {
    const user = userEvent.setup()
    render(<PhotoAlbum title="A" labels={labels} photos={[photo(1), photo(2)]} />)
    await user.click(screen.getByRole('button', { name: /Mynd úr salnum 1/ }))
    await user.click(within(dialog()).getByRole('button', { name: c.nextPhoto }))
    expect(within(dialog()).getByRole('img')).toHaveAccessibleName('Mynd úr salnum 2')
  })

  it('shows one page of a large album and the next on request', async () => {
    const user = userEvent.setup()
    const many = Array.from({ length: 7 }, (_, i) => photo(i + 1))
    render(<PhotoAlbum title="A" labels={labels} photos={many} pageSize={3} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    expect(screen.getByRole('status')).toHaveTextContent('Sýni 3 af 7')
    await user.click(screen.getByRole('button', { name: c.showMore }))
    expect(screen.getAllByRole('listitem')).toHaveLength(6)
    // The new page's first tile takes focus, so keyboard users continue where they were.
    expect(screen.getByRole('button', { name: /Mynd úr salnum 4/ })).toHaveFocus()
    await user.click(screen.getByRole('button', { name: c.showMore }))
    expect(screen.getAllByRole('listitem')).toHaveLength(7)
    expect(screen.queryByRole('button', { name: c.showMore })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Mynd úr salnum 7/ })).toHaveFocus()
  })

  it('walks the whole album in the lightbox, not just the page shown', async () => {
    const user = userEvent.setup()
    const many = Array.from({ length: 7 }, (_, i) => photo(i + 1))
    render(<PhotoAlbum title="A" labels={labels} photos={many} pageSize={3} />)
    await user.click(screen.getByRole('button', { name: /Mynd úr salnum 1/ }))
    expect(within(dialog()).getByRole('status')).toHaveTextContent('Mynd 1 af 7')
  })

  it('has no accessibility violations, closed or open', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <main>
        <PhotoAlbum
          title="A"
          labels={labels}
          photos={[photo(1, { caption: 'Salurinn' })]}
        />
      </main>,
    )
    expect((await axe(container)).violations).toEqual([])
    await user.click(screen.getByRole('button', { name: /Mynd úr salnum 1/ }))
    expect((await axe(container)).violations).toEqual([])
  })
})
