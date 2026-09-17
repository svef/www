/**
 * DEVELOPMENT FIXTURES — not real content.
 * =======================================
 *
 * Fixture copy for `npm run seed:dev`. Every string here is transcribed from the
 * Claude Design export that is the design of record for the full site
 * (`SVEF Website (standalone).html`, alongside the maintainer's working notes) —
 * its page copy and its prototype data arrays (`upcoming`, `eventsPast`,
 * `winners`, `categories`, `board`, `faqData`, `news`, `albums`).
 *
 * This is deliberately NOT the route for real content. Real content entry is
 * issue #29; this file only exists so that local pages, Storybook shots and
 * agent screenshots have something truthful to render. Nothing here should be
 * copied into production.
 *
 * Rules this file follows:
 *
 * - **No invention.** If the export does not say it, it is not here. Fields the
 *   export has no value for (social URLs, ticket URLs, board bios, board intro,
 *   news authors, judge blurbs for three of the 2025 winners) are left unset
 *   rather than filled with plausible-looking fiction.
 * - **Icelandic only, almost everywhere.** The export is an Icelandic prototype:
 *   its language toggle renders "English copy is not available for this page yet
 *   — showing Icelandic." So `en` is seeded for exactly the two values where an
 *   English form is actually attested (the site plan's IA line "Vefverðlaunin /
 *   Icelandic Web Awards"). Everything else is left unset on purpose, so the
 *   is → en fallback is what a page-wiring change is verified against.
 * - **Times.** The export gives clock times for upcoming events only. Past
 *   events that carry a date but no time use 12:00Z (Iceland is UTC year-round),
 *   which is a neutral placeholder, not a claim about when they started.
 * - **No media.** R2 is not provisioned, so every `upload` relationship
 *   (coverImage, photo, gallery, gallery images, brand assets, winner
 *   screenshots) is left unset. Gallery documents are created with an empty
 *   `images` array so the albums exist and can be filled once R2 is live.
 */

type LexicalTextNode = {
  detail: 0
  format: 0
  mode: 'normal'
  style: ''
  text: string
  type: 'text'
  version: 1
}

type LexicalBlockNode = {
  children: LexicalTextNode[]
  direction: 'ltr'
  format: ''
  indent: 0
  tag?: 'h2'
  textFormat: 0
  type: 'paragraph' | 'heading' | 'quote'
  version: 1
}

export type RichTextValue = {
  root: {
    children: LexicalBlockNode[]
    direction: 'ltr'
    format: ''
    indent: 0
    type: 'root'
    version: 1
  }
}

/** A paragraph, `{ h2 }` for a section heading, or `{ quote }` for a pull quote. */
export type Block = string | { h2: string } | { quote: string }

const textNode = (text: string): LexicalTextNode => ({
  detail: 0,
  format: 0,
  mode: 'normal',
  style: '',
  text,
  type: 'text',
  version: 1,
})

const blockText = (block: Block): string =>
  typeof block === 'string' ? block : 'h2' in block ? block.h2 : block.quote

const blockType = (block: Block) => {
  if (typeof block === 'string') return { type: 'paragraph' as const }
  if ('h2' in block) return { type: 'heading' as const, tag: 'h2' as const }
  return { type: 'quote' as const }
}

/** Builds the Lexical editor state that Payload's richText fields store. */
export const richText = (blocks: Block[]): RichTextValue => ({
  root: {
    children: blocks.map((block) => ({
      children: [textNode(blockText(block))],
      direction: 'ltr' as const,
      format: '' as const,
      indent: 0 as const,
      textFormat: 0 as const,
      version: 1 as const,
      ...blockType(block),
    })),
    direction: 'ltr',
    format: '',
    indent: 0,
    type: 'root',
    version: 1,
  },
})

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

export type EventFixture = {
  slug: string
  title: string
  titleEn?: string
  startDate: string
  endDate?: string
  location?: string
  description?: Block[]
}

