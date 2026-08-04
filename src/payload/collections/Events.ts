import type { CollectionConfig } from 'payload'

export const Events: CollectionConfig = {
  slug: 'events',
  access: { read: () => true },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'startDate', 'location'] },
  fields: [
    { name: 'title', type: 'text', required: true, localized: true },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { position: 'sidebar' },
    },
    { name: 'startDate', type: 'date', required: true, admin: { date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'endDate', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'location', type: 'text', localized: true },
    { name: 'description', type: 'richText', localized: true },
    { name: 'ticketUrl', type: 'text' },
    { name: 'coverImage', type: 'upload', relationTo: 'media' },
    { name: 'gallery', type: 'upload', relationTo: 'media', hasMany: true },
  ],
}
