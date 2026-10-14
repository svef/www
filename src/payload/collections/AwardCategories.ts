import type { CollectionConfig } from 'payload'
import { revalidateFixed, revalidateFixedDelete } from '@/payload/hooks/revalidate'
import { awardsPaths } from '@/payload/hooks/paths'

// The ~13 award categories. A collection (not an enum) so the board can edit them
// year to year without a code change.
export const AwardCategories: CollectionConfig = {
  slug: 'award-categories',
  access: { read: () => true },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'order'] },
  defaultSort: 'order',
  // An editor's save shows up on the next request rather than within the
  // five-minute window (svef/www#67).
  hooks: {
    afterChange: [revalidateFixed('award-categories', awardsPaths)],
    afterDelete: [revalidateFixedDelete('award-categories', awardsPaths)],
  },
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
