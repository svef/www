import type { BulkSkipReason } from '@/lib/awards/bulk/plan'
import type { Locale } from '@/lib/i18n'

/** Interface copy for the dashboard's bulk actions (svef/www#166). Presentation lives in `Dashboard.module.scss`. */

export type BulkKindName = 'submit' | 'withdraw' | 'billing'

export type BulkCopy = {
  barLabel: string
  actions: Record<BulkKindName, string>
  rowWithdraw: string
  rowWithdrawLabel: (project: string, category: string) => string
  title: Record<BulkKindName, string>
  planning: string
  planFailed: string
  willHeading: Record<BulkKindName, string>
  submitIntro: (n: number) => string
  withdrawIntro: (n: number) => string
  billingIntro: (n: number) => string
  total: string
  tierEarly: string
  tierRegular: string
  resubmitTag: string
  withdrawEarlyBeforeEnd: (lastDay: string, amount: string) => string
  withdrawEarlyAfterEnd: (amount: string) => string
  withdrawRegular: (amount: string) => string
  billingLabel: string
  billingChoose: string
  billingNone: string
  billingTo: (company: string) => string
  skippedHeading: (n: number) => string
  nothing: string
  openProject: string
  reasons: Record<BulkSkipReason, string>
  lockedBy: (name: string) => string
  confirm: Record<BulkKindName, (n: number) => string>
  cancel: string
  close: string
  working: string
  resultHeading: string
  doneHeading: Record<BulkKindName, (n: number) => string>
  noneDone: string
  receipts: (sent: number, failed: number) => string
  runFailed: string
  untitled: string
}

const en: BulkCopy = {
  barLabel: 'Actions for the selected entries',
  actions: { submit: 'Submit', withdraw: 'Withdraw', billing: 'Change billing profile' },
  rowWithdraw: 'Withdraw',
  rowWithdrawLabel: (p, c) => `Withdraw ${c} in ${p}`,
  title: {
    submit: 'Submit the selected entries',
    withdraw: 'Withdraw the selected entries',
    billing: 'Change billing profile',
  },
  planning: 'Checking what can be done…',
  planFailed: 'Could not check the selection. Try again.',
  willHeading: {
    submit: 'Will be submitted',
    withdraw: 'Will be withdrawn',
    billing: 'Will be changed',
  },
  submitIntro: (n) =>
    `${n} ${n === 1 ? 'entry' : 'entries'} will be submitted. Prices lock now, and a receipt is emailed for each project.`,
  withdrawIntro: (n) =>
    `${n} ${n === 1 ? 'entry' : 'entries'} will be withdrawn. Their prices stop being locked, and they are not invoiced unless you submit them again.`,
  billingIntro: (n) => `${n} ${n === 1 ? 'project' : 'projects'} will change who is invoiced.`,
  total: 'Total locked price',
  tierEarly: 'early-bird price',
  tierRegular: 'regular price',
  resubmitTag: 'submitted again',
  withdrawEarlyBeforeEnd: (d, a) =>
    `Early-bird price. If you submit it again after ${d} it will cost ${a}${a.endsWith('.') ? '' : '.'}`,
  withdrawEarlyAfterEnd: (a) =>
    `Early-bird price, no longer available. If you submit it again it will cost ${a}${a.endsWith('.') ? '' : '.'}`,
  withdrawRegular: (a) => `Regular price. If you submit it again it will cost ${a}${a.endsWith('.') ? '' : '.'}`,
  billingLabel: 'Invoice to',
  billingChoose: 'Choose a billing profile',
  billingNone: 'You have no billing profiles yet. Add one in a project’s billing section.',
  billingTo: (c) => `Invoiced to ${c}`,
  skippedHeading: (n) => `Skipped (${n})`,
  nothing: 'Nothing in this selection can be done. Open a skipped project to fix it.',
  openProject: 'Open project',
  reasons: {
    no_access: 'you do not have access to it',
    locked: 'someone else is editing the project',
    closed: 'submissions have closed',
    not_open: 'submissions have not opened yet',
    email_unverified: 'your email address is not verified',
    no_billing: 'no billing profile is chosen for the project',
    terms_not_accepted: 'the terms are not accepted for this project yet',
    project_incomplete: 'the project still has something missing',
    entry_incomplete: 'this entry still has something missing',
    category_conflict: 'another category in the project cannot be combined with this one',
    not_submittable: 'it is not a draft or a withdrawn entry',
    not_creator: 'only the person who created the project can withdraw its entries',
    not_submitted: 'it is not a submitted entry',
    unchanged: 'it already uses this billing profile',
    profile_not_found: 'the billing profile could not be found',
    unexpected: 'something went wrong',
  },
  lockedBy: (n) => `${n} is editing it`,
  confirm: {
    submit: (n) => `Submit ${n} ${n === 1 ? 'entry' : 'entries'}`,
    withdraw: (n) => `Withdraw ${n} ${n === 1 ? 'entry' : 'entries'}`,
    billing: (n) => `Change ${n} ${n === 1 ? 'project' : 'projects'}`,
  },
  cancel: 'Cancel',
  close: 'Close',
  working: 'Working…',
  resultHeading: 'Result',
  doneHeading: {
    submit: (n) => `${n} ${n === 1 ? 'entry' : 'entries'} submitted`,
    withdraw: (n) => `${n} ${n === 1 ? 'entry' : 'entries'} withdrawn`,
    billing: (n) => `${n} ${n === 1 ? 'project' : 'projects'} changed`,
  },
  noneDone: 'Nothing was changed.',
  receipts: (s, f) =>
    f > 0
      ? `${s} receipt ${s === 1 ? 'email' : 'emails'} sent, ${f} could not be sent.`
      : `${s} receipt ${s === 1 ? 'email' : 'emails'} sent.`,
  runFailed: 'Something went wrong. Check the dashboard for what changed, then try again.',
  untitled: 'Untitled project',
}

