import type { DeadlineLine } from '@/lib/awards/dashboard/deadline'
import type { Locale } from '@/lib/i18n'
import type { EntryStatus } from '@/lib/awards/types'
import { formatDate, formatKr, formatTime } from '@/lib/locale-format'

/** Interface copy for "Mínar innsendingar". Presentation is separate (`Dashboard.module.scss`). */

export const formatMoney = (n: number, locale: Locale) =>
  formatKr(n, locale)

/** 4501012340 -> 450101-2340. Anything that is not ten digits is returned as it came. */
export const formatKennitala = (kt: string) =>
  /^\d{10}$/.test(kt) ? `${kt.slice(0, 6)}-${kt.slice(6)}` : kt

/** "1 February" / "1. febrúar": a day in UTC (Iceland keeps UTC all year), no year. */
export const formatDayMonth = (iso: string, locale: Locale) =>
  formatDate(iso, locale, { year: false })

export const formatDayMonthTime = (iso: string, locale: Locale) =>
  `${formatDayMonth(iso, locale)} ${formatTime(iso)}`

export const formatClock = (iso: string, locale: Locale) => formatTime(iso)

export type DashboardCopy = {
  title: string
  lede: string
  newSubmission: string
  signOut: string
  deadline: (line: DeadlineLine, locale: Locale) => string
  invoiceNote: (total: number, company: string, kennitala: string, locale: Locale) => string
  invoiceNoBilling: (entries: number) => string
  invoiceHeading: string
  emptyTitle: string
  emptyBody: string
  noEntries: string
  needsAction: string
  eyebrow: (year: number) => string
  statusLabel: string
  roleEditor: string
  status: Record<EntryStatus, string>
  priceLocked: string
  priceIfNow: (earlyBird: boolean) => string
  earlyBirdSecured: string
  /** "Missing (5): Project description and 4 more": the count, the first item, and a link to the review. */
  missing: (count: number, first: string) => string
  requestAsked: (deadline: string) => string
  requestOverdue: string
  locked: (name: string, since: string, mine: boolean) => string
  list: {
    caption: string
    filterLabel: string
    search: string
    searchHint: string
    status: string
    category: string
    all: string
    reset: string
    results: (shown: number, total: number) => string
    none: string
    colProject: string
    colCategory: string
    colStatus: string
    colPrice: string
    colNotes: string
    selectAll: string
    colSelect: string
    selectRow: (project: string, category: string) => string
    selected: (n: number) => string
    untitled: string
  }
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)

const en: DashboardCopy = {
  title: 'My submissions',
  lede: 'Your projects and the categories they are entered in, with what needs doing first at the top.',
  newSubmission: 'New submission',
  signOut: 'Sign out',
  deadline: (line, locale) =>
    line.kind === 'early-bird'
      ? `${line.days} ${plural(line.days, 'day', 'days')} left to secure the early-bird price`
      : line.kind === 'closes'
        ? `Submissions close ${formatDayMonth(line.lastDay, locale)}`
        : 'Submissions are closed',
  invoiceNote: (total, company, kt, locale) =>
    `An invoice for ${formatMoney(total, locale)} will be sent to ${company}, kt. ${formatKennitala(kt)}, after submissions close.`,
  invoiceNoBilling: (n) =>
    `${n} submitted ${plural(n, 'entry has', 'entries have')} no billing profile yet, so no invoice can be sent for ${plural(n, 'it', 'them')}.`,
  invoiceHeading: 'Invoices',
  emptyTitle: 'You have no submissions yet',
  emptyBody: 'Start a project, choose the categories it goes in and it will appear here.',
  noEntries: 'No categories chosen yet.',
  needsAction: 'Needs your attention',
  eyebrow: (year) => `Icelandic Web Awards ${year}`,
  statusLabel: 'Deadlines and invoices',
  roleEditor: 'You can edit',
  status: {
    draft: 'Draft',
    submitted: 'Submitted',
    eligibility_pending: 'In eligibility review',
    eligible: 'Eligible',
    ineligible: 'Ineligible',
    needs_clarification: 'Needs clarification',
    withdrawn: 'Withdrawn',
  },
  priceLocked: 'Locked price',
  priceIfNow: (early) => (early ? 'Early-bird price if submitted now' : 'Price if submitted now'),
  earlyBirdSecured: 'Early bird secured',
  missing: (n, first) => `Missing (${n}): ${first}${n > 1 ? ` and ${n - 1} more` : ''}`,
  requestAsked: (d) => `SVEF has asked for changes by ${d}`,
  requestOverdue: 'The deadline for SVEF’s request has passed',
  locked: (name, since, mine) => (mine ? `You are editing (since ${since})` : `${name} is editing (since ${since})`),
  list: {
    caption: 'Your entries',
    filterLabel: 'Filter your entries',
    search: 'Search projects',
    searchHint: 'By project title',
    status: 'Status',
    category: 'Category',
    all: 'All',
    reset: 'Clear filters',
    results: (shown, total) => `Showing ${shown} of ${total} ${plural(total, 'entry', 'entries')}`,
    none: 'No entries match these filters.',
    colProject: 'Project',
    colCategory: 'Category',
    colStatus: 'Status',
    colPrice: 'Price',
    colNotes: 'Notes',
    selectAll: 'Select all shown',
    colSelect: 'Select',
    selectRow: (p, c) => `Select ${p}, ${c}`,
    selected: (n) => `${n} selected`,
    untitled: 'Untitled project',
  },
}

