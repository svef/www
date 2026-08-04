import type { GlobalConfig } from 'payload'

export const AwardsPage: GlobalConfig = {
  slug: 'awards-page',
  access: { read: () => true },
  fields: [{ name: 'intro', type: 'richText', localized: true }],
}
