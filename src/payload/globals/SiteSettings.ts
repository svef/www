import type { GlobalConfig } from 'payload'
import { revalidateGlobal } from '@/payload/hooks/revalidate'
import { siteSettingsPaths } from '@/payload/hooks/paths'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  access: { read: () => true },
  // An editor's save shows up on the next request (svef/www#67).
  hooks: { afterChange: [revalidateGlobal('site-settings', siteSettingsPaths)] },
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
        { name: 'linkedin', type: 'text' },
        // m.me/<page username> opens a Messenger thread with the page.
        { name: 'messenger', type: 'text' },
      ],
    },
  ],
}
