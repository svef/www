import { HEARTBEAT_INTERVAL_MS } from '@/lib/awards/projects/lock-rules'
import type { ActionResult, ErrorPayload, LockInfo } from '@/lib/awards/projects/errors'
import type { SubmitResult } from '@/lib/awards/projects/submit'
import type { WithdrawResult } from '@/lib/awards/projects/withdraw'
import type { InviteState } from '@/lib/awards/invitations/types'
import type { ProjectView, SaveAnswersPatch, SaveResult } from '@/lib/awards/projects/types'
import { wireValue } from './wire'

/**
 * The form's state logic — answers, autosave, the edit lock — as a plain class with no
 * React in it. The component layer subscribes to snapshots (`useProjectForm`); the server
 * calls are injected, so the whole thing can be driven by a test with fake actions and
 * fake timers. Presentation can be redesigned without touching any of this.
 *
 * The rules it keeps:
 *  - Autosave runs `AUTOSAVE_MS` after the last change. Only changed fields are sent.
 *  - Opening the project takes the edit lock. Without it the form is read-only.
 *  - Activity (typing, clicks) pings the server at most every 30 s while the lock is
 *    held; every save counts as activity too.
 *  - Leaving the page releases the lock, best effort (`sendBeacon` on `pagehide`).
 *  - If a write finds the lock gone (it lapsed from inactivity), the form takes it again
 *    and re-sends what has not been saved. If someone else has it by then, the form goes
 *    read-only, keeps the unsaved changes, and keeps asking; once it gets the lock back
 *    those changes are laid over the latest server state and saved.
 */

export const AUTOSAVE_MS = 1000
export const POLL_OTHER_MS = 20_000
export const RETRY_MS = 5000

export type ProjectFormActions = {
  load(): Promise<ActionResult<ProjectView>>
  /** `token` (when held) is what `release` must present: it ties a release to this acquisition. */
  acquire(): Promise<ActionResult<{ held: boolean; lock: LockInfo; token?: string }>>
  heartbeat(): Promise<ActionResult<LockInfo>>
  save(patch: SaveAnswersPatch): Promise<ActionResult<SaveResult>>
  setCategories(categories: string[]): Promise<ActionResult<ProjectView>>
  /** Choose who is invoiced (null clears it). Returns the refreshed project. */
  setBilling(billingProfileId: string | null): Promise<ActionResult<ProjectView>>
  /** Submit every complete draft entry, or just `entryId`. Returns what happened and the refreshed project. */
  submit(args: {
    entryId?: string
    acceptTerms: boolean
  }): Promise<ActionResult<{ result: SubmitResult; view: ProjectView }>>
  /** Withdraw one submitted entry (the creator only). Returns what was cleared and the refreshed project. */
  withdraw(entryId: string): Promise<ActionResult<{ result: WithdrawResult; view: ProjectView }>>
  /** Send a collaborator a fresh invitation. Returns the invitation states and whether the mail went out. */
  resendInvite(personId: string): Promise<ActionResult<{ invites: InviteState[]; delivered: boolean }>>
  /** Release on leave, with the token `acquire` issued. Fire-and-forget (a beacon). */
  release(token: string): void
}

export type LockState =
  | { kind: 'acquiring' }
  | { kind: 'held'; lock: LockInfo }
  | { kind: 'other'; lock: LockInfo }
  | { kind: 'unreachable' }

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

type Values = Record<string, unknown>
type EntryValues = Record<string, Values>
export type ServerFieldError = { code: string; message: { is: string; en: string } }

