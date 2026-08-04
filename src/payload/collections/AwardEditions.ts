import type { CollectionConfig } from 'payload'

// One per awards year. Winners relate to an edition. Historical data import is
// a separate side project (site-plan.md) — editions can be created ahead of data.
export const AwardEditions: CollectionConfig = {
  slug: 'award-editions',
  access: { read: () => true },
  admin: { useAsTitle: 'year', defaultColumns: ['year', 'ceremonyDate', 'venue'] },
  fields: [
    { name: 'year', type: 'number', required: true, unique: true, index: true },
    { name: 'ceremonyDate', type: 'date' },
    { name: 'venue', type: 'text' },
    { name: 'ticketUrl', type: 'text' },
  ],
}
