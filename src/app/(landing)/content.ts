import type { Locale } from '@/lib/i18n'

// All landing copy, per locale. The page itself holds no literal text, so a
// missing translation is a type error rather than an Icelandic string surfacing
// on the English page.

// Builds a Google Calendar "add event" URL. Iceland keeps UTC all year, so the
// Z timestamps below are the local times exactly — no offset maths needed.
function googleCalendar(e: {
  title: string
  start: string
  end: string
  location: string
  summary: string
}) {
  // Built by hand rather than with URLSearchParams: that would percent-encode the
  // slash in `dates`, and Google's template expects a literal START/END separator.
  const p = [
    'action=TEMPLATE',
    `text=${encodeURIComponent(e.title)}`,
    `dates=${e.start}/${e.end}`,
    `location=${encodeURIComponent(e.location)}`,
    `details=${encodeURIComponent(e.summary)}`,
  ]
  return `https://calendar.google.com/calendar/render?${p.join('&')}`
}

export interface LandingEvent {
  date: string
  time: string
  title: string
  badge: string | null
  venue: string
  directions: string | null
  body: string
  speakers: string[]
  action: { label: string; href: string }
  ics: string
  gcal: string
}

export interface LandingCopy {
  meta: { title: string; description: string }
  logoLabel: string
  about: { title: string; body: string }
  board: { title: string; alt: string; caption: string }
  events: { title: string; body: string; items: LandingEvent[] }
  labels: {
    directions: string
    addToCalendar: string
    googleCalendar: string
    icsDownload: string
  }
  footer: { blurb: string; copyright: string }
  /** The two things a reader can send us from the landing page. */
  write: { heading: string; feedback: string; feedbackHref: string; talk: string; talkHref: string }
  language: { label: string; is: string; en: string }
}

// Times are identical in both languages; only the date wording differs.
const TIMES = { first: '17:00–20:00', second: '11:50–14:00' }

const is: LandingCopy = {
  meta: {
    title: 'SVEF — Samtök vefiðnaðarins',
    description:
      'Samtök vefiðnaðarins — fagfélag fólksins sem býr til vefinn á Íslandi.',
  },
  logoLabel: 'SVEF — Samtök vefiðnaðarins',
  about: {
    title: 'Um SVEF',
    body: 'SVEF eru fagsamtök þeirra er starfa að vefmálum á Íslandi. Samtökin hafa það að markmiði að miðla þekkingu og efla fagleg vinnubrögð í greininni, vera samræðuvettvangur félagsmanna og andlit stéttarinnar út á við. Á meðal verkefna samtakanna eru hin árlegu Íslensku vefverðlaun, auk fjölda smærri viðburða.',
  },
  board: {
    title: 'Stjórn SVEF 2026–2027',
    alt: 'Stjórn SVEF saman á hópmynd.',
    caption:
      'Ný stjórn SVEF tók við störfum á aðalfundi samtakanna þann 26. maí síðastliðinn. Stjórnin samanstendur af öflugu fólki með ólíkan bakgrunn og fjölbreytta reynslu en öll eigum við það sameiginlegt að brenna fyrir vefmálum.',
  },
  events: {
    title: 'Viðburðir',
    body: 'Starfsárið 2026–2027 er hafið. Hér fyrir neðan má sjá næstu viðburði – nánari upplýsingar um dagskrá og staðsetningu verða birtar á samfélagsmiðlum og hér á vefnum.',
    items: [
      {
        date: '21. október',
        time: TIMES.second,
        title: 'Vefþróun og gervigreind: Hvað er framundan?',
        badge: null,
        venue: 'Harpa, Kaldalón (1. hæð)',
        directions: null,
        body: 'Vefþróun er á stöðugri hreyfingu og breytingarnar gerast hratt. Við fáum reynslubolta úr vefheiminum til að rýna í nýjustu stefnur og strauma og spá fyrir um hvað er framundan. Viðburðurinn er haldinn af Ský í samstarfi við Samtök vefiðnaðarins.',
        speakers: [
          'Pablo Santos, Íslandsbanka',
          'Guðmundur Bjarni Sigurðsson og Jón Kári Eldon, Júní',
          'Ólafur Kjartansson, Hugsmiðjunni',
          'Steinar Ingi Farestveit, Kolibri',
          'Klara Arnalds, Avo',
          'Freyr Friðfinnsson hjá Samtökum iðnaðarins stýrir umræðum',
        ],
        action: {
          label: 'Kaupa miða',
          href: 'https://www.sky.is/vidburdur/3165-2026-vidburdur-1021',
        },
        ics: '/landing/vefthroun-gervigreind.ics',
        gcal: googleCalendar({
          title: 'Vefþróun og gervigreind: Hvað er framundan?',
          start: '20261021T115000Z',
          end: '20261021T140000Z',
          location: 'Harpa, Kaldalón (1. hæð), Reykjavík',
          summary: 'Viðburður Ský í samstarfi við Samtök vefiðnaðarins.',
        }),
      },
    ],
  },
  labels: {
    directions: 'Leiðarlýsing',
    addToCalendar: 'Setja í dagatal',
    googleCalendar: 'Google Calendar',
    icsDownload: 'Apple, Outlook (.ics)',
  },
  footer: {
    blurb:
      'Samtök vefiðnaðarins (SVEF) eru fagsamtök þeirra er starfa að vefmálum á Íslandi. Samtökin hafa það að markmiði að miðla þekkingu og efla fagleg vinnubrögð í greininni.',
    copyright: '© SVEF 2026',
  },
  write: {
    heading: 'Heyrðu í okkur',
    feedback: 'Senda ábendingu',
    feedbackHref: '/is/abendingar',
    talk: 'Bjóða fram erindi',
    talkHref: '/is/erindi',
  },
  language: { label: 'Skipta um tungumál', is: 'IS', en: 'EN' },
}

