import type { Locale } from '@/lib/i18n'

/**
 * Interface copy for the project form. Field labels, hints and error messages come
 * from the field definitions (`fields-2026.json`); this is the chrome around them.
 * Icelandic drafts, for the maintainer's review like the rest of the awards copy.
 */
type Strings = {
  pageTitle: string
  newTitle: string
  newLead: string
  newButton: string
  signedOutTitle: string
  signedOutBody: string
  outline: string
  sections: Record<SectionId, { title: string; intro?: string }>
  complete: string
  incomplete: string
  saving: string
  saved: string
  notSaved: string
  retry: string
  notSavedLock: string
  notSavedCheck: string
  lockHeld: (name: string, since: string) => string
  lockAcquiring: string
  lockError: string
  lockTryAgain: string
  lockLost: string
  lockRecovered: string
  whyLocked: string
  whyLockedSubmitted: string
  whyLockedClosed: string
  whyLockedLock: string
  add: string
  remove: string
  addPerson: string
  addLink: string
  addLogin: string
  canEdit: string
  forcedOn: string
  noQuestions: string
  chooseCategories: string
  blockedBecause: string
  pitchTitle: (category: string) => string
  pitchAdd: (category: string) => string
  laterNote: string
  characters: (n: number, max: number) => string
  startDate: string
  endDate: string
  loginValue: string
  loginLabel: string
  loginNotes: string
  categoryError: string
  submittedLocked: string
  status: Record<string, string>
  moreInfo: string
  // categories
  fullDescription: string
  chooseSize: string
  clearGroup: (name: string) => string
  earlyBird: string
  regular: string
  currency: string
  totalTitle: string
  totalEmpty: string
  totalEarlyOpen: (lastDay: string) => string
  totalEarlyClosed: string
  priceLocked: string
  pinned: string
  // project
  loginEncrypted: string
  // people
  rowLabel: Record<'owners' | 'collaborators', (n: number) => string>
  addRow: Record<'owners' | 'collaborators', string>
  removeRow: (label: string) => string
  moveUp: (label: string) => string
  moveDown: (label: string) => string
  moved: (label: string, pos: number, total: number) => string
  emailForEdit: string
  // image
  imageComing: string
  imageRequirements: (w: number, h: number, types: string, mb: number) => string
  imageNote: string
  // billing
  billingProfiles: string
  billingNone: string
  billingAdd: string
  billingEdit: string
  billingDelete: string
  billingSave: string
  billingCancel: string
  billingNote: string
  billingKennitala: string
  billingInUse: string
  billingOther: string
  billingNoneChosen: string
  billingFields: Record<
    'companyName' | 'kennitala' | 'invoiceEmail' | 'address' | 'reference',
    string
  >
  billingFailed: string
  billingDeleteConfirm: (name: string) => string
  billingDeleteYes: string
  billingChosenError: string
  // review
  yes: string
  no: string
  reviewAnswers: string
  reviewLoginSaved: (n: number) => string
  reviewChange: string
  reviewCategory: string
  reviewNotAnswered: string
  reviewMissing: string
  reviewNothingMissing: string
  reviewPrices: string
  reviewTotal: string
  reviewEarlyHint: (lastDay: string, early: string, regular: string) => string
  reviewGoTo: string
  reviewSubmitSlot: string
  reviewBillingTo: (company: string, kennitala: string) => string
}

export type SectionId =
  'categories' | 'project' | 'questions' | 'people' | 'image' | 'billing' | 'review'

