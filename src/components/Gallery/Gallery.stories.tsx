import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, userEvent, screen } from 'storybook/test'
import { Gallery } from './Gallery'
import { is } from '@/lib/i18n/is'
import { en } from '@/lib/i18n/en'

/**
 * Stand-in photos. R2 is not provisioned yet, so there is nothing at a real
 * media URL to point at; these are committed landing-page assets, used here
 * only so the story exercises the `next/image` path rather than the
 * placeholders. They are 720x480, and the declared width/height say so —
 * metadata that disagrees with the file is exactly what hid the letterboxing
 * bug these stories now cover. Captions are the fixture's, not the images'.
 */
const photos = [
  {
    url: '/landing/board-jon.jpg',
    alt: 'Fullur salur í Hörpu fyrir afhendinguna',
    caption: 'Fullur salur í Hörpu fyrir afhendinguna',
    width: 720,
    height: 480,
  },
  {
    url: '/landing/board-petra.jpg',
    alt: 'Verðlaunagripirnir á borði',
    caption: 'Verðlaunagripirnir á borði',
    width: 720,
    height: 480,
  },
  {
    url: '/landing/board-sveinn.jpg',
    alt: 'Kynnir á sviði',
    caption: 'Kynnir á sviði',
    width: 720,
    height: 480,
  },
  {
    url: '/landing/board-kolfinna.jpg',
    alt: 'Gestir í spjalli eftir athöfnina',
    caption: 'Gestir í spjalli eftir athöfnina',
    width: 720,
    height: 480,
  },
]

/**
 * A generated image of an exact size, as a data URI.
 *
 * Every committed asset in this repo is 3:2, which is the one ratio the
 * lightbox used to handle correctly — so a story built only from them cannot
 * show whether a portrait or a panorama is being letterboxed. These are drawn
 * at the ratio each case needs instead of committing more binaries for it.
 */
function swatch(width: number, height: number, label: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#2b1840"/><text x="50%" y="50%" fill="#c08bf5" font-family="sans-serif" font-size="${Math.round(Math.min(width, height) / 8)}" text-anchor="middle" dominant-baseline="middle">${label}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

const meta: Meta<typeof Gallery> = {
  title: 'Content/Gallery',
  component: Gallery,
  parameters: { layout: 'padded' },
  args: {
    photos,
    viewLabel: 'Skoða mynd',
    prevLabel: 'Fyrri mynd',
    nextLabel: 'Næsta mynd',
    closeLabel: is.close,
  },
}
export default meta

type Story = StoryObj<typeof Gallery>

export const Default: Story = {}

/**
 * An album whose photos have not been uploaded yet — the grid degrades to
 * placeholder tiles instead of collapsing to nothing.
 */
export const WithoutPhotos: Story = { args: { photos: [] } }

/**
 * The three shapes a real event album mixes: a tall portrait, a square and a
 * wide panorama, none of them the 3:2 every committed asset happens to be.
 *
 * Open the lightbox on each. The enlarged photo must fill the frame at its own
 * ratio — no fixed 3:2 box, and no striped placeholder texture showing in bars
 * beside it. That texture belongs to `WithoutPhotos` and nowhere else.
 */
export const MixedAspectRatios: Story = {
  args: {
    photos: [
      { url: swatch(600, 900, '2:3'), alt: 'Standandi mynd', caption: 'Standandi mynd, 600×900', width: 600, height: 900 },
      { url: swatch(800, 800, '1:1'), alt: 'Ferningsmynd', caption: 'Ferningsmynd, 800×800', width: 800, height: 800 },
      { url: swatch(1600, 500, '16:5'), alt: 'Víðmynd', caption: 'Víðmynd, 1600×500', width: 1600, height: 500 },
      { url: swatch(720, 480, '3:2'), alt: 'Liggjandi mynd', caption: 'Liggjandi mynd, 720×480', width: 720, height: 480 },
    ],
  },
}

export const English: Story = {
  args: {
    viewLabel: 'View photo',
    prevLabel: 'Previous photo',
    nextLabel: 'Next photo',
    closeLabel: en.close,
  },
}

/**
 * The lightbox, open on the second photo.
 *
 * This is the page's whole point — the association's current site cannot
 * enlarge a photo — so it gets a story of its own rather than living only
 * behind a click. The play function leaves it open, which is also what puts the
 * dialog in front of the a11y addon: the addon scans what is rendered, and a
 * closed modal renders nothing.
 */
export const Lightbox: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: `Skoða mynd: ${photos[1].alt}` }))
    // The modal is portalled out of the canvas, so it is looked up on screen.
    const dialog = await screen.findByRole('dialog')
    await expect(dialog).toHaveTextContent('2 / 4')
    await expect(screen.getByRole('button', { name: is.close })).toBeVisible()
    await expect(screen.getByRole('img', { name: photos[1].alt })).toBeVisible()
  },
}