const en: LandingCopy = {
  meta: {
    title: 'SVEF — the Icelandic Web Industry Association',
    description:
      'SVEF is the professional association for the people who build the web in Iceland.',
  },
  logoLabel: 'SVEF — the Icelandic Web Industry Association',
  about: {
    title: 'About SVEF',
    body: 'SVEF is the Icelandic Web Industry Association. Our aim is to share knowledge and raise professional standards, provide a forum for discussion among members, and represent the industry publicly. SVEF organizes the annual Icelandic Web Awards, as well as a range of smaller events throughout the year.',
  },
  board: {
    title: 'SVEF Board 2026–2027',
    alt: 'The SVEF board together in a group photograph.',
    caption:
      'SVEF’s new board took office at the association’s annual general meeting on May 26. Its members come from diverse educational and professional backgrounds and have a wide range of experience – all united by a shared enthusiasm for the web.',
  },
  events: {
    title: 'Events',
    // The language note matters on the English page: both events run in Icelandic,
    // and that is not something an English reader can infer from the listing.
    body: 'The 2026–2027 season is under way. The next events are listed below – further details of the programme and venues will be announced on social media and here on the site. Events are held in Icelandic unless stated otherwise.',
    items: [
      {
        date: '21 October',
        time: TIMES.second,
        title: 'Web development and AI: what lies ahead?',
        badge: null,
        venue: 'Harpa, Kaldalón (1st floor)',
        directions: null,
        body: 'Web development is in constant motion and the changes come quickly. We bring together experienced people from the web industry to examine the latest trends and to consider what lies ahead. The event is held by Ský in collaboration with SVEF.',
        speakers: [
          'Pablo Santos, Íslandsbanki',
          'Guðmundur Bjarni Sigurðsson and Jón Kári Eldon, Júní',
          'Ólafur Kjartansson, Hugsmiðjan',
          'Steinar Ingi Farestveit, Kolibri',
          'Klara Arnalds, Avo',
          'Freyr Friðfinnsson of the Federation of Icelandic Industries moderates the discussion',
        ],
        action: {
          label: 'Buy tickets',
          href: 'https://www.sky.is/vidburdur/3165-2026-vidburdur-1021',
        },
        ics: '/landing/vefthroun-gervigreind-en.ics',
        gcal: googleCalendar({
          title: 'Web development and AI: what lies ahead?',
          start: '20261021T115000Z',
          end: '20261021T140000Z',
          location: 'Harpa, Kaldalón (1st floor), Reykjavík',
          summary: 'An event by Ský in collaboration with SVEF. Held in Icelandic.',
        }),
      },
    ],
  },
  labels: {
    directions: 'Directions',
    addToCalendar: 'Add to calendar',
    googleCalendar: 'Google Calendar',
    icsDownload: 'Apple, Outlook (.ics)',
  },
  footer: {
    blurb:
      'Samtök vefiðnaðarins (SVEF) is the professional association for people working on the web in Iceland. Our aim is to share knowledge and raise professional standards in the field.',
    copyright: '© SVEF 2026',
  },
  write: {
    heading: 'Get in touch',
    feedback: 'Send feedback',
    feedbackHref: '/en/abendingar',
    talk: 'Propose a talk',
    talkHref: '/en/erindi',
  },
  language: { label: 'Change language', is: 'IS', en: 'EN' },
}

const content: Record<Locale, LandingCopy> = { is, en }

export function getLandingCopy(locale: Locale): LandingCopy {
  return content[locale]
}