const en: Strings = {
  pageTitle: 'Your submission',
  newTitle: 'New submission',
  newLead:
    'Start a project. You can enter it in one or more categories, and your answers save as you type.',
  newButton: 'Create project',
  signedOutTitle: 'Sign in to continue',
  signedOutBody: 'You need an account to work on a submission.',
  outline: 'Sections',
  sections: {
    categories: { title: 'Categories', intro: 'Choose where to enter the project.' },
    project: { title: 'The project' },
    questions: {
      title: 'Category questions',
      intro: 'Only what the chosen categories ask for.',
    },
    people: { title: 'People and credit' },
    image: { title: 'Image', intro: 'A square image to present the project.' },
    billing: { title: 'Billing', intro: 'Choose who SVEF invoices for this project.' },
    review: {
      title: 'Review and submit',
      intro: 'Check your answers and what is still missing.',
    },
  },
  complete: 'complete',
  incomplete: 'not complete',
  saving: 'Saving…',
  saved: 'Saved',
  notSaved: 'Not saved',
  retry: 'Retry',
  notSavedLock: 'Not saved — someone else is editing',
  notSavedCheck: 'Not saved — check the fields marked below',
  lockHeld: (name, since) =>
    `${name} is editing this project (since ${since}). You can read it, but not change it.`,
  lockAcquiring: 'Opening the project for editing…',
  lockError: 'Could not reach the server, so the project is read-only for now.',
  lockTryAgain: 'Check again',
  lockLost:
    'Someone else started editing while you were away. What you typed is kept here and will be saved if you get the project back.',
  lockRecovered: 'You are editing again. Your latest changes have been saved.',
  whyLocked: 'Why can’t I edit this?',
  whyLockedSubmitted:
    'This was locked when you submitted the project, so the jury judges what you submitted. To change it you would withdraw the entry, which gives up the early-bird price.',
  whyLockedClosed:
    'Submissions have closed, so nothing can be changed unless SVEF asks you to fix something.',
  whyLockedLock: 'Someone else is editing the project right now.',
  add: 'Add',
  remove: 'Remove',
  addPerson: 'Add a person',
  addLink: 'Add a link',
  addLogin: 'Add login details',
  canEdit: 'Can edit (invited by email)',
  forcedOn: 'Always on, because the Logged-In Platform category needs a login.',
  noQuestions: 'The chosen categories have no extra questions.',
  chooseCategories: 'Choose at least one category first.',
  blockedBecause: 'Not available together with your current choice.',
  pitchTitle: (c) => `Why this category? (${c})`,
  pitchAdd: (c) => `Add a note for the ${c} jury`,
  laterNote: 'This part is built in a later step.',
  characters: (n, max) => `${n} of ${max} characters`,
  startDate: 'From',
  endDate: 'To',
  loginValue: 'Account or instructions',
  loginLabel: 'Label',
  loginNotes: 'Notes',
  categoryError: 'The categories could not be changed.',
  submittedLocked: 'Submitted',
  moreInfo: 'More information',
  fullDescription: 'Full description',
  chooseSize: 'Choose a size',
  clearGroup: (n) => `Don’t enter in ${n}`,
  earlyBird: 'Early bird',
  regular: 'Regular',
  currency: 'kr.',
  totalTitle: 'Your total',
  totalEmpty: 'Choose a category to see the price.',
  totalEarlyOpen: (d) => `The early-bird price applies if you submit by the end of ${d}.`,
  totalEarlyClosed: 'The early-bird period has ended, so regular prices apply.',
  priceLocked: 'price locked',
  pinned: 'Already submitted. To remove it, withdraw the entry.',
  loginEncrypted: 'Login details are stored encrypted and only used for judging.',
  rowLabel: { owners: (n) => `Owner ${n}`, collaborators: (n) => `Collaborator ${n}` },
  addRow: { owners: 'Add an owner', collaborators: 'Add a collaborator' },
  removeRow: (l) => `Remove ${l}`,
  moveUp: (l) => `Move ${l} up`,
  moveDown: (l) => `Move ${l} down`,
  moved: (l, pos, total) => `${l} moved to position ${pos} of ${total}.`,
  emailForEdit: 'An email is needed to send the invitation.',
  imageComing: 'Coming',
  imageRequirements: (w, h, t, mb) => `Square, ${w} × ${h} px, ${t}, up to ${mb} MB.`,
  imageNote:
    'Uploading the image is not open yet. It is optional, and you will be able to add it here later.',
  billingProfiles: 'Who should be invoiced?',
  billingNone: 'You have no billing profiles yet. Add one to continue.',
  billingAdd: 'Add a billing profile',
  billingEdit: 'Edit',
  billingDelete: 'Delete',
  billingSave: 'Save profile',
  billingCancel: 'Cancel',
  billingNote:
    'The invoice is sent after submissions close, to the email on the profile you choose. Profiles are yours and can be used on other projects.',
  billingKennitala: 'Company or personal kennitala, 10 digits.',
  billingInUse:
    'This profile is chosen on a project, so it can’t be deleted. Choose another one there first.',
  billingOther: 'Chosen by someone else on this project',
  billingNoneChosen: 'No billing profile chosen.',
  billingFields: {
    companyName: 'Company name',
    kennitala: 'Kennitala',
    invoiceEmail: 'Invoice email',
    address: 'Address',
    reference: 'Reference or PO number (optional)',
  },
  billingFailed: 'The billing profile could not be saved.',
  billingDeleteConfirm: (n) => `Delete ${n}?`,
  billingDeleteYes: 'Yes, delete',
  billingChosenError: 'The billing profile could not be chosen.',
  yes: 'Yes',
  no: 'No',
  reviewAnswers: 'Your answers',
  reviewLoginSaved: (n) => `${n} login ${n === 1 ? 'detail' : 'details'} saved, not shown here`,
  reviewChange: 'Change',
  reviewCategory: 'Category',
  reviewNotAnswered: 'Not answered',
  reviewMissing: 'Still to do',
  reviewNothingMissing: 'Nothing is missing.',
  reviewPrices: 'Price per category',
  reviewTotal: 'Total',
  reviewEarlyHint: (d, e, r) =>
    `Submit by the end of ${d} to get the early-bird price, ${e} instead of ${r}.`,
  reviewGoTo: 'Go to',
  reviewSubmitSlot: 'Accepting the terms and submitting arrive in the next step.',
  reviewBillingTo: (c, k) => `An invoice will be sent to ${c}, kt. ${k}, after submissions close.`,
  status: {
    draft: 'Draft',
    submitted: 'Submitted',
    eligibility_pending: 'In eligibility review',
    eligible: 'Eligible',
    ineligible: 'Ineligible',
    needs_clarification: 'Needs clarification',
    withdrawn: 'Withdrawn',
  },
}

