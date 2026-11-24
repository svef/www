import type { Locale } from '@/lib/i18n'

/** A rendered message: plain text first, HTML as the same content with a button. */
export interface EmailContent {
  subject: string
  text: string
  html: string
}

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

interface Copy {
  greeting: (name: string) => string
  signoff: string
  ignore: string
  /** Shown above the raw link, for clients that do not render the button. */
  linkFallback: string
  verification: { subject: string; intro: string; button: string; expiry: string }
  reset: { subject: string; intro: string; button: string; expiry: string }
}

const copy: Record<Locale, Copy> = {
  is: {
    greeting: (name) => (name ? `Sæl/l ${name},` : 'Sæl/l,'),
    signoff: 'Kveðja,\nSVEF, Samtök vefiðnaðarins',
    ignore: 'Ef þú baðst ekki um þetta geturðu hunsað þennan póst.',
    linkFallback: 'Virkar hnappurinn ekki? Afritaðu þennan tengil í vafrann:',
    verification: {
      subject: 'Staðfestu netfangið þitt – Íslensku vefverðlaunin',
      intro:
        'Takk fyrir að stofna aðgang hjá SVEF. Staðfestu netfangið þitt til að geta sent inn verkefni.',
      button: 'Staðfesta netfang',
      expiry: 'Tengillinn gildir í eina klukkustund.',
    },
    reset: {
      subject: 'Endurstilltu lykilorðið þitt – SVEF',
      intro: 'Við fengum beiðni um að endurstilla lykilorðið á aðganginum þínum hjá SVEF.',
      button: 'Velja nýtt lykilorð',
      expiry: 'Tengillinn gildir í eina klukkustund.',
    },
  },
  en: {
    greeting: (name) => (name ? `Hello ${name},` : 'Hello,'),
    signoff: 'Best regards,\nSVEF, the Icelandic Web Industry Association',
    ignore: 'If you did not ask for this, you can ignore this email.',
    linkFallback: 'Button not working? Copy this link into your browser:',
    verification: {
      subject: 'Confirm your email address – Icelandic Web Awards',
      intro:
        'Thanks for creating an account with SVEF. Confirm your email address so you can submit entries.',
      button: 'Confirm email address',
      expiry: 'The link is valid for one hour.',
    },
    reset: {
      subject: 'Reset your password – SVEF',
      intro: 'We received a request to reset the password for your SVEF account.',
      button: 'Choose a new password',
      expiry: 'The link is valid for one hour.',
    },
  },
}

function render(
  locale: Locale,
  name: string,
  url: string,
  part: Copy['verification'],
): EmailContent {
  const c = copy[locale]
  const text = [
    c.greeting(name),
    '',
    part.intro,
    '',
    url,
    '',
    part.expiry,
    c.ignore,
    '',
    c.signoff,
  ].join('\n')

  const paragraph = (value: string) =>
    `<p style="margin:0 0 16px">${escapeHtml(value)}</p>`
  const html = `<!doctype html>
<html lang="${locale}">
<body style="margin:0;padding:24px;background:#fcfbfe;color:#09060c;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5">
<div style="max-width:520px;margin:0 auto">
${paragraph(c.greeting(name))}
${paragraph(part.intro)}
<p style="margin:24px 0"><a href="${escapeHtml(url)}" style="display:inline-block;background:#8917e1;color:#fcfbfe;padding:12px 20px;text-decoration:none;font-weight:bold">${escapeHtml(part.button)}</a></p>
${paragraph(part.expiry)}
<p style="margin:0 0 4px;font-size:14px">${escapeHtml(c.linkFallback)}</p>
<p style="margin:0 0 24px;font-size:14px;word-break:break-all"><a href="${escapeHtml(url)}" style="color:#8917e1">${escapeHtml(url)}</a></p>
${paragraph(c.ignore)}
<p style="margin:0;white-space:pre-line">${escapeHtml(c.signoff)}</p>
</div>
</body>
</html>`
  return { subject: part.subject, text, html }
}

export function verificationEmail(input: {
  locale: Locale
  name: string
  url: string
}): EmailContent {
  return render(input.locale, input.name, input.url, copy[input.locale].verification)
}

