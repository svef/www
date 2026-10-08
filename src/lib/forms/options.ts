import { FEEDBACK_SUBJECTS, TALK_TOPICS } from '@/payload/collections/Submissions'

/**
 * The option values the two forms offer, and the single place that decides them.
 *
 * The values are re-exported from the collections rather than redeclared, so a
 * value the form can submit is by construction a value the column accepts.
 * Their *labels* live in the i18n dictionaries, keyed by these same strings:
 * what is stored is a stable identifier, never the Icelandic or English words,
 * so the copy can be rewritten without rewriting the rows.
 */
export { FEEDBACK_SUBJECTS, TALK_TOPICS }

export type FeedbackSubject = (typeof FEEDBACK_SUBJECTS)[number]
export type TalkTopic = (typeof TALK_TOPICS)[number]

export function isFeedbackSubject(value: unknown): value is FeedbackSubject {
  return typeof value === 'string' && (FEEDBACK_SUBJECTS as readonly string[]).includes(value)
}

export function isTalkTopic(value: unknown): value is TalkTopic {
  return typeof value === 'string' && (TALK_TOPICS as readonly string[]).includes(value)
}

/**
 * Longest a free-text field may be.
 *
 * Not validation so much as a bound on what a stranger can post into the
 * association's database and Slack in one request. Generous enough that nobody
 * writing in good faith will meet it.
 */
export const LIMITS = {
  name: 120,
  email: 254,
  shortText: 200,
  longText: 5000,
} as const
