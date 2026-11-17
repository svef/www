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
      /**
       * The figures row under the story ("2005 / 300 / 6"). `value` is text so
       * "300+" works; an empty list renders no row.
       */
      name: 'stats',
      type: 'array',
      labels: { singular: 'Stat', plural: 'Stats' },
      admin: { description: 'Figures shown as a row on the About page, e.g. 2005 / Founded. Leave empty to hide the row.' },
      fields: [
        { name: 'value', type: 'text', required: true },
        { name: 'label', type: 'text', required: true, localized: true },
      ],
    },
    {
      /**
       * Press coverage of SVEF — the design's "Fjölmiðlar" list.
       *
       * Deliberately not localized: press coverage is Icelandic media writing in
       * Icelandic, so there is no English version of a headline to translate to.
       * The page marks the section as Icelandic-only rather than pretending the
       * translation is pending (CLAUDE.md, "Routing and language").
       */
      name: 'press',
      type: 'array',
      labels: { singular: 'Press mention', plural: 'Press' },
      admin: { description: 'Coverage of SVEF in the media. Icelandic only.' },
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'outlet', type: 'text', required: true },
        {
          name: 'date',
          type: 'date',
          admin: {
            date: { pickerAppearance: 'monthOnly', displayFormat: 'MMMM yyyy' },
            description: 'Month and year of publication. Left empty, no date is shown.',
          },
        },
        {
          name: 'url',
          type: 'text',
          /**
           * Optional on purpose. A mention with no link still belongs on the
           * list — an article behind a paywall, or one whose URL has rotted —
           * and the page renders it as plain text rather than as a dead link.
           */
          admin: { description: 'Link to the article. Left empty, the row renders unlinked.' },
        },
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