export function passwordResetEmail(input: {
  locale: Locale
  name: string
  url: string
}): EmailContent {
  return render(input.locale, input.name, input.url, copy[input.locale].reset)
}

// ── Receipt on submitting ───────────────────────────────────────────────────

export interface ReceiptInput {
  locale: Locale
  name: string
  projectTitle: string
  /** The entries submitted just now, with the price locked for each. */
  entries: { category: string; amount: number; early: boolean }[]
  /** Who the invoice goes to; null if (impossibly) none was chosen. */
  billing: { companyName: string; kennitala: string; invoiceEmail?: string; address?: string } | null
  /** The project's page, for the "view or change" link. */
  url: string
}

const receiptCopy: Record<
  Locale,
  {
    subject: (title: string) => string
    intro: (title: string) => string
    entries: string
    early: string
    regular: string
    total: string
    billing: string
    invoiceNote: string
    editable: string
    link: string
    button: string
  }
> = {
  is: {
    subject: (t) => `Kvittun: ${t} – Íslensku vefverðlaunin`,
    intro: (t) => `Við höfum móttekið innsendinguna „${t}“. Hér er staðfestingin.`,
    entries: 'Innsendir flokkar og staðfest verð',
    early: 'snemmskráningarverð',
    regular: 'almennt verð',
    total: 'Samtals',
    billing: 'Reikningur fer á',
    invoiceNote:
      'Reikningur er sendur eftir að innsendingum lýkur. Ekkert er greitt núna og verðið breytist ekki þótt verðskrá breytist síðar.',
    editable:
      'Þú getur enn breytt tenglum, mynd, aðgangsupplýsingum, samstarfsfólki og nafni í þakkarlista. Til að breyta titli, lýsingu eða svörum flokka þarf að draga innsendinguna til baka, en þá fellur snemmskráningarverðið niður.',
    link: 'Opna innsendinguna:',
    button: 'Opna innsendinguna',
  },
  en: {
    subject: (t) => `Receipt: ${t} – Icelandic Web Awards`,
    intro: (t) => `We have received your submission “${t}”. This is your confirmation.`,
    entries: 'Entries submitted and their locked prices',
    early: 'early-bird price',
    regular: 'regular price',
    total: 'Total',
    billing: 'Invoice goes to',
    invoiceNote:
      'The invoice is sent after submissions close. Nothing is charged now, and the price does not change if prices change later.',
    editable:
      'You can still change links, the image, login details, collaborators and public credit. To change the title, description or category answers you would withdraw the entry, which gives up the early-bird price.',
    link: 'Open your submission:',
    button: 'Open your submission',
  },
}

const money = (amount: number, locale: Locale) =>
  `${new Intl.NumberFormat(locale === 'is' ? 'is-IS' : 'en-GB').format(amount)} kr.`