export const events: EventFixture[] = [
  {
    slug: 'islensku-vefverdlaunin-2026',
    title: 'Íslensku vefverðlaunin 2026',
    titleEn: 'The Icelandic Web Awards 2026',
    startDate: '2026-11-14T19:30:00.000Z',
    endDate: '2026-11-15T01:00:00.000Z',
    location: 'Harpa, Silfurberg',
    description: [
      'Íslensku vefverðlaunin eru haldin í 26. sinn og eru stærsta hátíð vefiðnaðarins á Íslandi. Verðlaunað er í 13 flokkum og dómnefnd skipuð fagfólki úr greininni velur sigurvegara.',
      'Kvöldið hefst með fordrykk klukkan 19:30, verðlaunaafhending hefst 20:30 og að henni lokinni tekur við eftirpartý með plötusnúð. Klæðnaður: það sem þér líður vel í.',
      'Innsendingar eru opnar til 10. október. Félagar í SVEF fá 20% afslátt af innsendingum og miðum, og fyrirtækjafélagar fá fimm frímiða.',
      { h2: 'Hagnýtar upplýsingar' },
      'Staðsetning: Harpa, Silfurberg, Austurbakki 2, 101 Reykjavík. Miðaverð 18.900 kr., félagar 15.120 kr.',
      'Aðgengi: hjólastólaaðgengi, tónmöskvi og táknmálstúlkun í boði. Spurningar: svef@svef.is.',
    ],
  },
  {
    slug: 'kludurkvold-oktober-2026',
    title: 'Klúðurkvöld',
    startDate: '2026-10-09T20:00:00.000Z',
    location: 'Grandi 101',
    description: ['Afslappað kvöld um að læra af mistökum.'],
  },
  {
    slug: 'hadegisfyrirlestur-adgengi-i-raunheimum',
    title: 'Hádegisfyrirlestur: Aðgengi í raunheimum',
    startDate: '2026-09-21T12:00:00.000Z',
    location: 'Zoom',
    description: ['Hvernig WCAG lítur út í daglegri vinnu.'],
  },
  {
    slug: 'vinnustofa-honnunarkerfi-fra-grunni',
    title: 'Vinnustofa: Hönnunarkerfi frá grunni',
    startDate: '2026-09-05T13:00:00.000Z',
    location: 'Kvosin',
    description: ['Hálfsdagsvinnustofa, 20 sæti.'],
  },
  // `location` on the next two comes from the export's `albums` metas
  // ("KVOSIN · 22. MAÍ 2026", "GRANDI 101 · 13. MAR 2026") — its `eventsPast`
  // rows carry no venue.
  {
    slug: 'adalfundur-svef-2026',
    title: 'Aðalfundur SVEF',
    startDate: '2026-05-22T12:00:00.000Z',
    location: 'Kvosin',
    description: ['Ný stjórn kjörin og starfsárið gert upp.'],
  },
  {
    slug: 'kludurkvold-mars-2026',
    title: 'Klúðurkvöld',
    startDate: '2026-03-13T12:00:00.000Z',
    location: 'Grandi 101',
    description: ['Sjö sögur af mistökum, ein af þeim mjög dýr.'],
  },
  {
    slug: 'islensku-vefverdlaunin-2025',
    title: 'Íslensku vefverðlaunin 2025',
    titleEn: 'The Icelandic Web Awards 2025',
    // The export gives "15. NÓV 2025" with no clock time, so the 12:00Z rule
    // above applies — the 2026 ceremony's 19:30 is not attested for 2025.
    startDate: '2025-11-15T12:00:00.000Z',
    location: 'Harpa',
    description: ['Uppselt hús og 13 verðlaunahafar.'],
  },
]

export type NewsFixture = {
  slug: string
  title: string
  publishedAt: string
  excerpt: string
  body?: Block[]
}

