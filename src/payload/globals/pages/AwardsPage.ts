import type { GlobalConfig } from 'payload'
import { revalidateGlobal } from '@/payload/hooks/revalidate'

export const AwardsPage: GlobalConfig = {
  slug: 'awards-page',
  access: { read: () => true },
  // An editor's save shows up on the next request rather than within the
  // five-minute window (svef/www#67). Which pages it reaches: `hooks/paths.ts`.
  hooks: revalidateGlobal('awards-page'),
  fields: [{ name: 'intro', type: 'richText', localized: true }],
}