export function receiptEmail(input: ReceiptInput): EmailContent {
  const { locale } = input
  const c = receiptCopy[locale]
  const g = copy[locale]
  const total = input.entries.reduce((n, e) => n + e.amount, 0)
  const line = (e: ReceiptInput['entries'][number]) =>
    `${e.category}: ${money(e.amount, locale)} (${e.early ? c.early : c.regular})`
  const billingLine = input.billing
    ? [
        input.billing.companyName,
        `kt. ${input.billing.kennitala}`,
        input.billing.invoiceEmail,
        input.billing.address,
      ]
        .filter(Boolean)
        .join(', ')
    : ''

  const text = [
    g.greeting(input.name),
    '',
    c.intro(input.projectTitle),
    '',
    `${c.entries}:`,
    ...input.entries.map((e) => `- ${line(e)}`),
    `${c.total}: ${money(total, locale)}`,
    '',
    ...(billingLine ? [`${c.billing}: ${billingLine}`, ''] : []),
    c.invoiceNote,
    '',
    c.editable,
    '',
    `${c.link} ${input.url}`,
    '',
    g.signoff,
  ].join('\n')

  const paragraph = (value: string) => `<p style="margin:0 0 16px">${escapeHtml(value)}</p>`
  const row = (e: ReceiptInput['entries'][number]) =>
    `<tr><td style="padding:6px 12px 6px 0;border-bottom:1px solid #ddd">${escapeHtml(e.category)}<br><span style="font-size:13px;color:#555">${escapeHtml(e.early ? c.early : c.regular)}</span></td><td style="padding:6px 0;border-bottom:1px solid #ddd;text-align:right;white-space:nowrap">${escapeHtml(money(e.amount, locale))}</td></tr>`
  const html = `<!doctype html>
<html lang="${locale}">
<body style="margin:0;padding:24px;background:#fcfbfe;color:#09060c;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5">
<div style="max-width:520px;margin:0 auto">
${paragraph(g.greeting(input.name))}
${paragraph(c.intro(input.projectTitle))}
<h2 style="margin:24px 0 8px;font-size:18px">${escapeHtml(c.entries)}</h2>
<table style="width:100%;border-collapse:collapse">
${input.entries.map(row).join('\n')}
<tr><td style="padding:8px 12px 8px 0;font-weight:bold">${escapeHtml(c.total)}</td><td style="padding:8px 0;font-weight:bold;text-align:right;white-space:nowrap">${escapeHtml(money(total, locale))}</td></tr>
</table>
${billingLine ? `<p style="margin:16px 0"><strong>${escapeHtml(c.billing)}:</strong> ${escapeHtml(billingLine)}</p>` : ''}
${paragraph(c.invoiceNote)}
${paragraph(c.editable)}
<p style="margin:24px 0"><a href="${escapeHtml(input.url)}" style="display:inline-block;background:#8917e1;color:#fcfbfe;padding:12px 20px;text-decoration:none;font-weight:bold">${escapeHtml(c.button)}</a></p>
<p style="margin:0;white-space:pre-line">${escapeHtml(g.signoff)}</p>
</div>
</body>
</html>`
  return { subject: c.subject(input.projectTitle), text, html }
}

// ── Requests: opened, and the deadline reminder ─────────────────────────────

export interface RequestEmailInput {
  locale: Locale
  name: string
  projectTitle: string
  /** The category the request is about, in the recipient's language. */
  category: string
  /** What staff wrote. */
  message: string
  /** Labels of the fields the request unlocks, in the recipient's language. */
  fields: string[]
  deadlineAt: Date
  /** The project's page, where the request is answered. */
  url: string
}

const requestCopy: Record<
  Locale,
  {
    openedSubject: (title: string) => string
    openedIntro: (title: string, category: string) => string
    reminderSubject: (title: string) => string
    reminderIntro: (title: string, category: string) => string
    message: string
    fields: string
    deadline: string
    deadlineNote: string
    link: string
    button: string
  }
> = {
  is: {
    openedSubject: (t) => `Beiðni frá SVEF: ${t}`,
    openedIntro: (t, c) =>
      `Starfsfólk SVEF hefur sent beiðni vegna innsendingarinnar „${t}“ (${c}).`,
    reminderSubject: (t) => `Áminning: beiðni vegna ${t} rennur út á morgun`,
    reminderIntro: (t, c) =>
      `Frestur til að svara beiðni SVEF vegna innsendingarinnar „${t}“ (${c}) rennur út eftir um sólarhring.`,
    message: 'Skilaboð frá SVEF',
    fields: 'Reitir sem þú getur breytt',
    deadline: 'Frestur',
    deadlineNote:
      'Reitirnir eru opnir til breytinga fram að fresti. Þegar þú ert búin(n) smellirðu á „Merkja sem lokið“ á síðu innsendingarinnar.',
    link: 'Opna beiðnina:',
    button: 'Opna beiðnina',
  },
  en: {
    openedSubject: (t) => `A request from SVEF: ${t}`,
    openedIntro: (t, c) =>
      `SVEF staff have sent a request about your submission “${t}” (${c}).`,
    reminderSubject: (t) => `Reminder: the request about ${t} is due tomorrow`,
    reminderIntro: (t, c) =>
      `The deadline to answer SVEF's request about your submission “${t}” (${c}) is in about 24 hours.`,
    message: 'Message from SVEF',
    fields: 'Fields you can change',
    deadline: 'Deadline',
    deadlineNote:
      'The fields stay open for editing until the deadline. When you are done, press “Mark as done” on the submission page.',
    link: 'Open the request:',
    button: 'Open the request',
  },
}

/** Iceland is UTC all year, so the zone is stated rather than guessed. */
const deadlineText = (at: Date, locale: Locale) =>
  `${new Intl.DateTimeFormat(locale === 'is' ? 'is-IS' : 'en-GB', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(at)} UTC`

