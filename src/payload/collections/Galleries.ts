import type { CollectionConfig } from 'payload'

// Event photo albums. Drives the Myndir section + lightbox. Starting fresh (site-plan.md).
export const Galleries: CollectionConfig = {
  slug: 'galleries',
  access: { read: () => true },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'date'] },
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