export const news: NewsFixture[] = [
  {
    slug: 'ny-stjorn-er-tekin-vid',
    title: 'Ný stjórn er tekin við',
    publishedAt: '2026-05-22T12:00:00.000Z',
    excerpt: 'Ný stjórn SVEF tók við störfum á aðalfundi samtakanna þann 22. maí.',
    body: [
      'Ný stjórn SVEF tók við störfum á aðalfundi samtakanna þann 22. maí síðastliðinn. Stjórnin samanstendur af kempum og nýliðum í faginu sem eiga það sameiginlegt að brenna fyrir vefmálum.',
      'Á fundinum var farið yfir starfsárið sem er að baki: átta viðburði, tvö Klúðurkvöld og vefverðlaun sem seldust upp á tíu dögum. Fráfarandi stjórn var þökkuð vel unnin störf.',
      { h2: 'Áherslur næsta starfsárs' },
      'Stjórnin ætlar að leggja áherslu á aðgengismál, fjölbreyttari viðburði utan höfuðborgarsvæðisins og að efla tengsl við menntastofnanir. Fyrsti viðburður starfsársins verður í október.',
      {
        quote:
          '„Við hlökkum mikið til starfsársins með ykkur og getum ekki beðið eftir að halda vefverðlaunin í 26. sinn.“',
      },
      'Nánari upplýsingar um dagskrá og staðsetningu verða birtar á samfélagsmiðlum og hér á vefnum á næstu vikum.',
    ],
  },
  {
    slug: 'innsendingar-opna-i-agust',
    title: 'Innsendingar opna í ágúst',
    publishedAt: '2026-05-08T12:00:00.000Z',
    excerpt: 'Flokkarnir verða 13 talsins og nýr flokkur bætist við: Nýliði ársins.',
  },
  {
    slug: 'kludurkvold-i-mars-thad-sem-vid-laerdum',
    title: 'Klúðurkvöld í mars: það sem við lærðum',
    publishedAt: '2026-04-19T12:00:00.000Z',
    excerpt: 'Sjö sögur af mistökum og ein mjög dýr lexía um gagnaflutninga.',
  },
  {
    slug: 'adgengi-verdur-ahersluatridi-arsins',
    title: 'Aðgengi verður áhersluatriði ársins',
    publishedAt: '2026-03-02T12:00:00.000Z',
    excerpt: 'Stjórnin setur aðgengismál í forgang á starfsárinu 2026.',
  },
  {
    slug: 'vefverdlaunin-faerast-i-silfurberg',
    title: 'Vefverðlaunin færast í Silfurberg',
    publishedAt: '2026-01-15T12:00:00.000Z',
    excerpt: 'Stærri salur eftir að hátíðin seldist upp á tíu dögum í fyrra.',
  },
  {
    slug: 'thakkir-fyrir-vefverdlaunin-2025',
    title: 'Þakkir fyrir vefverðlaunin 2025',
    publishedAt: '2025-12-04T12:00:00.000Z',
    excerpt: 'Uppselt hús, þrettán verðlaunahafar og eitt mjög gott eftirpartý.',
  },
]

export type GalleryFixture = {
  title: string
  date: string
  /** Slug of the event this album documents. */
  eventSlug: string
}

export const galleries: GalleryFixture[] = [
  {
    title: 'Íslensku vefverðlaunin 2025',
    date: '2025-11-15T12:00:00.000Z',
    eventSlug: 'islensku-vefverdlaunin-2025',
  },
  { title: 'Klúðurkvöld', date: '2026-03-13T12:00:00.000Z', eventSlug: 'kludurkvold-mars-2026' },
  { title: 'Aðalfundur 2026', date: '2026-05-22T12:00:00.000Z', eventSlug: 'adalfundur-svef-2026' },
]

export type BoardMemberFixture = {
  name: string
  role: string
  company?: string
  order: number
}

export const boardMembers: BoardMemberFixture[] = [
  { name: 'Salena Raquel Kauffman', role: 'Formaður · UX/UI hönnuður', company: 'JúnÍ Digital', order: 1 },
  { name: 'Sigurður Snær Eiríksson', role: 'Gjaldkeri & vefstjóri · forritari', company: 'Dacoda', order: 2 },
  { name: 'Sveinn Steinarsson', role: 'Ritari · vefþróun', order: 3 },
  { name: 'Margrét Rúnarsdóttir', role: 'Meðstjórnandi · markaðsmál', order: 4 },
  { name: 'Kolfinna Pétursdóttir', role: 'Meðstjórnandi · viðburðir', order: 5 },
  { name: 'Brian Johannessen', role: 'Meðstjórnandi · hönnun', order: 6 },
  { name: 'Petra Dís Magnúsdóttir', role: 'Meðstjórnandi · vefverðlaunin', order: 7 },
  { name: 'Jón Andri Óskarsson', role: 'Varamaður · nýir vefir', order: 8 },
]