function renderRequest(
  input: RequestEmailInput,
  subject: string,
  intro: string,
): EmailContent {
  const { locale } = input
  const c = requestCopy[locale]
  const g = copy[locale]
  const when = deadlineText(input.deadlineAt, locale)
  const text = [
    g.greeting(input.name),
    '',
    intro,
    '',
    `${c.message}:`,
    input.message,
    '',
    ...(input.fields.length ? [`${c.fields}: ${input.fields.join(', ')}`, ''] : []),
    `${c.deadline}: ${when}`,
    '',
    c.deadlineNote,
    '',
    `${c.link} ${input.url}`,
    '',
    g.signoff,
  ].join('\n')
  const paragraph = (value: string) => `<p style="margin:0 0 16px">${escapeHtml(value)}</p>`
  const html = `<!doctype html>
<html lang="${locale}">
<body style="margin:0;padding:24px;background:#fcfbfe;color:#09060c;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5">
<div style="max-width:520px;margin:0 auto">
${paragraph(g.greeting(input.name))}
${paragraph(intro)}
<h2 style="margin:24px 0 8px;font-size:18px">${escapeHtml(c.message)}</h2>
<p style="margin:0 0 16px;padding:12px 16px;border-left:4px solid #8917e1;background:#f1ecf8;white-space:pre-line">${escapeHtml(input.message)}</p>
${input.fields.length ? `<p style="margin:0 0 8px"><strong>${escapeHtml(c.fields)}:</strong> ${escapeHtml(input.fields.join(', '))}</p>` : ''}
<p style="margin:0 0 16px"><strong>${escapeHtml(c.deadline)}:</strong> ${escapeHtml(when)}</p>
${paragraph(c.deadlineNote)}
<p style="margin:24px 0"><a href="${escapeHtml(input.url)}" style="display:inline-block;background:#8917e1;color:#fcfbfe;padding:12px 20px;text-decoration:none;font-weight:bold">${escapeHtml(c.button)}</a></p>
<p style="margin:0;white-space:pre-line">${escapeHtml(g.signoff)}</p>
</div>
</body>
</html>`
  return { subject, text, html }
}

/** Email 4: a request was opened, with its message and deadline. */
export function requestOpenedEmail(input: RequestEmailInput): EmailContent {
  const c = requestCopy[input.locale]
  return renderRequest(
    input,
    c.openedSubject(input.projectTitle),
    c.openedIntro(input.projectTitle, input.category),
  )
}

/** Email 5: the deadline is about 24 hours away. */
export function requestReminderEmail(input: RequestEmailInput): EmailContent {
  const c = requestCopy[input.locale]
  return renderRequest(
    input,
    c.reminderSubject(input.projectTitle),
    c.reminderIntro(input.projectTitle, input.category),
  )
}

export interface DraftReminderInput {
  locale: Locale
  name: string
  /** `early_bird`: the discount ends soon. `closing`: intake closes soon. */
  wave: 'early_bird' | 'closing'
  /** The wave's bound (exclusive); the email names the last day, one millisecond earlier. */
  boundAt: Date
  projects: {
    title: string
    entries: {
      category: string
      /** What submitting costs right now, ISK. */
      price: number
      /** The regular price, ISK (what it costs after the early-bird deadline). */
      priceRegular: number
      missing: string[]
    }[]
  }[]
  url: string
}

const draftCopy: Record<
  Locale,
  {
    subject: Record<'early_bird' | 'closing', string>
    intro: Record<'early_bird' | 'closing', (lastDay: string) => string>
    missing: string
    nothingMissing: string
    price: (now: string, after: string, lastDay: string) => string
    closingPrice: (price: string) => string
    link: string
    button: string
    untitled: string
  }