const is: BulkCopy = {
  barLabel: 'Aðgerðir fyrir valdar innsendingar',
  actions: { submit: 'Senda inn', withdraw: 'Draga til baka', billing: 'Breyta greiðanda' },
  rowWithdraw: 'Draga til baka',
  rowWithdrawLabel: (p, c) => `Draga ${c} í ${p} til baka`,
  title: {
    submit: 'Senda valdar innsendingar inn',
    withdraw: 'Draga valdar innsendingar til baka',
    billing: 'Breyta greiðanda',
  },
  planning: 'Athuga hvað er hægt að gera…',
  planFailed: 'Ekki tókst að athuga valið. Reyndu aftur.',
  willHeading: {
    submit: 'Verður sent inn',
    withdraw: 'Verður dregið til baka',
    billing: 'Verður breytt',
  },
  submitIntro: (n) =>
    `${n} ${n === 1 ? 'innsending verður send' : 'innsendingar verða sendar'} inn. Verðið er fest núna og kvittun er send í tölvupósti fyrir hvert verkefni.`,
  withdrawIntro: (n) =>
    `${n} ${n === 1 ? 'innsending verður dregin' : 'innsendingar verða dregnar'} til baka. Verðið er þá ekki lengur fest og þær eru ekki rukkaðar nema þú sendir þær aftur inn.`,
  billingIntro: (n) => `Greiðanda reiknings verður breytt í ${n} ${n === 1 ? 'verkefni' : 'verkefnum'}.`,
  total: 'Fest verð samtals',
  tierEarly: 'snemmskráningarverð',
  tierRegular: 'almennt verð',
  resubmitTag: 'send aftur inn',
  withdrawEarlyBeforeEnd: (d, a) =>
    `Snemmskráningarverð. Ef hún er send aftur inn eftir ${d} kostar hún ${a}${a.endsWith('.') ? '' : '.'}`,
  withdrawEarlyAfterEnd: (a) =>
    `Snemmskráningarverð sem er ekki lengur í boði. Ef hún er send aftur inn kostar hún ${a}${a.endsWith('.') ? '' : '.'}`,
  withdrawRegular: (a) => `Almennt verð. Ef hún er send aftur inn kostar hún ${a}${a.endsWith('.') ? '' : '.'}`,
  billingLabel: 'Reikningur á',
  billingChoose: 'Veldu greiðanda',
  billingNone: 'Þú átt enn enga greiðendur. Bættu einum við í greiðandahluta verkefnis.',
  billingTo: (c) => `Reikningur á ${c}`,
  skippedHeading: (n) => `Sleppt (${n})`,
  nothing: 'Ekkert í þessu vali er hægt að gera. Opnaðu verkefni sem var sleppt til að laga það.',
  openProject: 'Opna verkefni',
  reasons: {
    no_access: 'þú hefur ekki aðgang að því',
    locked: 'einhver annar er að breyta verkefninu',
    closed: 'innsendingum er lokið',
    not_open: 'innsendingar eru ekki opnar enn',
    email_unverified: 'netfangið þitt er ekki staðfest',
    no_billing: 'enginn greiðandi er valinn fyrir verkefnið',
    terms_not_accepted: 'skilmálar eru ekki samþykktir fyrir þetta verkefni',
    project_incomplete: 'enn vantar eitthvað í verkefnið',
    entry_incomplete: 'enn vantar eitthvað í þessa innsendingu',
    category_conflict: 'annar flokkur í verkefninu getur ekki verið með þessum',
    not_submittable: 'hún er hvorki drög né innsending sem var dregin til baka',
    not_creator: 'aðeins sá sem stofnaði verkefnið getur dregið innsendingar þess til baka',
    not_submitted: 'hún er ekki innsend',
    unchanged: 'verkefnið notar þegar þennan greiðanda',
    profile_not_found: 'greiðandinn fannst ekki',
    unexpected: 'eitthvað fór úrskeiðis',
  },
  lockedBy: (n) => `${n} er að breyta því`,
  confirm: {
    submit: (n) => `Senda ${n} inn`,
    withdraw: (n) => `Draga ${n} til baka`,
    billing: (n) => `Breyta greiðanda (${n})`,
  },
  cancel: 'Hætta við',
  close: 'Loka',
  working: 'Vinn…',
  resultHeading: 'Niðurstaða',
  doneHeading: {
    submit: (n) => `${n} ${n === 1 ? 'innsending send' : 'innsendingar sendar'} inn`,
    withdraw: (n) => `${n} ${n === 1 ? 'innsending dregin' : 'innsendingar dregnar'} til baka`,
    billing: (n) => `${n} ${n === 1 ? 'verkefni breytt' : 'verkefnum breytt'}`,
  },
  noneDone: 'Engu var breytt.',
  receipts: (s, f) =>
    f > 0
      ? `${s} ${s === 1 ? 'kvittun send' : 'kvittanir sendar'}, ekki tókst að senda ${f}.`
      : `${s} ${s === 1 ? 'kvittun send' : 'kvittanir sendar'}.`,
  runFailed: 'Eitthvað fór úrskeiðis. Skoðaðu hvað breyttist á yfirlitinu og reyndu aftur.',
  untitled: 'Verkefni án titils',
}

export const bulkCopy: Record<Locale, BulkCopy> = { en, is }
