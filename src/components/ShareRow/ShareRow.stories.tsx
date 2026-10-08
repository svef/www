import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { ShareRow } from './ShareRow'

const meta: Meta<typeof ShareRow> = {
  title: 'Content/ShareRow',
  component: ShareRow,
  args: {
    url: 'https://svef.is/frettir/ny-stjorn-er-tekin-vid',
    title: 'Ný stjórn er tekin við',
    labels: {
      label: 'Deila',
      facebook: 'Deila á Facebook',
      x: 'Deila á X',
      linkedin: 'Deila á LinkedIn',
      copyLink: 'Afrita hlekk',
      copied: 'Hlekkur afritaður',
    },
  },
}
export default meta

export const Default: StoryObj<typeof ShareRow> = {}
