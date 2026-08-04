import type { GlobalConfig } from 'payload'

export const AboutPage: GlobalConfig = {
  slug: 'about-page',
  access: { read: () => true },
  fields: [
    { name: 'story', type: 'richText', localized: true },
    { name: 'boardIntro', type: 'textarea', localized: true },
    {
      name: 'faq',
      type: 'array',
      labels: { singular: 'FAQ', plural: 'FAQ' },
      fields: [
        { name: 'question', type: 'text', required: true, localized: true },
        { name: 'answer', type: 'textarea', required: true, localized: true },
      ],
    },
    {
      name: 'brandAssets',
      type: 'array',
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'file', type: 'upload', relationTo: 'media', required: true },
      ],
    },
  ],
}