export type AwardCategoryFixture = { slug: string; name: string; order: number }

/** The 13 categories, in the export's order. */
export const awardCategories: AwardCategoryFixture[] = [
  { slug: 'vefur-arsins', name: 'Vefur ársins', order: 1 },
  { slug: 'honnun-og-vidmot', name: 'Hönnun & viðmót', order: 2 },
  { slug: 'fyrirtaekjavefur-litid', name: 'Fyrirtækjavefur — lítið', order: 3 },
  { slug: 'fyrirtaekjavefur-medalstort', name: 'Fyrirtækjavefur — meðalstórt', order: 4 },
  { slug: 'fyrirtaekjavefur-stort', name: 'Fyrirtækjavefur — stórt', order: 5 },
  { slug: 'markadsvefur', name: 'Markaðsvefur', order: 6 },
  { slug: 'soluvefur', name: 'Söluvefur', order: 7 },
  { slug: 'snjalllausn', name: 'Snjalllausn', order: 8 },
  { slug: 'vefkerfi', name: 'Vefkerfi', order: 9 },
  { slug: 'app-arsins', name: 'App ársins', order: 10 },
  { slug: 'adgengi', name: 'Aðgengi', order: 11 },
  { slug: 'efnistok-og-texti', name: 'Efnistök & texti', order: 12 },
  { slug: 'nylidi-arsins', name: 'Nýliði ársins', order: 13 },
]

export type AwardEditionFixture = { year: number; ceremonyDate?: string; venue?: string }

/** The years the export's archive tabs offer, plus the upcoming 2026 ceremony. */
export const awardEditions: AwardEditionFixture[] = [
  { year: 2026, ceremonyDate: '2026-11-14T19:30:00.000Z', venue: 'Harpa, Silfurberg' },
  { year: 2025, ceremonyDate: '2025-11-15T12:00:00.000Z', venue: 'Harpa' },
  { year: 2024 },
  { year: 2023 },
  { year: 2022 },
  { year: 2021 },
  { year: 2020 },
]

export type AwardWinnerFixture = {
  siteName: string
  year: number
  categorySlug: string
  blurb?: string
  isSpecial: boolean
}

/**
 * The 2025 winners the export's home page and archive show. The export's own
 * archive rows for 2020–2024 carry only a placeholder blurb ("Umsögn dómnefndar
 * birtist hér þegar söguleg gögn hafa verið flutt inn"), so they are not seeded —
 * the historical import owns those.
 *
 * `isSpecial` has no counterpart in the export. It is derived from the field's
 * own label in `AwardWinners.ts` ("Special recognition (Design & interface,
 * Accessibility, Project of the year…)"), which names exactly the categories
 * flagged here — it is not a value read from the export.
 */
export const awardWinners: AwardWinnerFixture[] = [
  {
    siteName: 'nafn.is',
    year: 2025,
    categorySlug: 'vefur-arsins',
    blurb: 'Framúrskarandi heildarupplifun, hraði og efnistök.',
    isSpecial: false,
  },
  {
    siteName: 'studio.is',
    year: 2025,
    categorySlug: 'honnun-og-vidmot',
    blurb: 'Djarft myndmál og ótrúlega öguð týpógrafía.',
    isSpecial: true,
  },
  {
    siteName: 'adgengi.is',
    year: 2025,
    categorySlug: 'adgengi',
    blurb: 'Til fyrirmyndar í lyklaborðsstýringu og skjálesurum.',
    isSpecial: true,
  },
  { siteName: 'appid.is', year: 2025, categorySlug: 'app-arsins', isSpecial: false },
  { siteName: 'verslun.is', year: 2025, categorySlug: 'soluvefur', isSpecial: false },
  { siteName: 'lausn.is', year: 2025, categorySlug: 'snjalllausn', isSpecial: false },
]

// ---------------------------------------------------------------------------
// Globals
// ---------------------------------------------------------------------------

