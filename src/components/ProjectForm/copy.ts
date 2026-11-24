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
}

export type SectionId =
  | 'categories'
  | 'project'
  | 'questions'
  | 'people'
  | 'image'
  | 'billing'
  | 'review'

const en: Strings = {
  pageTitle: 'Your submission',
  newTitle: 'New submission',
  newLead: 'Start a project. You can enter it in one or more categories, and your answers save as you type.',
  newButton: 'Create project',
  signedOutTitle: 'Sign in to continue',
  signedOutBody: 'You need an account to work on a submission.',
  outline: 'Sections',
  sections: {
    categories: { title: 'Categories', intro: 'Choose where to enter the project.' },
    project: { title: 'The project' },
    questions: { title: 'Category questions', intro: 'Only what the chosen categories ask for.' },
    people: { title: 'People and credit' },
    image: { title: 'Image' },
    billing: { title: 'Billing', intro: 'Choosing who is invoiced arrives in a later step.' },
    review: { title: 'Review and submit', intro: 'Reviewing and submitting arrives in a later step.' },
  },
  complete: 'complete',
  incomplete: 'not complete',
  saving: 'Saving…',
  saved: 'Saved',
  notSaved: 'Not saved',
  retry: 'Retry',
  notSavedLock: 'Not saved — someone else is editing',
  notSavedCheck: 'Not saved — check the fields marked below',
  lockHeld: (name, since) => `${name} is editing this project (since ${since}). You can read it, but not change it.`,
  lockAcquiring: 'Opening the project for editing…',
  lockError: 'Could not reach the server, so the project is read-only for now.',
  lockTryAgain: 'Check again',
  lockLost: 'Someone else started editing while you were away. What you typed is kept here and will be saved if you get the project back.',
  lockRecovered: 'You are editing again. Your latest changes have been saved.',
  whyLocked: 'Why can’t I edit this?',
  whyLockedSubmitted:
    'This was locked when you submitted the project, so the jury judges what you submitted. To change it you would withdraw the entry, which gives up the early-bird price.',
  whyLockedClosed: 'Submissions have closed, so nothing can be changed unless SVEF asks you to fix something.',
  whyLockedLock: 'Someone else is editing the project right now.',
  add: 'Add',
  remove: 'Remove',
  addPerson: 'Add a person',
  addLink: 'Add a link',
  addLogin: 'Add login details',
  canEdit: 'Can edit (invited by email)',
  forcedOn: 'Always on for the Logged-In Platform category.',
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
  newLead: 'Byrjaðu á verkefni. Þú getur skráð það í einn eða fleiri flokka og svörin vistast um leið og þú skrifar.',
  newButton: 'Stofna verkefni',
  signedOutTitle: 'Skráðu þig inn til að halda áfram',
  signedOutBody: 'Þú þarft aðgang til að vinna að innsendingu.',
  outline: 'Hlutar',
  sections: {
    categories: { title: 'Flokkar', intro: 'Veldu í hvaða flokka verkefnið er sent.' },
    project: { title: 'Verkefnið' },
    questions: { title: 'Spurningar flokkanna', intro: 'Aðeins það sem valdir flokkar biðja um.' },
    people: { title: 'Fólk og þakkir' },
    image: { title: 'Mynd' },
    billing: { title: 'Greiðsla', intro: 'Val á greiðanda kemur í síðara skrefi.' },
    review: { title: 'Yfirlit og innsending', intro: 'Yfirlit og innsending kemur í síðara skrefi.' },
  },
  complete: 'lokið',
  incomplete: 'ólokið',
  saving: 'Vista…',
  saved: 'Vistað',
  notSaved: 'Ekki vistað',
  retry: 'Reyna aftur',
  notSavedLock: 'Ekki vistað — einhver annar er að breyta',
  notSavedCheck: 'Ekki vistað — athugaðu reitina hér fyrir neðan',
  lockHeld: (name, since) => `${name} er að breyta verkefninu (frá ${since}). Þú getur skoðað það en ekki breytt því.`,
  lockAcquiring: 'Opna verkefnið til breytinga…',
  lockError: 'Náði ekki sambandi við þjóninn, verkefnið er skrifvarið í bili.',
  lockTryAgain: 'Athuga aftur',
  lockLost: 'Einhver annar byrjaði að breyta á meðan þú varst í burtu. Það sem þú skrifaðir geymist hér og vistast ef þú færð verkefnið aftur.',
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
  forcedOn: 'Alltaf virkt í flokknum Vefur með innskráningu.',
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
