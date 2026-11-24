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
  reviewBillingTo: (company: string, kennitala: string) => string
  // submit
  termsTitle: string
  termsDraftNote: string
  termsVersion: (v: string) => string
  termsBody: string[]
  termsAccept: (v: string) => string
  termsAcceptedAlready: (v: string) => string
  submitButton: string
  submitWorking: string
  submitEarlyExplain: (lastDay: string, early: string, regular: string) => string
  submitEarlyOver: string
  submitBlockers: string
  submitBlockTerms: string
  submitBlockLock: string
  submitBlockNotOpen: (opens: string) => string
  submitBlockClosed: string
  submitBlockNothing: string
  verifyTitle: string
  verifyBody: (email: string) => string
  verifyResend: string
  verifySending: string
  verifySent: string
  verifyFailed: string
  dialogTitle: string
  dialogIntro: (n: number) => string
  dialogPrices: string
  dialogTotal: string
  dialogEditable: string
  dialogLocked: string
  dialogWithdrawEarly: (lastDay: string) => string
  dialogWithdrawRegular: string
  dialogCancel: string
  dialogConfirm: string
  entriesTitle: string
  entryLockedPrice: (amount: string, tier: string) => string
  tierEarly: string
  tierRegular: string
  submitThis: (category: string) => string
  doneTitle: (n: number) => string
  doneLocked: string
  doneReceipt: (email: string) => string
  doneReceiptFailed: string
  doneAlready: string
  doneSkipped: string
  skipReason: Record<'project_incomplete' | 'entry_incomplete', string>
  submitErrors: Record<string, string>
  submittedNote: string
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
    `Submit by the end of ${d} to get the early-bird price, ${e} instead of ${r}`,
  reviewGoTo: 'Go to',
  reviewBillingTo: (c, k) => `An invoice will be sent to ${c}, kt. ${k}, after submissions close.`,
  termsTitle: 'Competition terms',
  termsDraftNote: 'Draft text. SVEF will replace it with the final terms before submissions open.',
  termsVersion: (v) => `Version ${v}`,
  termsBody: [
    'By submitting you confirm that you are entitled to enter the project, that the answers are true, and that the people credited have agreed to be named.',
    'Entry fees are invoiced after submissions close. Fees are not refunded, including when an entry is withdrawn or found ineligible.',
    'The jury judges the project as submitted. After submitting, some answers are locked; changing them means withdrawing the entry.',
  ],
  termsAccept: (v) => `I accept the competition terms (version ${v})`,
  termsAcceptedAlready: (v) => `You have accepted the competition terms (version ${v}) for this project.`,
  submitButton: 'Submit',
  submitWorking: 'Submitting…',
  submitEarlyExplain: (d, e, r) =>
    `Submit by the end of ${d} to secure the early-bird price, ${e} instead of ${r}`,
  submitEarlyOver: 'The early-bird period has ended, so the regular price is locked when you submit.',
  submitBlockers: 'Before you can submit',
  submitBlockTerms: 'Accept the competition terms',
  submitBlockLock: 'Someone else is editing the project, so you can’t submit right now.',
  submitBlockNotOpen: (d) => `Submissions open on ${d}.`,
  submitBlockClosed: 'Submissions have closed.',
  submitBlockNothing: 'There is nothing left to submit.',
  verifyTitle: 'Verify your email to submit',
  verifyBody: (e) =>
    `You can fill in the project without verifying, but to submit it we need to know ${e} is yours. Open the link in the email we sent you.`,
  verifyResend: 'Send the confirmation email again',
  verifySending: 'Sending…',
  verifySent: 'Sent. Check your inbox.',
  verifyFailed: 'Could not send the email. Try again in a moment.',
  dialogTitle: 'Submit your entries?',
  dialogIntro: (n) =>
    n === 1
      ? 'You are about to submit 1 entry. Its price is locked as soon as you submit.'
      : `You are about to submit ${n} entries. Their prices are locked as soon as you submit.`,
  dialogPrices: 'Price you lock in',
  dialogTotal: 'Total',
  dialogEditable: 'Still editable after submitting',
  dialogLocked: 'Locked once submitted',
  dialogWithdrawEarly: (d) =>
    `Changing a locked answer means withdrawing the entry, and that gives up the early-bird price: if you submit again after ${d} it costs the regular price.`,
  dialogWithdrawRegular:
    'Changing a locked answer means withdrawing the entry. Submitting it again is priced by the date you do it.',
  dialogCancel: 'Cancel',
  dialogConfirm: 'Submit',
  entriesTitle: 'Your entries',
  entryLockedPrice: (a, t) => `${a} (${t}, locked)`,
  tierEarly: 'early-bird price',
  tierRegular: 'regular price',
  submitThis: (c) => `Submit ${c}`,
  doneTitle: (n) => (n === 1 ? '1 entry submitted' : `${n} entries submitted`),
  doneLocked: 'The prices are locked and will not change.',
  doneReceipt: (e) => `A receipt has been sent to ${e}.`,
  doneReceiptFailed: 'The entries are submitted, but the receipt email could not be sent.',
  doneAlready: 'These entries were already submitted.',
  doneSkipped: 'Not submitted',
  skipReason: {
    project_incomplete: 'the project still has something missing',
    entry_incomplete: 'this entry still has something missing',
  },
  submitErrors: {
    email_unverified: 'Verify your email address to submit.',
    intake_closed: 'Submissions have closed.',
    intake_not_open: 'Submissions have not opened yet.',
    billing_required: 'Choose who is invoiced before submitting.',
    terms_required: 'Accept the competition terms to submit.',
    nothing_to_submit: 'There is nothing left to submit.',
    lock_required: 'Someone else is editing the project, so it could not be submitted.',
    forbidden: 'You can’t submit this project.',
    not_found: 'The project could not be found.',
    unexpected: 'Something went wrong and nothing was submitted. Try again.',
  },
  submittedNote:
    'Some answers are now locked, and the rest keep saving as you type. Changes to those are logged.',
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
    `Sendu inn fyrir lok ${d} til að fá snemmskráningarverð, ${e} í stað ${r}`,
  reviewGoTo: 'Fara í',
  reviewBillingTo: (c, k) =>
    `Reikningur verður sendur á ${c}, kt. ${k}, eftir að innsendingum lýkur.`,
  termsTitle: 'Skilmálar keppninnar',
  termsDraftNote: 'Drög að texta. SVEF skiptir honum út fyrir endanlega skilmála áður en innsendingar opna.',
  termsVersion: (v) => `Útgáfa ${v}`,
  termsBody: [
    'Með innsendingu staðfestir þú að þú megir senda verkefnið inn, að svörin séu rétt og að þau sem nefnd eru hafi samþykkt að vera nafngreind.',
    'Þátttökugjald er innheimt eftir að innsendingum lýkur. Gjöld eru ekki endurgreidd, líka þegar innsending er dregin til baka eða reynist ekki gjaldgeng.',
    'Dómnefnd metur verkefnið eins og það var sent inn. Eftir innsendingu læsast sum svör og til að breyta þeim þarf að draga innsendinguna til baka.',
  ],
  termsAccept: (v) => `Ég samþykki skilmála keppninnar (útgáfa ${v})`,
  termsAcceptedAlready: (v) => `Þú hefur samþykkt skilmála keppninnar (útgáfa ${v}) fyrir þetta verkefni.`,
  submitButton: 'Senda inn',
  submitWorking: 'Sendi inn…',
  submitEarlyExplain: (d, e, r) =>
    `Sendu inn fyrir lok ${d} til að tryggja snemmskráningarverðið, ${e} í stað ${r}`,
  submitEarlyOver: 'Snemmskráningu er lokið, svo almennt verð festist þegar þú sendir inn.',
  submitBlockers: 'Áður en þú getur sent inn',
  submitBlockTerms: 'Samþykktu skilmála keppninnar',
  submitBlockLock: 'Einhver annar er að breyta verkefninu og því er ekki hægt að senda inn núna.',
  submitBlockNotOpen: (d) => `Innsendingar opna ${d}.`,
  submitBlockClosed: 'Innsendingum er lokið.',
  submitBlockNothing: 'Ekkert er eftir til að senda inn.',
  verifyTitle: 'Staðfestu netfangið til að senda inn',
  verifyBody: (e) =>
    `Þú getur fyllt út verkefnið án staðfestingar en til að senda það inn þurfum við að vita að ${e} sé þitt. Opnaðu tengilinn í póstinum sem við sendum þér.`,
  verifyResend: 'Senda staðfestingarpóstinn aftur',
  verifySending: 'Sendi…',
  verifySent: 'Sent. Athugaðu pósthólfið.',
  verifyFailed: 'Ekki tókst að senda póstinn. Reyndu aftur eftir augnablik.',
  dialogTitle: 'Senda innsendingarnar inn?',
  dialogIntro: (n) =>
    n === 1
      ? 'Þú ert að fara að senda 1 innsendingu inn. Verðið festist um leið og þú sendir inn.'
      : `Þú ert að fara að senda ${n} innsendingar inn. Verðið festist um leið og þú sendir inn.`,
  dialogPrices: 'Verðið sem festist',
  dialogTotal: 'Samtals',
  dialogEditable: 'Hægt að breyta eftir innsendingu',
  dialogLocked: 'Læst eftir innsendingu',
  dialogWithdrawEarly: (d) =>
    `Til að breyta læstu svari þarf að draga innsendinguna til baka og þá fellur snemmskráningarverðið niður: ef hún er send aftur inn eftir ${d} kostar hún almennt verð.`,
  dialogWithdrawRegular:
    'Til að breyta læstu svari þarf að draga innsendinguna til baka. Ný innsending er verðlögð eftir því hvaða dag hún er send.',
  dialogCancel: 'Hætta við',
  dialogConfirm: 'Senda inn',
  entriesTitle: 'Innsendingarnar þínar',
  entryLockedPrice: (a, t) => `${a} (${t}, fest)`,
  tierEarly: 'snemmskráningarverð',
  tierRegular: 'almennt verð',
  submitThis: (c) => `Senda inn ${c}`,
  doneTitle: (n) => (n === 1 ? '1 innsending send inn' : `${n} innsendingar sendar inn`),
  doneLocked: 'Verðið er fest og breytist ekki.',
  doneReceipt: (e) => `Kvittun hefur verið send á ${e}.`,
  doneReceiptFailed: 'Innsendingarnar eru komnar inn en ekki tókst að senda kvittunina.',
  doneAlready: 'Þessar innsendingar voru þegar sendar inn.',
  doneSkipped: 'Ekki send inn',
  skipReason: {
    project_incomplete: 'enn vantar eitthvað í verkefnið',
    entry_incomplete: 'enn vantar eitthvað í þessa innsendingu',
  },
  submitErrors: {
    email_unverified: 'Staðfestu netfangið þitt til að senda inn.',
    intake_closed: 'Innsendingum er lokið.',
    intake_not_open: 'Innsendingar eru ekki opnar enn.',
    billing_required: 'Veldu greiðanda reiknings áður en þú sendir inn.',
    terms_required: 'Samþykktu skilmála keppninnar til að senda inn.',
    nothing_to_submit: 'Ekkert er eftir til að senda inn.',
    lock_required: 'Einhver annar er að breyta verkefninu og því var ekki hægt að senda inn.',
    forbidden: 'Þú getur ekki sent þetta verkefni inn.',
    not_found: 'Verkefnið fannst ekki.',
    unexpected: 'Eitthvað fór úrskeiðis og ekkert var sent inn. Reyndu aftur.',
  },
  submittedNote:
    'Sum svör eru nú læst en hin vistast áfram um leið og þú skrifar. Breytingar á þeim eru skráðar.',
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
