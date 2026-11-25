import type { CollectionConfig } from 'payload'
import { revalidateCollection } from '@/payload/hooks/revalidate'

export const News: CollectionConfig = {
  slug: 'news',
  access: { read: () => true },
  // An editor's save shows up on the next request rather than within the
  // five-minute window (svef/www#67). Which pages it reaches: `hooks/paths.ts`.
  hooks: revalidateCollection('news'),
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'publishedAt'] },
  fields: [
    { name: 'title', type: 'text', required: true, localized: true },
    {
      name: 'slug',
      type: 'text',
      required: true,
      // Localized: the slug is the headline, so an English reader should get an
      // English one. Uniqueness is therefore per locale — two documents may not
      // share a slug within a language, but the Icelandic and English slugs of
      // the *same* document are naturally different.
      localized: true,
      index: true,
      admin: { position: 'sidebar' },
    },
    { name: 'publishedAt', type: 'date', required: true, admin: { position: 'sidebar' } },
    {
      name: 'authorMember',
      type: 'relationship',
      relationTo: 'board-members',
      admin: {
        position: 'sidebar',
        description:
          'The byline shows this board member with photo, name and role. Takes precedence over "Author (text)" if both are set. Leave both empty for no byline.',
      },
    },
    {
      name: 'author',
      type: 'text',
      label: 'Author (text)',
      admin: {
        position: 'sidebar',
        description:
          'For an author who is not on the board: shown as a name only, no photo or role. Ignored when a board member is chosen above.',
      },
    },
    { name: 'excerpt', type: 'textarea', localized: true },
    { name: 'coverImage', type: 'upload', relationTo: 'media' },
    { name: 'body', type: 'richText', localized: true },
  ],
}
