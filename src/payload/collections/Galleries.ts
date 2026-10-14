import type { CollectionConfig } from 'payload'
import { revalidateFixed, revalidateFixedDelete } from '@/payload/hooks/revalidate'
import { galleryPaths } from '@/payload/hooks/paths'

// Event photo albums. Drives the Myndir section + lightbox. Starting fresh (site-plan.md).
export const Galleries: CollectionConfig = {
  slug: 'galleries',
  access: { read: () => true },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'date'] },
  // An editor's save shows up on the next request rather than within the
  // five-minute window (svef/www#67).
  hooks: {
    afterChange: [revalidateFixed('galleries', galleryPaths)],
    afterDelete: [revalidateFixedDelete('galleries', galleryPaths)],
  },
  fields: [
    { name: 'title', type: 'text', required: true, localized: true },
    { name: 'date', type: 'date' },
    { name: 'event', type: 'relationship', relationTo: 'events' },
    {
      name: 'images',
      type: 'array',
      fields: [
        { name: 'image', type: 'upload', relationTo: 'media', required: true },
        { name: 'caption', type: 'text', localized: true },
      ],
    },
  ],
}
