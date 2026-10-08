'use server'

import { getPayload } from '@/lib/payload'
import { isLocale, DEFAULT_LOCALE } from '@/lib/i18n'
import { postToSlack, type SlackField } from './slack'
import { isFeedbackSubject, isTalkTopic, LIMITS } from './options'
import type { FieldErrors, FormState } from './state'

/**
 * What the forms do on submit.
 *
 * The order is the point: **store, then notify.** The row in Postgres is the
 * record and Slack is a convenience, so a Slack outage must never cost somebody
 * their words. A failed notification is logged for us and invisible to them —
 * they wrote to the association and the association has it.
 *
 * Errors come back as keys rather than sentences. The server has no business
 * deciding which language to apologise in; the form knows its own locale and
 * looks the key up in the dictionary it is already using.
 */

/** Trimmed string, or `undefined` when the field was blank. */
function text(data: FormData, key: string): string | undefined {
  const raw = data.get(key)
  if (typeof raw !== 'string') return undefined
  const value = raw.trim()
  return value === '' ? undefined : value
}

/**
 * A field no person can see and no person fills in.
 *
 * The cheapest spam filter there is, and the only one that costs a real visitor
 * nothing: no puzzle, no third-party script, no judgement about who looks
 * suspicious. It catches the indiscriminate bots, which is most of them. It
 * will not stop anyone who looks at the markup — rate limiting is the next step
 * if that starts happening (svef/www#32 covers the same ground for contact).
 */
function looksAutomated(data: FormData): boolean {
  return text(data, 'website') !== undefined
}

/** `is`/`en` as submitted by the form, falling back rather than failing. */
function localeOf(data: FormData): string {
  const value = text(data, 'locale')
  return value && isLocale(value) ? value : DEFAULT_LOCALE
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function checkLength(
  errors: FieldErrors,
  field: string,
  value: string | undefined,
  max: number,
): void {
  if (value && value.length > max) errors[field] = 'tooLong'
}

export async function submitFeedback(
  _prev: FormState,
  data: FormData,
): Promise<FormState> {
  if (looksAutomated(data)) return { status: 'success' }

  const subject = text(data, 'subject')
  const subjectOther = text(data, 'subjectOther')
  const message = text(data, 'message')
  const name = text(data, 'name')
  const email = text(data, 'email')

  const errors: FieldErrors = {}
  if (!isFeedbackSubject(subject)) errors.subject = 'required'
  // Choosing "other" and then not saying what leaves nothing to act on.
  if (subject === 'other' && !subjectOther) errors.subjectOther = 'required'
  if (!message) errors.message = 'required'
  if (email && !EMAIL.test(email)) errors.email = 'invalid'
  checkLength(errors, 'name', name, LIMITS.name)
  checkLength(errors, 'email', email, LIMITS.email)
  checkLength(errors, 'subjectOther', subjectOther, LIMITS.shortText)
  checkLength(errors, 'message', message, LIMITS.longText)

  if (Object.keys(errors).length > 0) return { status: 'error', errors }
  // Unreachable: the checks above already rejected both. Written as a guard
  // rather than an assertion so the narrowing is the type system's conclusion
  // and not a promise from a comment.
  if (!isFeedbackSubject(subject) || !message) {
    return { status: 'error', errors: { message: 'required' } }
  }

  const locale = localeOf(data)
  const payload = await getPayload()
  await payload.create({
    collection: 'feedback',
    data: {
      subject,
      subjectOther: subject === 'other' ? subjectOther : undefined,
      message,
      name,
      email,
      locale,
    },
  })

  const fields: SlackField[] = [
    { label: 'Efni', value: subject === 'other' ? `Annað — ${subjectOther}` : subject },
    { label: 'Nafn', value: name ?? '—' },
    { label: 'Netfang', value: email ?? '—' },
    { label: 'Tungumál', value: locale },
    { label: 'Skilaboð', value: message },
  ]
  const slack = await postToSlack('feedback', 'Ný ábending af svef.is', fields)
  if (!slack.ok) {
    console.error(`[forms] feedback saved, Slack ${slack.reason}: ${slack.detail ?? ''}`)
  }

  return { status: 'success' }
}

export async function submitTalkProposal(
  _prev: FormState,
  data: FormData,
): Promise<FormState> {
  if (looksAutomated(data)) return { status: 'success' }

  const name = text(data, 'name')
  const email = text(data, 'email')
  const title = text(data, 'title')
  const summary = text(data, 'summary')
  const notes = text(data, 'notes')
  const topics = data.getAll('topics').filter(isTalkTopic)

  const errors: FieldErrors = {}
  if (!name) errors.name = 'required'
  if (!email) errors.email = 'required'
  else if (!EMAIL.test(email)) errors.email = 'invalid'
  if (!title) errors.title = 'required'
  if (!summary) errors.summary = 'required'
  checkLength(errors, 'name', name, LIMITS.name)
  checkLength(errors, 'email', email, LIMITS.email)
  checkLength(errors, 'title', title, LIMITS.shortText)
  checkLength(errors, 'summary', summary, LIMITS.longText)
  checkLength(errors, 'notes', notes, LIMITS.longText)

  if (Object.keys(errors).length > 0) return { status: 'error', errors }
  // Unreachable, for the same reason as above.
  if (!name || !email || !title || !summary) {
    return { status: 'error', errors: { title: 'required' } }
  }

  const locale = localeOf(data)
  const payload = await getPayload()
  await payload.create({
    collection: 'talk-proposals',
    data: { name, email, title, summary, notes, topics, locale },
  })

  const fields: SlackField[] = [
    { label: 'Titill', value: title },
    { label: 'Frá', value: `${name} <${email}>` },
    { label: 'Efnisflokkar', value: topics.length > 0 ? topics.join(', ') : '—' },
    { label: 'Tungumál', value: locale },
    { label: 'Lýsing', value: summary },
    { label: 'Annað', value: notes },
  ]
  const slack = await postToSlack('talks', 'Nýtt erindi í boði á svef.is', fields)
  if (!slack.ok) {
    console.error(`[forms] talk proposal saved, Slack ${slack.reason}: ${slack.detail ?? ''}`)
  }

  return { status: 'success' }
}
