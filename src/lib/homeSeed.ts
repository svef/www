import type { Locale } from './i18n'

// Seed home content (bare hrefs; the page prefixes the locale base). This is the
// design's real copy — the HomePage global + Events collection will override it
// once content exists in Payload. TODO: wire getPayload() reads with this as fallback.
interface Cta {
  label: string
  href: string
}
interface HomeContent {
  hero: { eyebrow: string; title: string; lead: string; primary: Cta; secondary: Cta }
  spotlight: { eyebrow: string; title: string; body: string; primary: Cta; secondary: Cta }
  sections: { events: string; photos: string; allPhotos: string }
  events: { title: string; dateLabel: string; location: string; href: string }[]
}

export const homeSeed: Record<Locale, HomeContent> = {
  is: {
    hero: {
      eyebrow: 'Samtök vefiðnaðarins · Síðan 2005',
      title: 'Félag fólksins sem býr til vefinn á Íslandi.',
      lead: 'Um 300 hönnuðir, forritarar, markaðsfólk og UX-fólk. Við höldum viðburði, veitum Íslensku vefverðlaunin og gerum vefinn okkar betri — saman.',
      primary: { label: 'Ganga í SVEF', href: '/skraning' },
      secondary: { label: 'Skoða viðburði →', href: '/vidburdir' },
    },
    spotlight: {
      eyebrow: 'Það sem er að gerast núna',
      title: 'Íslensku vefverðlaunin 2026 — miðasala hafin',
      body: '14. nóvember í Hörpu. Innsendingar opnar til 10. október í 13 flokkum — allt frá Vef ársins til Aðgengis.',
      primary: { label: 'Kaupa miða', href: '/vefverdlaunin' },
      secondary: { label: 'Um verðlaunin →', href: '/vefverdlaunin' },
    },
    sections: {
      events: 'Næstu viðburðir',
      photos: 'Myndir frá viðburðum',
      allPhotos: 'Sjá fleiri myndir →',
    },
    events: [
      { title: 'Íslensku vefverðlaunin', dateLabel: '14. nóvember 2026', location: 'Harpa', href: '/vidburdir' },
      { title: 'Klúðurkvöld', dateLabel: '13. febrúar 2026', location: 'Reykjavík', href: '/vidburdir' },
    ],
  },
  en: {
    hero: {
      eyebrow: 'The Icelandic Web Industry Association · Since 2005',
      title: 'The association of people who build the web in Iceland.',
      lead: 'Around 300 designers, developers, marketers and UX folk. We run events, present the Icelandic Web Awards, and make our web better — together.',
      primary: { label: 'Join SVEF', href: '/skraning' },
      secondary: { label: 'See events →', href: '/vidburdir' },
    },
    spotlight: {
      eyebrow: 'Happening now',
      title: 'The Icelandic Web Awards 2026 — tickets on sale',
      body: 'November 14 at Harpa. Submissions open until October 10 across 13 categories — from Site of the Year to Accessibility.',
      primary: { label: 'Buy tickets', href: '/vefverdlaunin' },
      secondary: { label: 'About the awards →', href: '/vefverdlaunin' },
    },
    sections: {
      events: 'Upcoming events',
      photos: 'Photos from events',
      allPhotos: 'See more photos →',
    },
    events: [
      { title: 'The Icelandic Web Awards', dateLabel: 'November 14, 2026', location: 'Harpa', href: '/vidburdir' },
      { title: 'Klúðurkvöld (Mistakes Night)', dateLabel: 'February 13, 2026', location: 'Reykjavík', href: '/vidburdir' },
    ],
  },
}