export const siteSettings = {
  tagline: 'Samtök vefiðnaðarins · síðan 2005',
  footerBlurb:
    'SVEF er félag fólks sem starfar við vefinn á Íslandi. Við miðlum þekkingu og eflum fagleg vinnubrögð í greininni.',
  contactEmail: 'svef@svef.is',
  // The export draws FB / IG / X / LI in the footer but carries no URLs, so the
  // `social` group is left empty rather than pointed at guessed profiles.
}

export const homePage = {
  heroSentence: 'Félag fólksins sem býr til vefinn á Íslandi.',
  heroHook:
    'Um 300 hönnuðir, forritarar, markaðsfólk og UX-fólk. Við höldum viðburði, veitum Íslensku vefverðlaunin og gerum vefinn okkar betri — saman.',
  happeningNow: { mode: 'nextEvent' as const },
  showUpcomingEvents: true,
  showRecentWinners: true,
  showPhotos: true,
}

export const aboutStory: Block[] = [
  'SVEF — Samtök vefiðnaðarins — voru stofnuð árið 2005 og eru félag fólks sem starfar við vefinn á Íslandi. Í dag eru félagar um 300 talsins: forritarar, hönnuðir, markaðsfólk, verkefnastjórar og UX-fólk.',
  'Við miðlum þekkingu og eflum fagleg vinnubrögð í greininni — með viðburðum, Íslensku vefverðlaununum og samtali milli fólks sem annars myndi aldrei hittast. Samtökin eru rekin af sex manna sjálfboðaliðastjórn.',
]

export type FaqFixture = { question: string; answer: string }

export const faq: FaqFixture[] = [
  {
    question: 'Hver getur orðið félagi í SVEF?',
    answer:
      'Öll sem starfa við vefinn á Íslandi — forritarar, hönnuðir, markaðsfólk, verkefnastjórar, UX-fólk og nemar í greininni.',
  },
  {
    question: 'Hvað kostar aðild?',
    answer:
      'Einstaklingsaðild kostar 23.900 kr. á ári og fyrirtækjaaðild 149.000 kr. á ári.',
  },
  {
    question: 'Hvað nær fyrirtækjaaðild yfir marga?',
    answer: 'Alla starfsmenn fyrirtækisins, óháð fjölda.',
  },
  {
    question: 'Eru viðburðir frír fyrir félaga?',
    answer:
      'Já, allir viðburðir SVEF eru frír fyrir félaga nema Íslensku vefverðlaunin, þar sem félagar fá 20% afslátt.',
  },
  {
    question: 'Hvenær eru Íslensku vefverðlaunin haldin?',
    answer: 'Í nóvember ár hvert. Árið 2026 verða þau haldin 14. nóvember í Hörpu.',
  },
  {
    question: 'Hvernig sendi ég inn vef í keppnina?',
    answer:
      'Innsendingar opna í ágúst og loka 10. október. Innsendingarform er á síðu vefverðlaunanna.',
  },
  {
    question: 'Hvað kostar að senda inn?',
    answer: 'Verð fer eftir flokki. Félagar fá 20% afslátt af öllum innsendingum.',
  },
  {
    question: 'Hverjir sitja í dómnefnd?',
    answer:
      'Fagfólk úr greininni sem stjórn skipar árlega. Dómnefndarfólk má ekki dæma verkefni sem það kom að.',
  },
  {
    question: 'Get ég sent inn vef sem ég vann fyrir erlendan viðskiptavin?',
    answer: 'Já, ef verkefnið var unnið af teymi sem starfar á Íslandi.',
  },
  {
    question: 'Hvernig kemst ég í stjórn?',
    answer: 'Stjórn er kosin á aðalfundi í maí. Öll félög geta boðið sig fram.',
  },
  {
    question: 'Hvað er Klúðurkvöld?',
    answer:
      'Afslappað kvöld þar sem fólk segir frá mistökum í verkefnum — og hvað það lærði af þeim.',
  },
  {
    question: 'Haldið þið viðburði utan Reykjavíkur?',
    answer: 'Já, við stefnum á að minnsta kosti tvo viðburði á landsbyggðinni á ári.',
  },
  {
    question: 'Get ég sagt upp aðild?',
    answer: 'Já, sendu okkur póst á svef@svef.is og aðild fellur niður við lok tímabils.',
  },
  {
    question: 'Hvernig fæ ég myndir af viðburði?',
    answer:
      'Allar myndir eru birtar í myndasafninu og má nota með merkingu um ljósmyndara.',
  },
]