> = {
  is: {
    subject: {
      early_bird: 'Snemmskráningarverðið rennur út – óinnsend drög hjá SVEF',
      closing: 'Skilafrestur nálgast – óinnsend drög hjá SVEF',
    },
    intro: {
      early_bird: (d) =>
        `Þú átt drög að innsendingum sem hafa ekki verið send inn. Snemmskráningarverð gildir til og með ${d}.`,
      closing: (d) =>
        `Þú átt drög að innsendingum sem hafa ekki verið send inn. Síðasti skiladagur er ${d}.`,
    },
    missing: 'Vantar',
    nothingMissing: 'Tilbúið til innsendingar',
    price: (now, after, d) => `Verð núna: ${now} (${after} eftir ${d})`,
    closingPrice: (p) => `Verð: ${p}`,
    link: 'Opna yfirlitið:',
    button: 'Opna yfirlitið',
    untitled: 'Verkefni án titils',
  },
  en: {
    subject: {
      early_bird: 'The early-bird price is ending – unsubmitted drafts at SVEF',
      closing: 'The deadline is coming up – unsubmitted drafts at SVEF',
    },
    intro: {
      early_bird: (d) =>
        `You have draft entries that have not been submitted. The early-bird price applies until ${d}.`,
      closing: (d) =>
        `You have draft entries that have not been submitted. The last day to submit is ${d}.`,
    },
    missing: 'Missing',
    nothingMissing: 'Ready to submit',
    price: (now, after, d) => `Price now: ${now} (${after} after ${d})`,
    closingPrice: (p) => `Price: ${p}`,
    link: 'Open your overview:',
    button: 'Open your overview',
    untitled: 'Untitled project',
  },
}

const isk = (amount: number, locale: Locale) =>
  `${new Intl.NumberFormat(locale === 'is' ? 'is-IS' : 'en-GB').format(amount)} kr.`

