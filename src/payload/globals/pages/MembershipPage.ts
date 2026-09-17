import type { GlobalConfig } from 'payload'

export const MembershipPage: GlobalConfig = {
  slug: 'membership-page',
  access: { read: () => true },
  fields: [
    { name: 'intro', type: 'textarea', localized: true },
    {
      name: 'tiers',
      type: 'array',
      fields: [
        { name: 'name', type: 'text', required: true, localized: true },
        { name: 'priceISK', type: 'number', required: true },
        {
          /**
           * The light, block-accented treatment the design gives the company
           * tier. It is an editorial emphasis rather than a property of the
           * tier, so it lives on the document: whichever tier the association
           * wants to lead with gets it, and the page does not have to know
           * that "company" is the special one.
           *
           * Not localized — the emphasis is the same in both languages.
           */
          name: 'featured',
          type: 'checkbox',
          admin: { description: 'Give this tier the highlighted treatment.' },
        },
        {
          /**
           * The tier's own call to action — "Skrá mig" on the individual tier,
           * "Skrá fyrirtæki" on the company one, as the export writes them.
           *
           * Per tier rather than one label for the page because the two CTAs
           * sit side by side and point at the same form: identical names on
           * adjacent links read as "Sækja um aðild, Sækja um aðild" in a screen
           * reader's link list, with nothing to choose between them.
           *
           * Optional — `signupCtaLabel` below is the fallback, so a tier added
           * without one still renders a button.
           */
          name: 'ctaLabel',
          type: 'text',
          localized: true,
        },
        {
          name: 'benefits',
          type: 'array',
          fields: [{ name: 'benefit', type: 'text', required: true, localized: true }],
        },
      ],
    },
    { name: 'signupCtaLabel', type: 'text', localized: true },
    { name: 'signupUrl', type: 'text' },
  ],
}
