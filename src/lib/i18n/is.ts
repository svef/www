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
    menu: 'Valmynd',
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
    faqTitle: 'Spurt og svarað',
    bylawsTitle: 'Lög SVEF',
    bylawsUnavailable:
      'Ekki tókst að sækja lög SVEF að svo stöddu. Lögin eru óbreytt og má lesa í heild sinni hjá upprunanum:',
    pressTitle: 'Fjölmiðlar',
    press: {
      empty: 'Engin umfjöllun skráð enn.',
    },
    brand: {
      title: 'Merki og efni',
      blurb: 'Merki SVEF í svörtu og hvítu, ásamt litapallettu.',
      empty: 'Skráarsafnið er í vinnslu. Hafðu samband við svef@svef.is ef þig vantar merkið.',
    },
    // Marks a section that is published in Icelandic only as an editorial
    // decision — not a translation that is on its way.
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
