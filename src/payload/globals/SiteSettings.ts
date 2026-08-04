import type { GlobalConfig } from 'payload'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  access: { read: () => true },
  fields: [
    { name: 'tagline', type: 'text', localized: true },
    { name: 'footerBlurb', type: 'textarea', localized: true },
    { name: 'contactEmail', type: 'text', defaultValue: 'svef@svef.is' },
    {
      name: 'social',
      type: 'group',
      fields: [
        { name: 'facebook', type: 'text' },
        { name: 'instagram', type: 'text' },
        { name: 'x', type: 'text' },
        { name: 'linkedin', type: 'text' },
      ],
    },
  ],
}
