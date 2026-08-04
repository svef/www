import type { CollectionConfig } from 'payload'

// The ~13 award categories. A collection (not an enum) so the board can edit them
// year to year without a code change.
export const AwardCategories: CollectionConfig = {
  slug: 'award-categories',
  access: { read: () => true },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'order'] },
  defaultSort: 'order',
  fields: [
    { name: 'name', type: 'text', required: true, localized: true },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { position: 'sidebar' },
    },
    { name: 'order', type: 'number', defaultValue: 0, admin: { position: 'sidebar' } },
  ],
}
