import type { GlobalConfig } from 'payload'
import { revalidateGlobal } from '@/payload/hooks/revalidate'
import { awardsPagePaths } from '@/payload/hooks/paths'

export const AwardsPage: GlobalConfig = {
  slug: 'awards-page',
  access: { read: () => true },
  // An editor's save shows up on the next request (svef/www#67).
  hooks: { afterChange: [revalidateGlobal('awards-page', awardsPagePaths)] },
  fields: [{ name: 'intro', type: 'richText', localized: true }],
}