export type Snapshot = {
  view: ProjectView
  answers: Values
  entryAnswers: EntryValues
  lockState: LockState
  saveState: SaveState
  touched: ReadonlySet<string>
  serverErrors: Record<string, ServerFieldError[]>
  categoryError: ErrorPayload | null
  /** The categories as just chosen, until the server confirms them (so the checkbox answers at once). */
  pendingCategories: string[] | null
  /** The billing profile as just chosen, until the server confirms it. */
  pendingBilling: { id: string | null } | null
  billingError: ErrorPayload | null
  /** The lock was lost while editing (shown with the banner if someone else has it). */
  lostLock: boolean
  /** The lock came back after being lost. Cleared by the next edit. */
  recovered: boolean
  /** Where each collaborator stands with the invitation to edit, in order. */
  invites: InviteState[]
  /** The outcome of the last invitation action in this page, for the live region. */
  inviteNotice: { kind: 'sent' | 'failed' | 'refused'; personId?: string; message?: string } | null
  /** A submit is in flight. */
  submitting: boolean
  /** What the last submit in this page did (the success summary), or why it was refused. */
  submitOutcome: { result: SubmitResult } | { error: ErrorPayload } | null
}

const entryId = (slug: string, key: string) => `${slug}:${key}`
const splitEntryId = (id: string): [string, string] => {
  const i = id.indexOf(':')
  return [id.slice(0, i), id.slice(i + 1)]
}

function entryAnswersOf(view: ProjectView): EntryValues {
  return Object.fromEntries(view.entries.map((e) => [e.category, { ...e.answers }]))
}

const networkError = (): { ok: false; error: ErrorPayload } => ({
  ok: false,
  error: { code: 'unexpected', message: 'Network error.' },
})

export class ProjectFormController {
  private snap: Snapshot
  private listeners = new Set<() => void>()
  private dirty = new Set<string>()
  private dirtyEntry = new Set<string>()
  private saving = false
  private again = false
  private acquiring = false
  private lost = false
  private stopped = false
  /** The release token of the lock this page holds (see `ProjectFormActions.release`). */
  private token: string | undefined
  private lastPing = 0
  private saveTimer: ReturnType<typeof setTimeout> | undefined
  private retryTimer: ReturnType<typeof setTimeout> | undefined
  private pollTimer: ReturnType<typeof setInterval> | undefined
  private stopListeners: (() => void) | undefined

  constructor(
    initial: ProjectView,
    private readonly actions: ProjectFormActions,
    private readonly clock: () => number = Date.now,
  ) {
    this.snap = {
      view: initial,
      answers: initial.answers,
      entryAnswers: entryAnswersOf(initial),
      lockState: { kind: 'acquiring' },
      saveState: 'idle',
      touched: new Set(),
      serverErrors: {},
      categoryError: null,
      pendingCategories: null,
      pendingBilling: null,
      billingError: null,
      lostLock: false,
      recovered: false,
      submitting: false,
      invites: initial.invites,
      inviteNotice: null,
      submitOutcome: null,
    }
  }

  // ---- store -----------------------------------------------------------------

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
  getSnapshot = () => this.snap

  private set(patch: Partial<Snapshot>) {
    this.snap = { ...this.snap, ...patch }
    for (const l of this.listeners) l()
  }

  get hasUnsaved() {
    return this.dirty.size > 0 || this.dirtyEntry.size > 0
  }
  private get held() {
    return this.snap.lockState.kind === 'held'
  }

  // ---- lifecycle -------------------------------------------------------------

