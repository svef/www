import type { GlobalConfig } from 'payload'

/**
 * The home page's copy and switches.
 *
 * Redesign (#129): the page is the export's `forsida` — hero, intro band, events, about.
 * Every piece of copy here is optional: what is left empty shows the export's own copy
 * from the dictionary (`t.home`).
 *
 * The fields marked "unused" below are hidden from the admin: the one-sentence headline
 * and the news section (the export's home has no news), and what belonged to the page
 * before the redesign (a hero lede, the "happening now" spotlight, the winners and
 * photos strips). They stay in the schema so a database that other branches still build
 * against keeps its columns; drop them together once the redesign has landed.
 */
export const HomePage: GlobalConfig = {
  slug: 'home-page',
  access: { read: () => true },
  fields: [
    {
      name: 'heroLines',
      type: 'array',
      localized: true,
      labels: { singular: 'Line', plural: 'Hero lines' },
      admin: {
        description:
          'The headline, one row per line as it is broken on the page. Each word animates on its own, so keep a line short. Empty: the designed headline.',
      },
      fields: [{ name: 'text', type: 'text', required: true }],
    },
    {
      name: 'heroPrimaryLabel',
      type: 'text',
      localized: true,
      admin: { description: 'Label of the hero’s first button (membership). Hidden while that page is.' },
    },
    {
      name: 'heroSecondaryLabel',
      type: 'text',
      localized: true,
      admin: { description: 'Label of the hero’s second button (events).' },
    },
    {
      name: 'introBand',
      type: 'group',
      fields: [
        {
          name: 'text',
          type: 'textarea',
          localized: true,
          admin: { description: 'The statement in the violet band under the hero.' },
        },
      ],
    },
    {
      name: 'eventsSection',
      type: 'group',
      fields: [
        { name: 'heading', type: 'text', localized: true },
        {
          name: 'lead',
          type: 'textarea',
          localized: true,
          admin: { description: 'The paragraph beside the heading.' },
        },
        { name: 'linkLabel', type: 'text', localized: true, admin: { description: 'Label of the link to all events.' } },
      ],
    },
    {
      name: 'aboutSection',
      type: 'group',
      fields: [
        { name: 'heading', type: 'text', localized: true },
        { name: 'text', type: 'textarea', localized: true },
        { name: 'linkLabel', type: 'text', localized: true, admin: { description: 'Label of the link to the About page.' } },
      ],
    },
    { name: 'showUpcomingEvents', type: 'checkbox', defaultValue: true },

    // ---- Unused since the redesign (see above) -----------------------------------------
    { name: 'heroSentence', type: 'text', localized: true, admin: { hidden: true } },
    {
      name: 'newsSection',
      type: 'group',
      admin: { hidden: true },
      fields: [
        { name: 'heading', type: 'text', localized: true },
        { name: 'linkLabel', type: 'text', localized: true },
      ],
    },
    { name: 'showLatestNews', type: 'checkbox', defaultValue: true, admin: { hidden: true } },
    { name: 'heroHook', type: 'text', localized: true, admin: { hidden: true } },
    {
      name: 'happeningNow',
      type: 'group',
      admin: { hidden: true },
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
    { name: 'showRecentWinners', type: 'checkbox', defaultValue: true, admin: { hidden: true } },
    { name: 'showPhotos', type: 'checkbox', defaultValue: true, admin: { hidden: true } },
  ],
}
