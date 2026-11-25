import type { CollectionConfig } from 'payload'
import { revalidateCollection } from '@/payload/hooks/revalidate'

// Rendered as a grid under Um SVEF (About).
export const BoardMembers: CollectionConfig = {
  slug: 'board-members',
  access: { read: () => true },
  // An editor's save shows up on the next request rather than within the
  // five-minute window (svef/www#67). Which pages it reaches: `hooks/paths.ts`.
  hooks: revalidateCollection('board-members'),
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
