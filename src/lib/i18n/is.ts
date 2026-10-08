// Icelandic UI microcopy. Page content comes from Payload (localized); this is
// only the chrome the app renders itself.
export const is = {
  languageName: 'Íslenska',
  // Sits on the language toggle, which is shown in the current locale and names
  // the locale it switches to.
  switchLanguage: 'Skipta yfir í ensku',
  skipToContent: 'Fara beint í efni',
  // Accessible name for the close button of a dialog (the photo lightbox).
  close: 'Loka',
    forms: {
      writeHeading: 'Heyrðu í okkur',
      optional: 'valfrjálst',
      required: 'nauðsynlegt',
      sending: 'Sendi…',
      errors: {
        required: 'Þetta þarf að fylla út.',
        invalid: 'Þetta netfang lítur ekki rétt út.',
        tooLong: 'Þetta er of langt.',
        summary: 'Eitthvað vantar. Sjáðu reitina sem eru merktir hér fyrir neðan.',
      },
      feedback: {
        title: 'Ábendingar',
        lead: 'Hefurðu ábendingu, hugmynd eða spurningu? Við lesum allt sem kemur inn.',
        subject: 'Hvað snýst þetta um?',
        subjectPlaceholder: 'Veldu efni',
        subjectOther: 'Um hvað snýst þetta?',
        message: 'Ábendingin',
        name: 'Nafn',
        email: 'Netfang',
        contactHint: 'Nafn og netfang eru valfrjáls, en hjálpa okkur að svara þér.',
        submit: 'Senda ábendingu',
        successTitle: 'Takk fyrir ábendinguna!',
        successBody: 'Við höfum fengið hana. Ef þú skildir eftir netfang heyrum við í þér ef þörf krefur.',
        subjects: {
          general: 'Almennt um SVEF',
          awards: 'Íslensku vefverðlaunin',
          'event-oct-8': 'Viðburður 8. október',
          'event-oct-21': 'Viðburður 21. október',
          other: 'Annað',
        },
      },
      talk: {
        title: 'Bjóða fram erindi',
        lead: 'Viltu halda erindi á viðburði hjá SVEF? Segðu okkur frá því. Við höfum samband.',
        name: 'Nafn',
        email: 'Netfang',
        topicsLegend: 'Hvaða efni snertir erindið?',
        topicsHint: 'Veldu eins marga flokka og eiga við.',
        proposedTitle: 'Tillaga að titli erindisins',
        summary: 'Um hvað fjallar erindið?',
        summaryHint: 'Nokkrar línur duga, nóg til að við áttum okkur á efninu.',
        notes: 'Eitthvað fleira sem við ættum að vita?',
        notesHint: 'Til dæmis hvenær þér hentar, hversu langt erindið er, eða hvort þú hefur haldið það áður.',
        submit: 'Senda erindi',
        successTitle: 'Takk fyrir!',
        successBody: 'Við höfum fengið erindið og heyrum í þér.',
        topics: {
          development: 'Þróun',
          design: 'Hönnun',
          ux: 'Notendaupplifun',
          accessibility: 'Aðgengi',
          ai: 'Gervigreind',
          'project-management': 'Verkefnastjórnun',
          content: 'Efnistök og texti',
          marketing: 'Markaðsmál',
          security: 'Öryggi',
          infrastructure: 'Innviðir og rekstur',
          data: 'Gögn og mælingar',
          other: 'Annað',
        },
      },
    },
  nav: {
    // Accessible name of the primary `<nav>`. The design export names it
    // "Aðalvalmynd"; it is announced to screen-reader users, so it is interface
    // copy and belongs in Icelandic like the rest of the chrome.
    primary: 'Aðalvalmynd',
    awards: 'Vefverðlaunin',
    events: 'Viðburðir',
    news: 'Fréttir',
    about: 'Um SVEF',
    membership: 'Skráning',
    contact: 'Hafa samband',
    // Visible label on the small-screen menu toggle. It is the button's whole
    // accessible name — `aria-expanded` carries the state, so the name does not
    // change when the menu opens.
    submenu: 'undirsíður',
    menu: 'Valmynd',
  },
  home: {
    // Above the `<h1>`. Chrome rather than content: it states what the
    // association is and when it started, which is not something an editor
    // rewrites per visit, and the export prints it as a fixed label.
    eyebrow: 'Samtök vefiðnaðarins · Síðan 2005',
    /**
     * The `<h1>` when `home-page.heroSentence` has not been written.
     *
     * A page with no `<h1>` is an accessibility failure and an e2e failure, so
     * there has to be something — but it must not be invented content standing
     * in for the association's own words. The association's name is the one
     * thing that is true without anyone writing it, and it is already on the
     * page in the header and the footer.
     */
    fallbackTitle: 'Samtök vefiðnaðarins',
    joinCta: 'Gerast félagi',
    eventsCta: 'Sjá viðburði',
    happeningNow: 'Það sem er að gerast núna',
    // Shown on the winner spotlight, which links out to the winning site.
    visitSite: 'Skoða vefinn',
    aboutAwards: 'Um verðlaunin',
    eventsTitle: 'Næstu viðburðir',
    allEvents: 'Allir viðburðir',
    winnersTitle: 'Verðlaunavefir',
    winnersEmpty: {
      title: 'Engir verðlaunahafar skráðir enn',
      body: 'Verðlaunavefir síðustu ára birtast hér þegar safnið hefur verið flutt inn.',
    },
    photosTitle: 'Myndir frá viðburðum',
    allPhotos: 'Allar myndir',
    // Accessible-name prefix for a tile in the strip, which is the export's own
    // label for it. `/myndir` says "Skoða mynd"; here the tile is a teaser and
    // the action it offers is the enlargement itself.
    enlargePhoto: 'Stækka mynd',
    photosEmpty: {
      title: 'Engar myndir enn',
      body: 'Myndir frá viðburðum SVEF birtast hér um leið og þær eru komnar í hús.',
    },
  },
  events: {
    title: 'Viðburðir',
    lead: 'Fyrirlestrar, vinnustofur og hátíðir fyrir fólkið í vefiðnaðinum. Félagar komast frítt á alla viðburði nema vefverðlaunin.',
    nextEvent: 'Næsti viðburður',
    upcomingTitle: 'Framundan',
    pastTitle: 'Liðnir viðburðir',
    details: 'Nánar',
    aboutEvent: 'Nánar um viðburðinn',
    buyTickets: 'Kaupa miða',
    photosFromEvent: 'Myndir frá viðburði',
    photosFromLastYear: 'Myndir frá síðasta ári',
    photosTitle: 'Myndir frá viðburðinum',
    backToIndex: 'Viðburðir',
    // `{percent}` is filled in from the two prices, so the sentence cannot
    // disagree with the numbers printed beside it.
    memberDiscount: 'Félagar fá {percent}% afslátt',
    practical: {
      title: 'Hagnýtar upplýsingar',
      venue: 'Staðsetning',
      price: 'Miðaverð',
      members: 'félagar',
      accessibility: 'Aðgengi',
      questions: 'Spurningar',
    },
    empty: {
      title: 'Engir viðburðir framundan',
      body: 'Næsti viðburður birtist hér um leið og dagsetning liggur fyrir.',
    },
  },
  news: {
    title: 'Fréttir',
    lead: 'Allt sem við tilkynnum birtist hér fyrst — samfélagsmiðlar vísa alltaf hingað.',
    readArticle: 'Lesa fréttina',
    backToIndex: 'Fréttir',
    empty: {
      title: 'Engar fréttir enn',
      body: 'Hér birtast tilkynningar frá SVEF um leið og þær koma.',
    },
    share: {
      label: 'Deila',
      facebook: 'Deila á Facebook',
      x: 'Deila á X',
      linkedin: 'Deila á LinkedIn',
      copyLink: 'Afrita hlekk',
      copied: 'Hlekkur afritaður',
    },
  },
  about: {
    title: 'Um SVEF',
    boardTitle: 'Stjórn SVEF',
    // Joins a board role to the employer it belongs to: "… hjá Dacoda".
    boardCompanyPrefix: 'hjá',
    // Shown on `/stjorn` in place of the grid when no board members are
    // recorded yet — svef/www#76. A board with no members reads as a broken
    // page, not a quiet one, so this says so rather than leaving the heading
    // over an empty grid.
    boardEmpty: {
      title: 'Engin stjórn skráð enn',
      body: 'Stjórnarmeðlimir birtast hér um leið og þeir hafa verið skráðir.',
    },
    faqTitle: 'Spurt og svarað',
    // Shown on `/spurt-og-svarad` in place of the accordion when no questions
    // are recorded yet — svef/www#76.
    faqEmpty: {
      title: 'Engar spurningar skráðar enn',
      body: 'Algengar spurningar birtast hér um leið og þær hafa verið skráðar.',
    },
    bylawsTitle: 'Lög SVEF',
    bylawsProcess: {
      heading: 'Að leggja til breytingu',
      /** Followed by a link to the repository. */
      repoLead: 'Lögin eru geymd í opnu GitHub-safni:',
      /** Between the repository link and the email address. */
      howTo:
        'Viltu leggja til breytingu? Opnaðu pull request þar, eða sendu okkur tölvupóst á',
      /** Follows the email address. */
      howToEnd: 'ef það hentar betur.',
      meeting:
        'Tillögur eru teknar fyrir á næsta aðalfundi. Sé breytingin brýn má boða til aukaaðalfundar um hana.',
      /** The substance of article 8, which the page renders in full above. */
      article8:
        'Samkvæmt 8. gr. þarf samþykki 2/3 hluta atkvæða, og tillögur þurfa að liggja fyrir til skoðunar fyrir félagsmenn áður en fundurinn er haldinn.',
    },
    bylawsUnavailable:
      'Ekki tókst að sækja lög SVEF að svo stöddu. Lögin eru óbreytt og má lesa í heild sinni hjá upprunanum:',
    pressTitle: 'Fjölmiðlar',
    press: {
      // svef/www#76: split into title/body so this renders through the same
      // `EmptyState` component the other content sections use, instead of a
      // plain muted line.
      empty: {
        title: 'Engin umfjöllun skráð enn',
        body: 'Umfjöllun um SVEF bætist hér við eftir því sem hún birtist.',
      },
    },
    brand: {
      title: 'Merki og efni',
      blurb: 'Merki SVEF í svörtu og hvítu, ásamt litapallettu.',
      // svef/www#76: split into title/body — see `press.empty` above.
      empty: {
        title: 'Skráarsafnið er í vinnslu',
        body: 'Hafðu samband við svef@svef.is ef þig vantar merkið.',
      },
    },
    // Marks a section that is published in Icelandic only as an editorial
    // decision — not a translation that is on its way.
    icelandicOnly: 'Íslenska eingöngu',
  },
  awards: {
    title: 'Íslensku vefverðlaunin',
    /**
     * "Síðan 2000 · 26. árið".
     *
     * The ordinal is the featured edition's year minus 2000, which is how the
     * design arrives at 26 for 2026. Derived rather than written down so the
     * page does not quietly claim the wrong number next November.
     */
    eyebrow: (year: number) => `Síðan 2000 · ${year - 2000}. árið`,
    categoriesTitle: 'Flokkar',
    ceremony: {
      eyebrow: (year: number) => `Hátíðin ${year}`,
      /** Fallback heading when no edition headline has been written. */
      headline: (date: string, venue: string | null) =>
        venue ? `${date} · ${venue}` : date,
      submissions: (date: string) => `Innsendingar opnar til ${date}.`,
      ticketsOnSale: (date: string) => `Miðar á hátíðina fara í sölu ${date}.`,
      submit: 'Senda inn vef',
      buyTickets: 'Kaupa miða',
    },
    archive: {
      title: 'Safn verðlaunahafa',
      /** Accessible name for the group of year buttons. */
      yearsLabel: 'Verðlaunaár',
      /** Accessible name for the grid below them: "Verðlaunahafar 2025". */
      winnersLabel: (year: number) => `Verðlaunahafar ${year}`,
      empty: {
        title: (year: number) => `Engir verðlaunahafar skráðir fyrir ${year}`,
        body: 'Verðlaunahafar fyrri ára birtast hér þegar sögulega safnið hefur verið flutt inn.',
      },
    },
    // Marks the winners archive, which is published in Icelandic only as an
    // editorial decision — not a translation that is on its way.
    icelandicOnly: 'Íslenska eingöngu',
  },
  photos: {
    title: 'Myndir',
    // The hint is the design's, and it is the only place the keyboard shortcuts
    // are announced — without it the arrow keys and Esc are undiscoverable.
    lead: 'Myndasöfn frá viðburðum SVEF. Smelltu á mynd til að stækka — örvatakkar fletta, ESC lokar.',
    // Accessible-name prefix for a thumbnail: "Skoða mynd 3", or
    // "Skoða mynd: <myndatexti>" once the album has real photos.
    viewPhoto: 'Skoða mynd',
    prevPhoto: 'Fyrri mynd',
    nextPhoto: 'Næsta mynd',
    // Icelandic agrees the noun with the last digit: 1, 21, 31 … take the
    // singular, 11 does not. A function rather than two strings because no pair
    // of strings can express that rule.
    photoCount: (n: number) => `${n} ${n % 10 === 1 && n % 100 !== 11 ? 'mynd' : 'myndir'}`,
    empty: {
      title: 'Engin myndasöfn enn',
      body: 'Hér birtast myndir frá viðburðum SVEF um leið og þær eru komnar í hús.',
    },
  },
  membership: {
    title: 'Skráning',
    // The design writes the fee as "23.900 kr. / ár".
    perYear: '/ ár',
    form: {
      title: 'Sækja um aðild',
      note: 'Við sendum greiðsluupplýsingar í tölvupósti innan tveggja virkra daga.',
      // Says, before anything is typed, that the button opens an email rather
      // than filing an application. The form must not imply a submission
      // channel that does not exist yet.
      emailOnly:
        'Umsóknir berast okkur í tölvupósti sem stendur. Þegar þú sendir umsóknina opnast hún tilbúin í tölvupóstforritinu þínu — hún telst ekki móttekin fyrr en þú sendir póstinn sjálf/ur.',
      name: 'Nafn',
      email: 'Netfang',
      company: 'Fyrirtæki',
      companyHint: 'Valfrjálst fyrir einstaklingsaðild',
      type: 'Tegund aðildar',
      typeIndividual: 'Einstaklingsaðild',
      typeCompany: 'Fyrirtækjaaðild',
      submit: 'Senda umsókn',
      errors: {
        summary: 'Það vantar eitthvað í umsóknina:',
        name: 'Sláðu inn nafn.',
        email: 'Sláðu inn netfang.',
        emailInvalid: 'Netfangið virðist ekki vera rétt skrifað.',
        company: 'Sláðu inn nafn fyrirtækisins.',
      },
      // Shown after the mail client has been opened. Deliberately never says
      // the application was received.
      opened:
        'Umsóknin ætti að hafa opnast í tölvupóstforritinu þínu. Hún berst okkur ekki fyrr en þú sendir póstinn.',
      fallback: 'Opnaðist ekkert? Opna umsóknina handvirkt',
      mailSubject: 'Umsókn um aðild að SVEF',
    },
  },
  footer: {
    rights: 'Öll réttindi áskilin',
    blurb:
      'SVEF er félag fólks sem starfar við vefinn á Íslandi. Við miðlum þekkingu og eflum fagleg vinnubrögð í greininni.',
  },
}
