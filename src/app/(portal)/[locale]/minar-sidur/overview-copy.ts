import type { Locale } from '@/lib/i18n'
import { formatDate } from '@/lib/locale-format'

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)
const day = (iso: string, locale: Locale) => formatDate(iso, locale)

/** Interface copy for the portal's overview (Mínar síður → Yfirlit). */
export const overviewCopy = {
  is: {
    title: 'Yfirlit',
    lede: 'Það sem bíður þín í Vefverðlaununum, frestirnir og verkefnin þín í stuttu máli.',
    unverifiedTitle: 'Staðfestu netfangið þitt',
    unverified: (email: string) =>
      `Þú getur unnið í drögum strax, en til að senda inn þarf netfangið ${email} að vera staðfest. Hlekkurinn er í tölvupóstinum sem við sendum þegar aðgangurinn var stofnaður.`,
    deadlinesTitle: 'Frestir',
    earlyBird: 'Síðasti dagur snemmskráningar',
    closes: 'Síðasti dagur innsendinga',
    passed: 'liðinn',
    attentionTitle: 'Þarfnast athygli',
    attentionNone: 'Ekkert bíður þín núna.',
    request: (count: number, deadline: string, overdue: boolean, locale: Locale) =>
      overdue
        ? `Frestur við ${plural(count, 'beiðni', 'beiðnum')} SVEF rann út ${day(deadline, locale)}`
        : `SVEF biður um breytingar fyrir ${day(deadline, locale)}`,
    drafts: (count: number, missing: number, deadline: string, locale: Locale) =>
      `${count} ${plural(count, 'flokkur', 'flokkar')} í drögum` +
      (missing > 0 ? `, ${missing} ${plural(missing, 'atriði vantar', 'atriði vantar')}` : ', tilbúið til innsendingar') +
      `. Næsti frestur er ${day(deadline, locale)}.`,
    untitled: 'Verkefni án heitis',
    allProjects: 'Öll verkefnin mín',
    summaryTitle: 'Í stuttu máli',
    stats: { projects: 'Verkefni', submitted: 'Innsendar færslur', drafts: 'Færslur í drögum' },
    startTitle: 'Hafist handa',
    startEmpty:
      'Þú átt ekkert verkefni enn. Stofnaðu verkefni, fylltu út upplýsingarnar og veldu flokkana sem það á heima í. Þú getur vistað og haldið áfram síðar.',
    start: 'Þú getur bætt við verkefni hvenær sem er á meðan tekið er við innsendingum.',
    newProject: 'Nýtt verkefni',
    categories: 'Flokkar, verð og reglur',
    account: 'Aðgangurinn þinn',
  },
  en: {
    title: 'Overview',
    lede: 'What is waiting for you in the Web Awards, the deadlines, and your projects at a glance.',
    unverifiedTitle: 'Confirm your email address',
    unverified: (email: string) =>
      `You can work on drafts straight away, but ${email} needs to be confirmed before you can submit. The link is in the email we sent when the account was created.`,
    deadlinesTitle: 'Deadlines',
    earlyBird: 'Last day of the early-bird price',
    closes: 'Last day for submissions',
    passed: 'passed',
    attentionTitle: 'Needs your attention',
    attentionNone: 'Nothing is waiting for you right now.',
    request: (count: number, deadline: string, overdue: boolean, locale: Locale) =>
      overdue
        ? `The deadline for SVEF’s ${plural(count, 'request', 'requests')} passed on ${day(deadline, locale)}`
        : `SVEF has asked for changes by ${day(deadline, locale)}`,
    drafts: (count: number, missing: number, deadline: string, locale: Locale) =>
      `${count} ${plural(count, 'category', 'categories')} in draft` +
      (missing > 0 ? `, ${missing} ${plural(missing, 'item', 'items')} missing` : ', ready to submit') +
      `. The next deadline is ${day(deadline, locale)}.`,
    untitled: 'Untitled project',
    allProjects: 'All my projects',
    summaryTitle: 'At a glance',
    stats: { projects: 'Projects', submitted: 'Submitted entries', drafts: 'Draft entries' },
    startTitle: 'Get started',
    startEmpty:
      'You have no projects yet. Start one, fill in the details and choose the categories it belongs in. You can save and come back later.',
    start: 'You can add a project at any time while submissions are open.',
    newProject: 'New project',
    categories: 'Categories, prices and rules',
    account: 'Your account',
  },
} as const satisfies Record<Locale, unknown>
