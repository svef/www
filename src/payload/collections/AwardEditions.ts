import type { CollectionConfig } from 'payload'

// One per awards year. Winners relate to an edition. Historical data import is
// a separate side project (site-plan.md) — editions can be created ahead of data.
//
// The upcoming edition is also what the awards page's ceremony block is built
// from, so the fields the design needs for that block live here rather than on
// the `awards-page` global: they change every year, and the global would have to
// be rewritten each November while the edition it describes sits next to it.
export const AwardEditions: CollectionConfig = {
  slug: 'award-editions',
  access: { read: () => true },
  admin: { useAsTitle: 'year', defaultColumns: ['year', 'ceremonyDate', 'venue'] },
  fields: [
    { name: 'year', type: 'number', required: true, unique: true, index: true },
    { name: 'ceremonyDate', type: 'date' },
    { name: 'venue', type: 'text' },
    {
      name: 'headline',
      type: 'text',
      localized: true,
      admin: {
        description:
          'Heading for the ceremony block, e.g. "14. nóvember í Hörpu". Written rather than composed from the date and venue above, because Icelandic declines the venue name ("Harpa" → "í Hörpu") and no amount of formatting gets there. Left empty, the block falls back to the date and venue as they are.',
      },
    },
    {
      name: 'submissionDeadline',
      type: 'date',
      admin: { description: 'Last day a site can be entered for this edition.' },
    },
    {
      name: 'submissionUrl',
      type: 'text',
      admin: { description: 'Where the "Senda inn vef" button goes. No button without it.' },
    },
    {
      name: 'ticketsOnSaleFrom',
      type: 'date',
      admin: { description: 'The day tickets to the ceremony go on sale.' },
    },
    {
      name: 'ticketUrl',
      type: 'text',
      admin: { description: 'Where the "Kaupa miða" button goes. No button without it.' },
    },
  ],
}
