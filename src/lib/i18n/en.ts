// English UI microcopy. Mirrors the shape of `is.ts`.
export const en = {
  languageName: 'English',
  switchLanguage: 'Switch to Icelandic',
  skipToContent: 'Skip to content',
  close: 'Close',
  nav: {
    awards: 'Web Awards',
    events: 'Events',
    news: 'News',
    about: 'About SVEF',
    membership: 'Membership',
    contact: 'Contact',
  },
  news: {
    title: 'News',
    lead: 'Everything we announce appears here first — social posts always link back.',
    readArticle: 'Read the article',
    backToIndex: 'News',
    empty: {
      title: 'No news yet',
      body: 'Announcements from SVEF appear here as soon as they are made.',
    },
    share: {
      label: 'Share',
      facebook: 'Share on Facebook',
      x: 'Share on X',
      linkedin: 'Share on LinkedIn',
      copyLink: 'Copy link',
      copied: 'Link copied',
    },
  },
  about: {
    title: 'About SVEF',
    boardTitle: 'The board',
    boardCompanyPrefix: 'at',
    faqTitle: 'FAQ',
    bylawsTitle: 'Bylaws',
    bylawsUnavailable:
      'The bylaws could not be loaded right now. They are unchanged and can be read in full at the source:',
    pressTitle: 'Press',
    press: {
      empty: 'No coverage listed yet.',
    },
    brand: {
      title: 'Logo and assets',
      blurb: 'The SVEF logo in black and white, together with the colour palette.',
      empty: 'The asset pack is being prepared. Email svef@svef.is if you need the logo.',
    },
    icelandicOnly: 'Published in Icelandic only',
  },
  photos: {
    title: 'Photos',
    lead: 'Photo albums from SVEF events. Click a photo to enlarge — arrow keys move between photos, Esc closes.',
    viewPhoto: 'View photo',
    prevPhoto: 'Previous photo',
    nextPhoto: 'Next photo',
    photoCount: (n: number) => `${n} ${n === 1 ? 'photo' : 'photos'}`,
    empty: {
      title: 'No albums yet',
      body: 'Photos from SVEF events appear here as soon as they are in.',
    },
  },
  membership: {
    title: 'Membership',
    perYear: '/ year',
    form: {
      title: 'Apply for membership',
      note: 'We send payment details by email within two working days.',
      emailOnly:
        'Applications reach us by email for now. Sending opens the finished application in your email app — it does not reach us until you send that email yourself.',
      name: 'Name',
      email: 'Email',
      company: 'Company',
      companyHint: 'Optional for individual membership',
      type: 'Membership type',
      typeIndividual: 'Individual',
      typeCompany: 'Company',
      submit: 'Send application',
      errors: {
        summary: 'Something is missing from the application:',
        name: 'Enter a name.',
        email: 'Enter an email address.',
        emailInvalid: 'That email address does not look right.',
        company: 'Enter the company name.',
      },
      opened:
        'The application should have opened in your email app. It does not reach us until you send that email.',
      fallback: 'Nothing opened? Open the application manually',
      mailSubject: 'SVEF membership application',
    },
  },
  footer: {
    rights: 'All rights reserved',
    blurb:
      'SVEF is the association of people who build the web in Iceland. We share knowledge and raise professional standards in the field.',
  },
}
