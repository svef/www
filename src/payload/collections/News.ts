import type { CollectionConfig } from 'payload'

export const News: CollectionConfig = {
  slug: 'news',
  access: { read: () => true },
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
    { name: 'author', type: 'text', admin: { position: 'sidebar' } },
    { name: 'excerpt', type: 'textarea', localized: true },
    { name: 'coverImage', type: 'upload', relationTo: 'media' },
    { name: 'body', type: 'richText', localized: true },
  ],
}
