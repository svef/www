import type { CollectionConfig } from 'payload'

// A winning site in a given edition + category. Archive pages are Icelandic-only,
// so text here is not localized (see site-plan.md localization scope).
export const AwardWinners: CollectionConfig = {
  slug: 'award-winners',
  access: { read: () => true },
  admin: { useAsTitle: 'siteName', defaultColumns: ['siteName', 'edition', 'category'] },
  fields: [
    { name: 'siteName', type: 'text', required: true },
    { name: 'edition', type: 'relationship', relationTo: 'award-editions', required: true },
    { name: 'category', type: 'relationship', relationTo: 'award-categories', required: true },
    { name: 'url', type: 'text' },
    { name: 'screenshot', type: 'upload', relationTo: 'media' },
    { name: 'blurb', type: 'textarea' },
    {
      name: 'isSpecial',
      type: 'checkbox',
      label: 'Special recognition (Design & interface, Accessibility, Project of the year…)',
      defaultValue: false,
    },
  ],
}
