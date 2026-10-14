import type { GlobalConfig } from 'payload'
import { revalidateGlobal } from '@/payload/hooks/revalidate'
import { homePagePaths } from '@/payload/hooks/paths'

export const HomePage: GlobalConfig = {
  slug: 'home-page',
  access: { read: () => true },
  // An editor's save shows up on the next request (svef/www#67).
  hooks: { afterChange: [revalidateGlobal('home-page', homePagePaths)] },
  fields: [
    { name: 'heroSentence', type: 'text', localized: true },
    { name: 'heroHook', type: 'text', localized: true },
    {
      name: 'happeningNow',
      type: 'group',
      fields: [
        {
          name: 'mode',
          type: 'select',
          defaultValue: 'nextEvent',
          options: [
            { label: 'Next event', value: 'nextEvent' },
            { label: 'Winner spotlight', value: 'winner' },
            { label: 'Hidden', value: 'hidden' },
          ],
        },
        { name: 'winner', type: 'relationship', relationTo: 'award-winners' },
      ],
    },
    { name: 'showUpcomingEvents', type: 'checkbox', defaultValue: true },
    { name: 'showRecentWinners', type: 'checkbox', defaultValue: true },
    { name: 'showPhotos', type: 'checkbox', defaultValue: true },
  ],
}