export type PressFixture = { title: string; outlet: string; url?: string }

/**
 * The three press mentions the export's "Fjölmiðlar" list shows, verbatim.
 *
 * The export draws every row as `href="#"`, so it carries headline and outlet
 * but no URL — the same situation as the footer's social icons, and handled the
 * same way: the fixtures transcribe what the design has rather than inventing
 * links to RÚV, Vísir and Kjarninn that may not exist. `url` is optional in the
 * model and the page renders an unlinked row without it, so the section is
 * exercised as it will look once real links are entered.
 */
export const press: PressFixture[] = [
  { title: 'Vefur ársins 2025 valinn í Hörpu', outlet: 'RÚV' },
  { title: 'Aðgengi á íslenskum vefjum batnar hægt', outlet: 'Vísir' },
  { title: 'Ný stjórn tekin við hjá SVEF', outlet: 'Kjarninn' },
]

export type TierFixture = {
  name: string
  priceISK: number
  benefits: string[]
  featured?: boolean
}

export const membership = {
  intro:
    'Félagar komast frítt á viðburði SVEF, fá afslátt af vefverðlaununum og styðja við faglegt starf í greininni.',
  signupCtaLabel: 'Sækja um aðild',
  tiers: [
    {
      name: 'Einstaklingsaðild',
      priceISK: 23900,
      benefits: [
        'Frítt á alla viðburði SVEF (nema vefverðlaunin)',
        '20% afsláttur af miðum á Íslensku vefverðlaunin',
        'Aðgangur að samfélagi og póstlista félagsmanna',
      ],
    },
    {
      name: 'Fyrirtækjaaðild',
      priceISK: 149000,
      // The export draws this tier on the light panel with the yellow block.
      featured: true,
      benefits: [
        'Nær yfir alla starfsmenn fyrirtækisins',
        'Frítt á viðburði SVEF',
        '20% afsláttur af innsendingum og miðum',
        '5 frímiðar á Íslensku vefverðlaunin',
        'Forgangur á viðburði með takmarkað sæti',
      ],
    },
  ] satisfies TierFixture[],
}

/**
 * The English membership copy.
 *
 * Every other global is seeded in Icelandic only and lets Payload's field-level
 * fallback show Icelandic on `/en`, behind the translation note. Membership is
 * the exception because the English copy already exists — it was written into
 * the page as a literal before the page read Payload, and moving the page onto
 * the CMS should not lose it. It is keyed positionally against
 * `membership.tiers`, so a tier added above must be added here too; the
 * fixtures test asserts the two stay the same length.
 */
export const membershipEn = {
  intro:
    'Members get into SVEF events free, get a discount on the Web Awards and support professional work in the industry.',
  signupCtaLabel: 'Apply for membership',
  tiers: [
    {
      name: 'Individual',
      benefits: [
        'Free entry to all SVEF events (except the Web Awards)',
        '20% off Icelandic Web Awards tickets',
        'Access to the members’ community and mailing list',
      ],
    },
    {
      name: 'Company',
      benefits: [
        'Covers every employee of the company',
        'Free entry to SVEF events',
        '20% off submissions and tickets',
        '5 free Icelandic Web Awards tickets',
        'Priority access to events with limited seats',
      ],
    },
  ],
}

export const awardsIntro: Block[] = [
  'Árleg verðlaun SVEF fyrir framúrskarandi vefi, öpp og stafrænar lausnir. Dómnefnd fagfólks metur innsendingar í 13 flokkum — og verðlaunin eru afhent í Hörpu.',
  'Hátíðin 2026 fer fram 14. nóvember í Hörpu. Innsendingar eru opnar til 10. október og miðar á hátíðina fara í sölu 1. september.',
]
