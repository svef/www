import type { Editability } from '../editability'
import type { EntryStatus } from '../types'
import type { LockInfo } from './errors'

/** Plain-data views, safe to hand to a client component. */

export type EntryView = {
  id: string
  category: string
  status: EntryStatus
  /** Entry-scope answers (`categoryPitch`). */
  answers: Record<string, unknown>
}

export type ProjectView = {
  id: string
  locale: 'is' | 'en'
  editionId: string
  /** How the viewer relates to the project. */
  role: 'creator' | 'editor'
  /** Slugs of the categories with a live, non-withdrawn entry. */
  categories: string[]
  /** Live entries, withdrawn ones included. */
  entries: EntryView[]
  /** Project-scope answers by field key, people and login details included. */
  answers: Record<string, unknown>
  /** Editability of every project-scope field right now. */
  editability: Record<string, Editability>
  /** Editability of the entry-scope fields, per category slug. */
  entryEditability: Record<string, Record<string, Editability>>
  /** The live lock, or null when the project is free to take. */
  lock: LockInfo | null
  intakeClosesBefore: string
  /** The server clock when this view was built. */
  serverNow: string
}

/** Why a requested field change was not applied. */
export type RejectReason =
  | 'unknown_field'
  | 'wrong_scope'
  | 'not_saveable'
  | 'hidden'
  | 'no_entry'
  | 'intake_closed'
  | 'locked_after_submit'

export type SaveAnswersPatch = {
  /** Project-scope answers: key to new value (blank, null or [] clears). */
  answers?: Record<string, unknown>
  /** Entry-scope answers: category slug, then key to new value. */
  entryAnswers?: Record<string, Record<string, unknown>>
}

export type SaveResult = {
  /** Field keys written (entry fields as `<category>:<key>`). */
  saved: string[]
  /** Fields refused for being locked, hidden or unknown. Nothing else is affected. */
  rejected: { fieldKey: string; reason: RejectReason }[]
  /** Fields not written because the value failed validation (formats and limits). */
  errors: {
    fieldKey: string
    path: (string | number)[]
    code: string
    message: { is: string; en: string }
  }[]
  /** Fields the server set itself (a forced value), so the client can follow. */
  forced: Record<string, unknown>
  lock: LockInfo
}
