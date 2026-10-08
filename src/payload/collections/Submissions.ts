import type { CollectionConfig } from 'payload'

/**
 * What a reader can write to the site.
 *
 * Both collections are **append-only from the public side**: the forms create
 * rows through the Local API and nothing reads them back out to a page. Read
 * access is therefore `false`, not `() => true` like the content collections —
 * these hold other people's names, addresses and words, and the Payload REST
 * API would otherwise serve the lot at `/api/feedback` to anyone who asked.
 * The admin is unaffected; it authenticates before it reads.
 *
 * Nothing here is localized. A submission is written once, in whatever language
 * its author chose, and is never translated — `locale` records which page it
 * came from so a reply can be written in the right one.
 */

/** The subject a piece of feedback is about. Mirrored in `src/lib/forms/options.ts`. */
export const FEEDBACK_SUBJECTS = [
  'general',
  'awards',
  'event-oct-8',
  'event-oct-21',
  'other',
] as const

export const Feedback: CollectionConfig = {
  slug: 'feedback',
  access: {
    // Submissions arrive through a server action using the Local API, which
    // bypasses access control. Public reads stay closed.
    create: () => false,
    read: () => false,
    update: () => false,
    delete: () => false,
  },
  admin: {
    useAsTitle: 'subject',
    defaultColumns: ['subject', 'name', 'email', 'createdAt'],
    description: 'Ábendingar sent from the site. Read-only: nothing writes back here.',
  },
  defaultSort: '-createdAt',
  fields: [
    {
      name: 'subject',
      type: 'select',
      required: true,
      options: FEEDBACK_SUBJECTS.map((value) => ({ label: value, value })),
    },
    {
      name: 'subjectOther',
      type: 'text',
      admin: {
        description: 'What they typed when the subject was "other".',
        condition: (data) => data?.subject === 'other',
      },
    },
    { name: 'message', type: 'textarea', required: true },
    // Optional on purpose: the form encourages them and does not insist. A
    // suggestion worth acting on is worth having without a name attached.
    { name: 'name', type: 'text' },
    { name: 'email', type: 'email' },
    {
      name: 'locale',
      type: 'text',
      admin: { description: 'Which language the form was filled in.', readOnly: true },
    },
  ],
}

/** Topic themes a talk can be tagged with. Mirrored in `src/lib/forms/options.ts`. */
export const TALK_TOPICS = [
  'development',
  'design',
  'ux',
  'accessibility',
  'ai',
  'project-management',
  'content',
  'marketing',
  'security',
  'infrastructure',
  'data',
  'other',
] as const

export const TalkProposals: CollectionConfig = {
  slug: 'talk-proposals',
  access: {
    create: () => false,
    read: () => false,
    update: () => false,
    delete: () => false,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'name', 'email', 'createdAt'],
    description: 'Talk proposals sent from the site. Read-only: nothing writes back here.',
  },
  defaultSort: '-createdAt',
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'summary', type: 'textarea', required: true },
    {
      name: 'topics',
      type: 'select',
      hasMany: true,
      options: TALK_TOPICS.map((value) => ({ label: value, value })),
    },
    // Required here, unlike feedback: a proposal is the start of a conversation
    // about a date, and there is no way to have it with an anonymous proposer.
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email', required: true },
    {
      name: 'notes',
      type: 'textarea',
      admin: { description: 'Anything else they thought was relevant.' },
    },
    {
      name: 'locale',
      type: 'text',
      admin: { description: 'Which language the form was filled in.', readOnly: true },
    },
  ],
}