  /** Takes the lock and wires the page listeners. Returns the teardown (which also releases). */
  start(): () => void {
    this.stopped = false
    void this.acquire()
    const onActivity = () => this.activity()
    const events = ['keydown', 'pointerdown', 'input'] as const
    for (const e of events)
      document.addEventListener(e, onActivity, { capture: true, passive: true })
    const release = () => {
      if (this.held && this.token) this.actions.release(this.token)
    }
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) void this.acquire()
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden' && this.hasUnsaved) void this.flush()
    }
    window.addEventListener('pagehide', release)
    window.addEventListener('pageshow', onShow)
    document.addEventListener('visibilitychange', onVisibility)
    this.pollTimer = setInterval(() => {
      const k = this.snap.lockState.kind
      if ((k === 'other' || k === 'unreachable') && document.visibilityState === 'visible')
        void this.acquire()
    }, POLL_OTHER_MS)

    this.stopListeners = () => {
      for (const e of events) document.removeEventListener(e, onActivity, { capture: true })
      window.removeEventListener('pagehide', release)
      window.removeEventListener('pageshow', onShow)
      document.removeEventListener('visibilitychange', onVisibility)
      clearInterval(this.pollTimer)
      clearTimeout(this.saveTimer)
      clearTimeout(this.retryTimer)
      release()
    }
    return () => this.stop()
  }

  stop() {
    this.stopped = true
    this.stopListeners?.()
    this.stopListeners = undefined
  }

  // ---- the lock --------------------------------------------------------------

  /** Activity ping, at most every `HEARTBEAT_INTERVAL_MS`, only while the lock is held. */
  private activity() {
    if (!this.held) return
    const now = this.clock()
    if (now - this.lastPing < HEARTBEAT_INTERVAL_MS) return
    this.lastPing = now
    this.actions
      .heartbeat()
      .then((r) => {
        if (r.ok) this.set({ lockState: { kind: 'held', lock: r.value } })
        else if (r.error.code === 'lock_required') void this.acquire()
      })
      .catch(() => undefined)
  }

  async acquire(): Promise<void> {
    if (this.acquiring) return
    this.acquiring = true
    try {
      let r
      try {
        r = await this.actions.acquire()
      } catch {
        r = networkError()
      }
      if (!r.ok) {
        if (!this.held) this.set({ lockState: { kind: 'unreachable' } })
        return
      }
      if (!r.value.held) {
        this.set({
          lockState: { kind: 'other', lock: r.value.lock },
          saveState: this.hasUnsaved ? 'error' : this.snap.saveState,
        })
        return
      }
      if (this.stopped) {
        // Left the page while the request was in flight: don't sit on the lock.
        if (r.value.token) this.actions.release(r.value.token)
        return
      }
      this.token = r.value.token
      const wasLost = this.lost
      await this.reload()
      this.lastPing = this.clock()
      this.set({ lockState: { kind: 'held', lock: r.value.lock } })
      if (this.hasUnsaved) void this.flush()
      else if (wasLost) this.set({ saveState: 'saved' })
      if (wasLost) {
        this.lost = false
        this.set({ lostLock: false, recovered: true })
      }
    } finally {
      this.acquiring = false
    }
  }

  private async loseLock() {
    this.lost = true
    this.set({ lostLock: true })
    await this.acquire()
  }

  /** Fresh server state, with what the user has typed and not yet saved laid on top. */
  private applyView(fresh: ProjectView) {
    const answers = { ...fresh.answers }
    for (const k of this.dirty) answers[k] = this.snap.answers[k]
    const entryAnswers = entryAnswersOf(fresh)
    for (const id of this.dirtyEntry) {
      const [slug, key] = splitEntryId(id)
      if (entryAnswers[slug])
        entryAnswers[slug] = {
          ...entryAnswers[slug],
          [key]: this.snap.entryAnswers[slug]?.[key],
        }
    }
    this.set({
      view: fresh,
      invites: fresh.invites,
      answers,
      entryAnswers,
      pendingCategories: null,
      pendingBilling: null,
    })
  }

  /**
   * Saves what was typed, then re-reads the project: which fields are editable changes when a
   * staff request is resolved (the unlocked fields lock again) or opened while the page is open.
   */
  async refresh(): Promise<void> {
    await this.queue
    await this.flush()
    await this.reload()
  }

  private async reload() {
    const r = await this.actions.load().catch(networkError)
    if (r.ok) this.applyView(r.value)
  }

  // ---- saving ----------------------------------------------------------------

  private schedule() {
    clearTimeout(this.saveTimer)
    this.set({ saveState: 'saving', recovered: false })
    this.saveTimer = setTimeout(() => void this.flush(), AUTOSAVE_MS)
  }

  async flush(): Promise<void> {
    clearTimeout(this.saveTimer)
    clearTimeout(this.retryTimer)
    if (!this.hasUnsaved) return
    if (!this.held) {
      this.set({ saveState: 'error' })
      return
    }
    if (this.saving) {
      this.again = true
      return
    }
    this.saving = true
    this.set({ saveState: 'saving' })

    const sent = new Map<string, unknown>()
    const patch: SaveAnswersPatch = { answers: {} }
    for (const k of this.dirty) {
      sent.set(k, this.snap.answers[k])
      patch.answers![k] = wireValue(this.snap.answers[k])
    }
    const sentEntry = new Map<string, unknown>()
    for (const id of this.dirtyEntry) {
      const [slug, key] = splitEntryId(id)
      const v = this.snap.entryAnswers[slug]?.[key]
      sentEntry.set(id, v)
      ;((patch.entryAnswers ??= {})[slug] ??= {})[key] = wireValue(v)
    }

    let result
    try {
      result = await this.actions.save(patch)
    } catch {
      result = networkError()
    }
    this.saving = false

    if (result.ok) {
      this.lastPing = this.clock() // a save is activity
      const done = new Set([
        ...result.value.saved,
        ...result.value.rejected.map((r) => r.fieldKey),
        ...result.value.errors.map((e) => e.fieldKey),
      ])
      // Fields changed again while the save was in flight stay dirty.
      for (const [k, v] of sent)
        if (done.has(k) && Object.is(this.snap.answers[k], v)) this.dirty.delete(k)
      for (const [id, v] of sentEntry) {
        const [slug, key] = splitEntryId(id)
        if (done.has(id) && Object.is(this.snap.entryAnswers[slug]?.[key], v))
          this.dirtyEntry.delete(id)
      }
      const serverErrors = { ...this.snap.serverErrors }
      for (const k of [...sent.keys(), ...sentEntry.keys()]) delete serverErrors[k]
      for (const e of result.value.errors) (serverErrors[e.fieldKey] ??= []).push(e)
      // The server may have set a forced value (requires-login) as a result of this save.
      const forced = result.value.forced
      const { invites, invitesFailed } = result.value
      this.set({
        serverErrors,
        lockState: { kind: 'held', lock: result.value.lock },
        ...(invites ? { invites } : {}),
        ...(invitesFailed ? { inviteNotice: { kind: 'failed' as const } } : {}),
        ...(Object.keys(forced).length ? { answers: { ...this.snap.answers, ...forced } } : {}),
      })
      if (this.hasUnsaved || this.again) {
        this.again = false
        void this.flush()
      } else {
        this.set({ saveState: 'saved' })
      }
      return
    }

    if (result.error.code === 'lock_required') {
      await this.loseLock()
      return
    }
    this.set({ saveState: 'error' })
    this.retryTimer = setTimeout(() => void this.flush(), RETRY_MS)
  }

  // ---- editing ---------------------------------------------------------------

  setAnswer(key: string, value: unknown) {
    if (!this.held) return
    this.dirty.add(key)
    const serverErrors = { ...this.snap.serverErrors }
    delete serverErrors[key]
    this.set({ answers: { ...this.snap.answers, [key]: value }, serverErrors })
    this.schedule()
  }

  setEntryAnswer(slug: string, key: string, value: unknown) {
    if (!this.held) return
    this.dirtyEntry.add(entryId(slug, key))
    this.set({
      entryAnswers: {
        ...this.snap.entryAnswers,
        [slug]: { ...this.snap.entryAnswers[slug], [key]: value },
      },
    })
    this.schedule()
  }

  /** Category and billing changes run one after another, so quick clicks land in the order made. */
  private queue: Promise<unknown> = Promise.resolve()
  private queuedCategories = 0
  private queuedBilling = 0
  private enqueue(run: () => Promise<void>): Promise<void> {
    const result = this.queue.then(run, run)
    this.queue = result.catch(() => undefined)
    return result
  }

  changeCategories(next: string[]): Promise<void> {
    if (!this.held) return Promise.resolve()
    this.queuedCategories++
    this.set({ pendingCategories: next, saveState: 'saving' })
    return this.enqueue(() => this.applyCategories(next))
  }

  private async applyCategories(next: string[], retried = false) {
    if (!retried) this.queuedCategories--
    if (!this.held) return void this.set({ pendingCategories: null })
    this.set({ categoryError: null, pendingCategories: next, saveState: 'saving' })
    // What was typed goes first, so the server sees one consistent order.
    await this.flush()
    this.set({ saveState: 'saving' })
    const r = await this.actions.setCategories(next).catch(networkError)
    if (r.ok) {
      this.applyView(r.value)
      this.lastPing = this.clock()
      this.set({
        saveState:
          this.hasUnsaved || this.queuedCategories + this.queuedBilling > 0 ? 'saving' : 'saved',
      })
    } else if (r.error.code === 'lock_required') {
      this.set({ pendingCategories: null })
      await this.loseLock()
      // The lock lapsed (or a leaving tab released it) between clicks: with it back, the choice still stands.
      if (!retried && this.held) await this.applyCategories(next, true)
    } else {
      this.set({ categoryError: r.error, pendingCategories: null, saveState: 'error' })
    }
  }

  changeBilling(id: string | null): Promise<void> {
    if (!this.held) return Promise.resolve()
    this.queuedBilling++
    this.set({ pendingBilling: { id }, saveState: 'saving' })
    return this.enqueue(() => this.applyBilling(id))
  }

  private async applyBilling(id: string | null, retried = false) {
    if (!retried) this.queuedBilling--
    if (!this.held) return void this.set({ pendingBilling: null })
    this.set({ billingError: null, pendingBilling: { id }, saveState: 'saving' })
    const r = await this.actions.setBilling(id).catch(networkError)
    if (r.ok) {
      this.applyView(r.value)
      this.lastPing = this.clock()
      this.set({
        saveState:
          this.hasUnsaved || this.queuedCategories + this.queuedBilling > 0 ? 'saving' : 'saved',
      })
    } else if (r.error.code === 'lock_required') {
      this.set({ pendingBilling: null })
      await this.loseLock()
      if (!retried && this.held) await this.applyBilling(id, true)
    } else {
      this.set({ billingError: r.error, pendingBilling: null, saveState: 'error' })
    }
  }

  /**
   * Submits. What was typed is saved first, so the server validates what is on screen; a
   * second press while one is in flight does nothing (the server is idempotent as well).
   */
  async submit(args: { entryId?: string; acceptTerms: boolean }): Promise<boolean> {
    if (!this.held || this.snap.submitting) return false
    this.set({ submitting: true, submitOutcome: null })
    // Category and billing changes already queued land before the submit does.
    await this.queue
    await this.flush()
    const r = await this.actions.submit(args).catch(networkError)
    if (r.ok) {
      this.applyView(r.value.view)
      this.lastPing = this.clock()
      this.set({ submitting: false, submitOutcome: { result: r.value.result } })
      return true
    }
    if (r.error.code === 'lock_required') await this.loseLock()
    this.set({ submitting: false, submitOutcome: { error: r.error } })
    return false
  }

  /**
   * Withdraws a submitted entry. What was typed is saved first, like a submit. The result is
   * handed back to the caller (the dialog shows its own error); the lock is given up only if
   * the server says it is gone.
   */
  async withdraw(entryId: string): Promise<ActionResult<WithdrawResult>> {
    if (!this.held)
      return { ok: false, error: { code: 'lock_required', message: 'You do not hold the edit lock.' } }
    await this.queue
    await this.flush()
    const r = await this.actions.withdraw(entryId).catch(networkError)
    if (r.ok) {
      this.applyView(r.value.view)
      this.lastPing = this.clock()
      return { ok: true, value: r.value.result }
    }
    if (r.error.code === 'lock_required') await this.loseLock()
    return r
  }

  /** "Resend invitation": needs no lock, so it works while someone else is editing too. */
  async resendInvite(personId: string): Promise<void> {
    this.set({ inviteNotice: null })
    const r = await this.actions.resendInvite(personId).catch(networkError)
    if (r.ok) {
      this.set({
        invites: r.value.invites,
        inviteNotice: { kind: r.value.delivered ? 'sent' : 'failed', personId },
      })
    } else {
      this.set({ inviteNotice: { kind: 'refused', personId, message: r.error.message } })
    }
  }

  markTouched(key: string) {
    if (this.snap.touched.has(key)) return
    this.set({ touched: new Set(this.snap.touched).add(key) })
  }

  retrySave = () => void this.flush()
  checkLockAgain = () => void this.acquire()
}
