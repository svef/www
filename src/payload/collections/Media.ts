import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  access: { read: () => true },
  upload: {
    adminThumbnail: 'thumbnail',
    imageSizes: [
      { name: 'thumbnail', width: 400, height: 300, position: 'centre' },
      { name: 'medium', width: 800, height: undefined, position: 'centre' },
      { name: 'large', width: 1200, height: undefined, position: 'centre' },
      { name: 'hero', width: 1920, height: undefined, position: 'centre' },
    ],
    mimeTypes: ['image/*', 'application/pdf'],
  },
  fields: [
    { name: 'alt', type: 'text', required: true, localized: true },
    { name: 'caption', type: 'text', localized: true },
    {
      name: 'credit',
      type: 'text',
      label: 'Credit / Attribution',
    },
  ],
}