const is: DashboardCopy = {
  title: 'Mínar innsendingar',
  lede: 'Verkefnin þín og flokkarnir sem þau eru send í. Það sem þarf að gera fyrst er efst.',
  newSubmission: 'Ný innsending',
  signOut: 'Skrá út',
  deadline: (line, locale) =>
    line.kind === 'early-bird'
      ? `${line.days} ${plural(line.days, 'dagur', 'dagar')} eftir til að tryggja snemmskráningarverðið`
      : line.kind === 'closes'
        ? `Innsendingum lýkur ${formatDayMonth(line.lastDay, locale)}`
        : 'Innsendingum er lokið',
  invoiceNote: (total, company, kt, locale) =>
    `Reikningur að upphæð ${formatMoney(total, locale)} verður sendur á ${company}, kt. ${formatKennitala(kt)}, eftir að innsendingum lýkur.`,
  invoiceNoBilling: (n) =>
    `${n} ${plural(n, 'innsend færsla er', 'innsendar færslur eru')} án reikningsupplýsinga, svo ekki er hægt að senda reikning fyrir ${plural(n, 'hana', 'þær')}.`,
  invoiceHeading: 'Reikningar',
  emptyTitle: 'Þú átt engar innsendingar enn',
  emptyBody: 'Stofnaðu verkefni og veldu flokkana sem það fer í. Það birtist þá hér.',
  noEntries: 'Enginn flokkur valinn enn.',
  needsAction: 'Þarfnast athygli þinnar',
  eyebrow: (year) => `Vefverðlaunin ${year}`,
  statusLabel: 'Frestir og reikningar',
  roleEditor: 'Þú getur breytt',
  status: {
    draft: 'Drög',
    submitted: 'Innsent',
    eligibility_pending: 'Hæfi í skoðun',
    eligible: 'Gjaldgengt',
    ineligible: 'Ekki gjaldgengt',
    needs_clarification: 'Bíður skýringa',
    withdrawn: 'Dregið til baka',
  },
  priceLocked: 'Fast verð',
  priceIfNow: (early) => (early ? 'Snemmskráningarverð ef sent núna' : 'Verð ef sent núna'),
  earlyBirdSecured: 'Snemmskráning tryggð',
  missing: (n, first) => `Vantar (${n}): ${first}${n > 1 ? ` og ${n - 1} til viðbótar` : ''}`,
  requestAsked: (d) => `SVEF biður um breytingar fyrir ${d}`,
  requestOverdue: 'Frestur við beiðni SVEF er liðinn',
  locked: (name, since, mine) => (mine ? `Þú ert að breyta (síðan ${since})` : `${name} er að breyta (síðan ${since})`),
  list: {
    caption: 'Færslurnar þínar',
    filterLabel: 'Sía færslur',
    search: 'Leita í verkefnum',
    searchHint: 'Eftir heiti verkefnis',
    status: 'Staða',
    category: 'Flokkur',
    all: 'Allt',
    reset: 'Hreinsa síur',
    results: (shown, total) => `Sýni ${shown} af ${total} ${plural(total, 'færslu', 'færslum')}`,
    none: 'Engar færslur passa við síurnar.',
    colProject: 'Verkefni',
    colCategory: 'Flokkur',
    colStatus: 'Staða',
    colPrice: 'Verð',
    colNotes: 'Athugasemdir',
    selectAll: 'Velja allt sem er sýnt',
    colSelect: 'Velja',
    selectRow: (p, c) => `Velja ${p}, ${c}`,
    selected: (n) => `${n} valið`,
    untitled: 'Verkefni án heitis',
  },
}

export const dashboardCopy: Record<Locale, DashboardCopy> = { is, en }