const is: Strings = {
  pageTitle: 'Innsendingin þín',
  newTitle: 'Ný innsending',
  newLead:
    'Byrjaðu á verkefni. Þú getur skráð það í einn eða fleiri flokka og svörin vistast um leið og þú skrifar.',
  newButton: 'Stofna verkefni',
  signedOutTitle: 'Skráðu þig inn til að halda áfram',
  signedOutBody: 'Þú þarft aðgang til að vinna að innsendingu.',
  outline: 'Hlutar',
  sections: {
    categories: { title: 'Flokkar', intro: 'Veldu í hvaða flokka verkefnið er sent.' },
    project: { title: 'Verkefnið' },
    questions: {
      title: 'Spurningar flokkanna',
      intro: 'Aðeins það sem valdir flokkar biðja um.',
    },
    people: { title: 'Fólk og þakkir' },
    image: { title: 'Mynd', intro: 'Ferningslaga mynd til að kynna verkefnið.' },
    billing: {
      title: 'Greiðsla',
      intro: 'Veldu hver fær reikning frá SVEF fyrir verkefnið.',
    },
    review: {
      title: 'Yfirlit og innsending',
      intro: 'Skoðaðu svörin þín og hvað vantar enn.',
    },
  },
  complete: 'lokið',
  incomplete: 'ólokið',
  saving: 'Vista…',
  saved: 'Vistað',
  notSaved: 'Ekki vistað',
  retry: 'Reyna aftur',
  notSavedLock: 'Ekki vistað — einhver annar er að breyta',
  notSavedCheck: 'Ekki vistað — athugaðu reitina hér fyrir neðan',
  lockHeld: (name, since) =>
    `${name} er að breyta verkefninu (frá ${since}). Þú getur skoðað það en ekki breytt því.`,
  lockAcquiring: 'Opna verkefnið til breytinga…',
  lockError: 'Náði ekki sambandi við þjóninn, verkefnið er skrifvarið í bili.',
  lockTryAgain: 'Athuga aftur',
  lockLost:
    'Einhver annar byrjaði að breyta á meðan þú varst í burtu. Það sem þú skrifaðir geymist hér og vistast ef þú færð verkefnið aftur.',
  lockRecovered: 'Þú ert aftur að breyta. Nýjustu breytingar hafa verið vistaðar.',
  whyLocked: 'Af hverju get ég ekki breytt þessu?',
  whyLockedSubmitted:
    'Þetta læstist þegar verkefnið var sent inn svo dómnefnd meti það sem var sent. Til að breyta því þarf að draga innsendinguna til baka, en þá fellur snemmskráningarverðið niður.',
  whyLockedClosed: 'Innsendingum er lokið og engu er hægt að breyta nema SVEF biðji um lagfæringu.',
  whyLockedLock: 'Einhver annar er að breyta verkefninu núna.',
  add: 'Bæta við',
  remove: 'Fjarlægja',
  addPerson: 'Bæta við manneskju',
  addLink: 'Bæta við tengli',
  addLogin: 'Bæta við innskráningarupplýsingum',
  canEdit: 'Má breyta (boðið með tölvupósti)',
  forcedOn: 'Alltaf virkt því flokkurinn Aðgangsstýrt verkefni krefst innskráningar.',
  noQuestions: 'Valdir flokkar hafa engar aukaspurningar.',
  chooseCategories: 'Veldu fyrst að minnsta kosti einn flokk.',
  blockedBecause: 'Ekki í boði með núverandi vali.',
  pitchTitle: (c) => `Af hverju þessi flokkur? (${c})`,
  pitchAdd: (c) => `Bæta við athugasemd fyrir dómnefnd í flokknum ${c}`,
  laterNote: 'Þessi hluti kemur í síðara skrefi.',
  characters: (n, max) => `${n} af ${max} stöfum`,
  startDate: 'Frá',
  endDate: 'Til',
  loginValue: 'Aðgangur eða leiðbeiningar',
  loginLabel: 'Heiti',
  loginNotes: 'Athugasemdir',
  categoryError: 'Ekki var hægt að breyta flokkum.',
  submittedLocked: 'Innsent',
  moreInfo: 'Nánari upplýsingar',
  fullDescription: 'Öll lýsingin',
  chooseSize: 'Veldu stærð',
  clearGroup: (n) => `Ekki senda inn í ${n}`,
  earlyBird: 'Snemmskráning',
  regular: 'Almennt verð',
  currency: 'kr.',
  totalTitle: 'Samtals',
  totalEmpty: 'Veldu flokk til að sjá verðið.',
  totalEarlyOpen: (d) => `Snemmskráningarverð gildir ef þú sendir inn fyrir lok ${d}.`,
  totalEarlyClosed: 'Snemmskráningu er lokið og almennt verð gildir.',
  priceLocked: 'verð staðfest',
  pinned: 'Þegar innsent. Dragðu innsendinguna til baka til að fjarlægja flokkinn.',
  loginEncrypted:
    'Innskráningarupplýsingar eru geymdar dulkóðaðar og eingöngu notaðar við dómgæslu.',
  rowLabel: {
    owners: (n) => `Eigandi ${n}`,
    collaborators: (n) => `Samstarfsaðili ${n}`,
  },
  addRow: { owners: 'Bæta við eiganda', collaborators: 'Bæta við samstarfsaðila' },
  removeRow: (l) => `Fjarlægja: ${l}`,
  moveUp: (l) => `Færa upp: ${l}`,
  moveDown: (l) => `Færa niður: ${l}`,
  moved: (l, pos, total) => `${l} er nú númer ${pos} af ${total}.`,
  emailForEdit: 'Netfang þarf til að senda boðið.',
  imageComing: 'Væntanlegt',
  imageRequirements: (w, h, t, mb) => `Ferningslaga, ${w} × ${h} px, ${t}, að hámarki ${mb} MB.`,
  imageNote:
    'Ekki er enn hægt að hlaða upp mynd. Hún er valfrjáls og þú getur bætt henni við hér síðar.',
  billingProfiles: 'Hver á að fá reikninginn?',
  billingNone: 'Þú átt engan greiðanda enn. Bættu einum við til að halda áfram.',
  billingAdd: 'Bæta við greiðanda',
  billingEdit: 'Breyta',
  billingDelete: 'Eyða',
  billingSave: 'Vista greiðanda',
  billingCancel: 'Hætta við',
  billingNote:
    'Reikningur er sendur eftir að innsendingum lýkur, á netfangið á greiðandanum sem þú velur. Greiðendur eru þínir og nýtast í önnur verkefni.',
  billingKennitala: 'Kennitala fyrirtækis eða einstaklings, 10 tölustafir.',
  billingInUse:
    'Þessi greiðandi er valinn á verkefni og því ekki hægt að eyða honum. Veldu annan þar fyrst.',
  billingOther: 'Valinn af öðrum á þessu verkefni',
  billingNoneChosen: 'Enginn greiðandi valinn.',
  billingFields: {
    companyName: 'Nafn fyrirtækis',
    kennitala: 'Kennitala',
    invoiceEmail: 'Netfang fyrir reikninga',
    address: 'Heimilisfang',
    reference: 'Tilvísun eða pöntunarnúmer (valfrjálst)',
  },
  billingFailed: 'Ekki tókst að vista greiðandann.',
  billingDeleteConfirm: (n) => `Eyða ${n}?`,
  billingDeleteYes: 'Já, eyða',
  billingChosenError: 'Ekki tókst að velja greiðandann.',
  yes: 'Já',
  no: 'Nei',
  reviewAnswers: 'Svörin þín',
  reviewLoginSaved: (n) => `${n} innskráningarupplýsingar vistaðar, ekki sýndar hér`,
  reviewChange: 'Breyta',
  reviewCategory: 'Flokkur',
  reviewNotAnswered: 'Ósvarað',
  reviewMissing: 'Eftir að gera',
  reviewNothingMissing: 'Ekkert vantar.',
  reviewPrices: 'Verð eftir flokkum',
  reviewTotal: 'Samtals',
  reviewEarlyHint: (d, e, r) =>
    `Sendu inn fyrir lok ${d} til að fá snemmskráningarverð, ${e} í stað ${r}.`,
  reviewGoTo: 'Fara í',
  reviewSubmitSlot: 'Samþykki skilmála og innsending koma í næsta skrefi.',
  reviewBillingTo: (c, k) =>
    `Reikningur verður sendur á ${c}, kt. ${k}, eftir að innsendingum lýkur.`,
  status: {
    draft: 'Drög',
    submitted: 'Innsent',
    eligibility_pending: 'Í hæfismati',
    eligible: 'Gjaldgengt',
    ineligible: 'Ekki gjaldgengt',
    needs_clarification: 'Þarfnast skýringa',
    withdrawn: 'Dregið til baka',
  },
}

export function getProjectFormCopy(locale: Locale): Strings {
  return locale === 'en' ? en : is
}
export type ProjectFormCopy = Strings