/** Email 6: unsubmitted drafts, a few days before the early-bird deadline or the close. */
export function draftReminderEmail(input: DraftReminderInput): EmailContent {
  const { locale, wave } = input
  const c = draftCopy[locale]
  const g = copy[locale]
  const lastDay = new Intl.DateTimeFormat(locale === 'is' ? 'is-IS' : 'en-GB', {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(input.boundAt.getTime() - 1))
  const intro = c.intro[wave](lastDay)
  const subject = c.subject[wave]
  const priceLine = (e: DraftReminderInput['projects'][number]['entries'][number]) =>
    wave === 'early_bird'
      ? c.price(isk(e.price, locale), isk(e.priceRegular, locale), lastDay)
      : c.closingPrice(isk(e.price, locale))
  const missingLine = (e: DraftReminderInput['projects'][number]['entries'][number]) =>
    e.missing.length ? `${c.missing}: ${e.missing.join(', ')}` : c.nothingMissing

  const text = [
    g.greeting(input.name),
    '',
    intro,
    '',
    ...input.projects.flatMap((p) => [
      p.title || c.untitled,
      ...p.entries.flatMap((e) => [`  - ${e.category}`, `    ${priceLine(e)}`, `    ${missingLine(e)}`]),
      '',
    ]),
    `${c.link} ${input.url}`,
    '',
    g.signoff,
  ].join('\n')

  const paragraph = (value: string) => `<p style="margin:0 0 16px">${escapeHtml(value)}</p>`
  const projectsHtml = input.projects
    .map(
      (p) => `<h2 style="margin:24px 0 8px;font-size:18px">${escapeHtml(p.title || c.untitled)}</h2>
<ul style="margin:0 0 16px;padding-left:20px">
${p.entries
  .map(
    (e) =>
      `<li style="margin:0 0 8px"><strong>${escapeHtml(e.category)}</strong><br>${escapeHtml(priceLine(e))}<br>${escapeHtml(missingLine(e))}</li>`,
  )
  .join('\n')}
</ul>`,
    )
    .join('\n')
  const html = `<!doctype html>
<html lang="${locale}">
<body style="margin:0;padding:24px;background:#fcfbfe;color:#09060c;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5">
<div style="max-width:520px;margin:0 auto">
${paragraph(g.greeting(input.name))}
${paragraph(intro)}
${projectsHtml}
<p style="margin:24px 0"><a href="${escapeHtml(input.url)}" style="display:inline-block;background:#8917e1;color:#fcfbfe;padding:12px 20px;text-decoration:none;font-weight:bold">${escapeHtml(c.button)}</a></p>
<p style="margin:0;white-space:pre-line">${escapeHtml(g.signoff)}</p>
</div>
</body>
</html>`
  return { subject, text, html }
}

// ── Invitation to edit a project ────────────────────────────────────────────

export interface InvitationInput {
  locale: Locale
  /** The invitee, as the inviter wrote it; may be empty. */
  name: string
  inviterName: string
  projectTitle: string
  /** The accept page, carrying the single-use token. */
  url: string
  /** When the link stops working. */
  expiresAt: Date
}

const invitationCopy: Record<
  Locale,
  {
    subject: (inviter: string, title: string) => string
    intro: (inviter: string, title: string) => string
    meaning: string
    account: string
    button: string
    expiry: (date: string) => string
    untitled: string
  }
> = {
  is: {
    subject: (i, t) => `${i} bauð þér að breyta innsendingu: ${t} – Íslensku vefverðlaunin`,
    intro: (i, t) =>
      `${i} hefur boðið þér að breyta innsendingunni „${t}“ í Íslensku vefverðlaununum.`,
    meaning:
      'Ef þú samþykkir geturðu opnað innsendinguna, breytt henni og sent hana inn með þeim sem eru á henni. Þú getur ekki dregið innsendingu til baka, það getur aðeins sá sem stofnaði hana. Þú þarft aðgang hjá SVEF, og getur stofnað hann þegar þú opnar tengilinn.',
    account:
      'Tengillinn er persónulegur. Ekki áframsenda hann nema þú viljir að sá sem fær hann geti breytt innsendingunni.',
    button: 'Skoða boðið',
    expiry: (d) => `Tengillinn gildir til ${d} og aðeins einu sinni.`,
    untitled: 'Innsending án titils',
  },
  en: {
    subject: (i, t) => `${i} invited you to edit a submission: ${t} – Icelandic Web Awards`,
    intro: (i, t) =>
      `${i} has invited you to edit the submission “${t}” in the Icelandic Web Awards.`,
    meaning:
      'If you accept, you can open the submission, edit it and submit it together with the others on it. You cannot withdraw a submission; only the person who created it can. You need an account with SVEF, and you can create one when you open the link.',
    account:
      'The link is personal. Do not forward it unless you want whoever receives it to be able to edit the submission.',
    button: 'View the invitation',
    expiry: (d) => `The link is valid until ${d}, and works once.`,
    untitled: 'Untitled submission',
  },
}

export function invitationEmail(input: InvitationInput): EmailContent {
  const { locale } = input
  const c = invitationCopy[locale]
  const g = copy[locale]
  const title = input.projectTitle.trim() || c.untitled
  const inviter = input.inviterName.trim() || 'SVEF'
  const date = new Intl.DateTimeFormat(locale === 'is' ? 'is-IS' : 'en-GB', {
    dateStyle: 'long',
    timeZone: 'Atlantic/Reykjavik',
  }).format(input.expiresAt)
  const text = [
    g.greeting(input.name),
    '',
    c.intro(inviter, title),
    '',
    c.meaning,
    '',
    input.url,
    '',
    c.expiry(date),
    c.account,
    g.ignore,
    '',
    g.signoff,
  ].join('\n')
  const paragraph = (value: string) => `<p style="margin:0 0 16px">${escapeHtml(value)}</p>`
  const html = `<!doctype html>
<html lang="${locale}">
<body style="margin:0;padding:24px;background:#fcfbfe;color:#09060c;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5">
<div style="max-width:520px;margin:0 auto">
${paragraph(g.greeting(input.name))}
${paragraph(c.intro(inviter, title))}
${paragraph(c.meaning)}
<p style="margin:24px 0"><a href="${escapeHtml(input.url)}" style="display:inline-block;background:#8917e1;color:#fcfbfe;padding:12px 20px;text-decoration:none;font-weight:bold">${escapeHtml(c.button)}</a></p>
${paragraph(c.expiry(date))}
<p style="margin:0 0 4px;font-size:14px">${escapeHtml(g.linkFallback)}</p>
<p style="margin:0 0 24px;font-size:14px;word-break:break-all"><a href="${escapeHtml(input.url)}" style="color:#8917e1">${escapeHtml(input.url)}</a></p>
${paragraph(c.account)}
${paragraph(g.ignore)}
<p style="margin:0;white-space:pre-line">${escapeHtml(g.signoff)}</p>
</div>
</body>
</html>`
  return { subject: c.subject(inviter, title), text, html }
}
