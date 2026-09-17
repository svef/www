import type { CollectionConfig } from 'payload'

export const Events: CollectionConfig = {
  slug: 'events',
  access: { read: () => true },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'startDate', 'location'] },
  fields: [
    { name: 'title', type: 'text', required: true, localized: true },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { position: 'sidebar' },
    },
    { name: 'startDate', type: 'date', required: true, admin: { date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'endDate', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
    /**
     * The venue's name, e.g. "Harpa, Silfurberg". The detail design prints this
     * on the first line of the sidebar's STAÐSETNING entry, with
     * `venueAddress` beneath it; the index prints it on its own in the row meta.
     * Localized because a venue can have an English name ("Harpa Concert Hall").
     */
    { name: 'location', type: 'text', localized: true },
    /**
     * The street line under `location` — "Austurbakki 2, 101 Reykjavík".
     *
     * Deliberately a separate field rather than two lines in `location`: the
     * index rows want the venue name alone, and an editor typing a newline into
     * a text field is not a content model.
     *
     * Not localized. An Icelandic postal address is the address a visitor gives
     * a taxi driver whichever language they read the page in, and translating
     * it would be a way to get someone to the wrong door.
     */
    { name: 'venueAddress', type: 'text' },
    { name: 'description', type: 'richText', localized: true },
    /**
     * Where to buy a ticket. The design's "Kaupa miða" button; without a URL
     * there is nothing to link to, so the page renders no button rather than a
     * dead one. Prices below still show in the practical-information list —
     * knowing what a ticket costs is useful before sales open.
     */
    { name: 'ticketUrl', type: 'text' },
    /**
     * Full price in ISK, as a number. The design prints "18.900 kr." in
     * Icelandic; the formatting is `Intl.NumberFormat`'s job, so a price does
     * not have to be typed once per locale and cannot drift between them.
     *
     * Left unset for the free events — members attend everything except the
     * awards free — and the page then shows no price at all.
     */
    {
      name: 'ticketPrice',
      type: 'number',
      min: 0,
      admin: {
        // Spelled out because `0` is a plausible way to mean "free" and does
        // not behave like one: it is a price, so the page prints "0 kr." and
        // the ticket button reads "Kaupa miða — 0 kr.". Empty is the way to
        // say there is no price.
        description:
          'ISK, full price. Leave empty for a free event — 0 is a price and prints as "0 kr.".',
      },
    },
    /**
     * Price in ISK for SVEF members. Stored rather than derived from a discount
     * percentage, because the member price is the number the association
     * publishes and rounds; the *percentage* is what is derived from the pair
     * ("Félagar fá 20% afslátt"), which is the direction that cannot be wrong.
     */
    { name: 'memberPrice', type: 'number', min: 0, admin: { description: 'ISK, price for SVEF members.' } },
    /**
     * What a visitor with an access need should know before deciding to come —
     * step-free access, a hearing loop, sign interpretation.
     *
     * Localized, and a real field rather than a sentence buried in the body,
     * because SVEF gives an award for accessibility and this is the one piece
     * of information a reader needs to find without reading three paragraphs.
     */
    { name: 'accessibility', type: 'textarea', localized: true },
    { name: 'coverImage', type: 'upload', relationTo: 'media' },
    { name: 'gallery', type: 'upload', relationTo: 'media', hasMany: true },
  ],
}
