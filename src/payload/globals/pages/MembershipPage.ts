import type { GlobalConfig } from 'payload'

export const MembershipPage: GlobalConfig = {
  slug: 'membership-page',
  access: { read: () => true },
  fields: [
    { name: 'intro', type: 'textarea', localized: true },
    {
      name: 'tiers',
      type: 'array',
      fields: [
        { name: 'name', type: 'text', required: true, localized: true },
        { name: 'priceISK', type: 'number', required: true },
        {
          name: 'benefits',
          type: 'array',
          fields: [{ name: 'benefit', type: 'text', required: true, localized: true }],
        },
      ],
    },
    { name: 'signupCtaLabel', type: 'text', localized: true },
    { name: 'signupUrl', type: 'text' },
  ],
}
