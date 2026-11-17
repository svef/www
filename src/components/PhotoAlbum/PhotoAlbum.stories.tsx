import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { PhotoAlbum } from './PhotoAlbum'
import { is } from '@/lib/i18n/is'

const c = is.photos

const meta: Meta<typeof PhotoAlbum> = {
  title: 'Content/PhotoAlbum',
  component: PhotoAlbum,
  parameters: { layout: 'padded' },
  args: {
    title: 'Aðalfundur 2026',
    labels: {
      view: c.viewPhoto,
      prev: c.prevPhoto,
      next: c.nextPhoto,
      close: is.close,
      placeholder: c.placeholder,
      showMore: c.showMore,
      shown: c.shown,
      counter: c.counter,
    },
  },
}
export default meta

type Story = StoryObj<typeof PhotoAlbum>

/** An album whose photos are not uploaded yet: eight brand tiles, as the export draws. */
export const Placeholders: Story = {}

/** A long album shows one page and a button for the next. */
export const Paged: Story = { args: { placeholderCount: 60, pageSize: 12 } }
