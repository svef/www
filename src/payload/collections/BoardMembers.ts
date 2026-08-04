import type { CollectionConfig } from 'payload'

// Rendered as a grid under Um SVEF (About).
export const BoardMembers: CollectionConfig = {
  slug: 'board-members',
  access: { read: () => true },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'role', 'company', 'order'] },
  defaultSort: 'order',
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'role', type: 'text', localized: true },
    { name: 'company', type: 'text' },
    { name: 'bio', type: 'textarea', localized: true },
    { name: 'photo', type: 'upload', relationTo: 'media' },
    { name: 'order', type: 'number', defaultValue: 0, admin: { position: 'sidebar' } },
  ],
}
