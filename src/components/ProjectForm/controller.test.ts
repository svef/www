import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ActionResult, ErrorPayload, LockInfo } from '@/lib/awards/projects/errors'
import type { SubmitResult } from '@/lib/awards/projects/submit'
import type { ProjectView, SaveResult } from '@/lib/awards/projects/types'
import {
  AUTOSAVE_MS,
  POLL_OTHER_MS,
  ProjectFormController,
  type ProjectFormActions,
} from './controller'

const lock = (name = 'Anna', id = 'u1'): LockInfo => ({
  holderUserId: id,
  holderName: name,
  acquiredAt: '2026-12-01T14:02:00.000Z',
  lastActivityAt: '2026-12-01T14:02:00.000Z',
  expiresAt: '2026-12-01T14:22:00.000Z',
})

const view = (over: Partial<ProjectView> = {}): ProjectView => ({
  id: 'p1',
  locale: 'en',
  editionId: 'e1',
  role: 'creator',
  categories: ['app'],
  entries: [{ id: 'en1', category: 'app', status: 'draft', answers: {}, price: null }],
  answers: {},
  editability: {},
  entryEditability: {},
  lock: null,
  intakeOpensAt: '2026-12-01T00:00:00.000Z',
  intakeClosesBefore: '2027-02-02T00:00:00.000Z',
  viewer: { email: 'anna@example.com', emailVerified: true },
  terms: { version: 'draft', accepted: false },
  earlyBird: {
    endsBefore: '2027-01-05T00:00:00.000Z',
    discountPercent: 30,
    rounding: 'nearest-900',
  },
  billing: null,
  invites: [],
  serverNow: '2026-12-01T14:00:00.000Z',
  ...over,
})

const ok = <T>(value: T): ActionResult<T> => ({ ok: true, value })
const fail = (error: Partial<ErrorPayload>): ActionResult<never> => ({
  ok: false,
  error: { code: 'unexpected', message: 'x', ...error },
})
const saved = (keys: string[], l = lock('Me', 'me')): SaveResult => ({
  saved: keys,
  rejected: [],
  errors: [],
  forced: {},
  lock: l,
})

function setup(over: Partial<ProjectFormActions> = {}) {
  const actions: ProjectFormActions = {
    load: vi.fn(async () => ok(view())),
    acquire: vi.fn(async () => ok({ held: true, lock: lock('Me', 'me'), token: 'tok-1' })),
    heartbeat: vi.fn(async () => ok(lock('Me', 'me'))),
    save: vi.fn(async (p) => ok(saved(Object.keys(p.answers ?? {})))),
    setCategories: vi.fn(async () => ok(view())),
    setBilling: vi.fn(async () => ok(view())),
    submit: vi.fn(async () => ok({ result: submitted, view: view() })),
    withdraw: vi.fn(async (entryId: string) =>
      ok({ result: { entryId, category: 'app', clearedPrice: null }, view: view() }),
    ),
    resendInvite: vi.fn(async () => ok({ invites: [], delivered: true })),
    release: vi.fn(),
    ...over,
  }
  const c = new ProjectFormController(view(), actions)
  return { c, actions }
}
const submitted: SubmitResult = {
  submitted: [],
  skipped: [],
  alreadySubmitted: [],
  receipt: 'sent',
}
const settle = () => vi.advanceTimersByTimeAsync(0)

describe('ProjectFormController', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-12-01T14:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('takes the lock on start and is read-only until it has it', async () => {
    const { c } = setup()
    expect(c.getSnapshot().lockState.kind).toBe('acquiring')
    c.setAnswer('title', 'ignored')
    expect(c.getSnapshot().answers.title).toBeUndefined()
    const stop = c.start()
    await settle()
    expect(c.getSnapshot().lockState.kind).toBe('held')
    stop()
  })

  it('autosaves one second after typing stops, sending only the changed fields', async () => {
    const { c, actions } = setup()
    const stop = c.start()
    await settle()
    c.setAnswer('title', 'He')
    await vi.advanceTimersByTimeAsync(AUTOSAVE_MS - 100)
    c.setAnswer('title', 'Hello')
    await vi.advanceTimersByTimeAsync(AUTOSAVE_MS - 100)
    expect(actions.save).not.toHaveBeenCalled()
    expect(c.getSnapshot().saveState).toBe('saving')
    await vi.advanceTimersByTimeAsync(200)
    expect(actions.save).toHaveBeenCalledTimes(1)
    expect(actions.save).toHaveBeenCalledWith({ answers: { title: 'Hello' } })
    expect(c.getSnapshot().saveState).toBe('saved')
    stop()
  })

  it('keeps a field dirty if it changed while its save was in flight', async () => {
    let finish!: (r: ActionResult<SaveResult>) => void
    const { c, actions } = setup({
      save: vi.fn(() => new Promise<ActionResult<SaveResult>>((r) => (finish = r))),
    })
    const stop = c.start()
    await settle()
    c.setAnswer('title', 'A')
    await vi.advanceTimersByTimeAsync(AUTOSAVE_MS)
    c.setAnswer('title', 'AB')
    finish(ok(saved(['title'])))
    await settle()
    ;(actions.save as ReturnType<typeof vi.fn>).mockImplementation(async () => ok(saved(['title'])))
    await vi.advanceTimersByTimeAsync(AUTOSAVE_MS)
    expect(actions.save).toHaveBeenLastCalledWith({ answers: { title: 'AB' } })
    stop()
  })

  it('does not send blank list rows', async () => {
    const { c, actions } = setup()
    const stop = c.start()
    await settle()
    c.setAnswer('appLinks', ['https://a.is', ''])
    await vi.advanceTimersByTimeAsync(AUTOSAVE_MS)
    expect(actions.save).toHaveBeenCalledWith({ answers: { appLinks: ['https://a.is'] } })
    stop()
  })

  it('shows the holder and goes read-only when someone else has the lock, then polls', async () => {
    const acquire = vi
      .fn()
      .mockResolvedValueOnce(ok({ held: false, lock: lock('Anna', 'u1') }))
      .mockResolvedValue(ok({ held: true, lock: lock('Me', 'me') }))
    const { c } = setup({ acquire })
    const stop = c.start()
    await settle()
    const s = c.getSnapshot()
    expect(s.lockState).toEqual({ kind: 'other', lock: lock('Anna', 'u1') })
    c.setAnswer('title', 'nope')
    expect(c.getSnapshot().answers.title).toBeUndefined()
    await vi.advanceTimersByTimeAsync(POLL_OTHER_MS)
    expect(c.getSnapshot().lockState.kind).toBe('held')
    stop()
  })

  it('pings at most every 30 seconds while there is activity, and not without it', async () => {
    const { c, actions } = setup()
    const stop = c.start()
    await settle()
    await vi.advanceTimersByTimeAsync(5 * 60_000)
    expect(actions.heartbeat).not.toHaveBeenCalled() // an open tab with no activity doesn't ping
    for (let i = 0; i < 20; i++) {
      document.dispatchEvent(new Event('keydown'))
      await vi.advanceTimersByTimeAsync(2000)
    }
    // 40 s of typing: the first ping, then the next one only after 30 s.
    expect((actions.heartbeat as ReturnType<typeof vi.fn>).mock.calls.length).toBe(2)
    stop()
  })

  it('counts a save as activity, so a ping straight after is not needed', async () => {
    const { c, actions } = setup()
    const stop = c.start()
    await settle()
    c.setAnswer('title', 'x')
    await vi.advanceTimersByTimeAsync(AUTOSAVE_MS)
    document.dispatchEvent(new Event('keydown'))
    expect(actions.heartbeat).not.toHaveBeenCalled()
    stop()
  })

  it('releases the lock when the page is hidden for good, and on stop', async () => {
    const { c, actions } = setup()
    const stop = c.start()
    await settle()
    window.dispatchEvent(new Event('pagehide'))
    expect(actions.release).toHaveBeenCalledTimes(1)
    expect(actions.release).toHaveBeenCalledWith('tok-1')
    stop()
    expect(actions.release).toHaveBeenCalledTimes(2)
  })

  it('does not hold on to a lock it was granted after the page was left', async () => {
    let grant!: (r: ActionResult<{ held: boolean; lock: LockInfo }>) => void
    const { c, actions } = setup({
      acquire: vi.fn(
        () => new Promise<ActionResult<{ held: boolean; lock: LockInfo }>>((r) => (grant = r)),
      ),
    })
    const stop = c.start()
    stop()
    grant(ok({ held: true, lock: lock('Me', 'me'), token: 'late-tok' }))
    await settle()
    expect(actions.release).toHaveBeenCalledWith('late-tok')
    expect(c.getSnapshot().lockState.kind).toBe('acquiring')
  })

  describe('losing the lock mid-edit', () => {
    it('takes it again if nobody else did, and re-sends what was not saved', async () => {
      const save = vi
        .fn()
        .mockResolvedValueOnce(fail({ code: 'lock_required', lock: null }))
        .mockImplementation(async (p) => ok(saved(Object.keys(p.answers ?? {}))))
      const { c, actions } = setup({ save })
      const stop = c.start()
      await settle()
      c.setAnswer('title', 'Keep me')
      await vi.advanceTimersByTimeAsync(AUTOSAVE_MS)
      await settle()
      expect(actions.acquire).toHaveBeenCalledTimes(2)
      expect(save).toHaveBeenCalledTimes(2)
      expect(save).toHaveBeenLastCalledWith({ answers: { title: 'Keep me' } })
      const s = c.getSnapshot()
      expect(s.saveState).toBe('saved')
      expect(s.recovered).toBe(true)
      expect(s.lostLock).toBe(false)
      stop()
    })

    it('goes read-only if someone else took it, keeps the typed text, and saves it on getting the lock back', async () => {
      const acquire = vi
        .fn()
        .mockResolvedValueOnce(ok({ held: true, lock: lock('Me', 'me') }))
        .mockResolvedValueOnce(ok({ held: false, lock: lock('Bjarni', 'u2') }))
        .mockResolvedValue(ok({ held: true, lock: lock('Me', 'me') }))
      const save = vi
        .fn()
        .mockResolvedValueOnce(fail({ code: 'lock_required', lock: lock('Bjarni', 'u2') }))
        .mockImplementation(async (p) => ok(saved(Object.keys(p.answers ?? {}))))
      // Meanwhile Bjarni changed the description on the server.
      const load = vi.fn(async () => ok(view({ answers: { description: 'Bjarni wrote this' } })))
      const { c } = setup({ acquire, save, load })
      const stop = c.start()
      await settle()
      c.setAnswer('title', 'Mine')
      await vi.advanceTimersByTimeAsync(AUTOSAVE_MS)
      await settle()
      let s = c.getSnapshot()
      expect(s.lockState).toEqual({ kind: 'other', lock: lock('Bjarni', 'u2') })
      expect(s.lostLock).toBe(true)
      expect(s.saveState).toBe('error')
      expect(s.answers.title).toBe('Mine')

      await vi.advanceTimersByTimeAsync(POLL_OTHER_MS)
      await settle()
      s = c.getSnapshot()
      expect(s.lockState.kind).toBe('held')
      expect(s.answers.description).toBe('Bjarni wrote this') // fresh server state…
      expect(s.answers.title).toBe('Mine') // …with my unsaved change on top
      expect(save).toHaveBeenLastCalledWith({ answers: { title: 'Mine' } })
      expect(s.saveState).toBe('saved')
      stop()
    })

    it('retries a failed save on its own', async () => {
      const save = vi
        .fn()
        .mockRejectedValueOnce(new Error('offline'))
        .mockImplementation(async (p) => ok(saved(Object.keys(p.answers ?? {}))))
      const { c } = setup({ save })
      const stop = c.start()
      await settle()
      c.setAnswer('title', 'x')
      await vi.advanceTimersByTimeAsync(AUTOSAVE_MS)
      expect(c.getSnapshot().saveState).toBe('error')
      await vi.advanceTimersByTimeAsync(5000)
      expect(c.getSnapshot().saveState).toBe('saved')
      stop()
    })
  })

  it('records field errors the server reports, and clears them when the field is edited', async () => {
    const save = vi.fn(async () =>
      ok({
        ...saved([]),
        errors: [
          {
            fieldKey: 'links',
            path: ['links', 0],
            code: 'invalidUrl',
            message: { is: 'x', en: 'bad link' },
          },
        ],
      }),
    )
    const { c } = setup({ save })
    const stop = c.start()
    await settle()
    c.setAnswer('links', ['nope'])
    await vi.advanceTimersByTimeAsync(AUTOSAVE_MS)
    expect(c.getSnapshot().serverErrors.links[0].message.en).toBe('bad link')
    expect(c.hasUnsaved).toBe(false) // not retried until the user changes it
    c.setAnswer('links', ['https://ok.is'])
    expect(c.getSnapshot().serverErrors.links).toBeUndefined()
    stop()
  })

  it('applies a forced value the server set', async () => {
    const save = vi.fn(async () => ok({ ...saved(['title']), forced: { requiresLogin: true } }))
    const { c } = setup({ save })
    const stop = c.start()
    await settle()
    c.setAnswer('title', 'x')
    await vi.advanceTimersByTimeAsync(AUTOSAVE_MS)
    expect(c.getSnapshot().answers.requiresLogin).toBe(true)
    stop()
  })

  it('changes categories after flushing what was typed, and adopts the new view', async () => {
    const order: string[] = []
    const { c } = setup({
      save: vi.fn(async (p) => {
        order.push('save')
        return ok(saved(Object.keys(p.answers ?? {})))
      }),
      setCategories: vi.fn(async () => {
        order.push('categories')
        return ok(view({ categories: ['app', 'ai-solution'] }))
      }),
    })
    const stop = c.start()
    await settle()
    c.setAnswer('title', 'x')
    await c.changeCategories(['app', 'ai-solution'])
    expect(order).toEqual(['save', 'categories'])
    expect(c.getSnapshot().view.categories).toEqual(['app', 'ai-solution'])
    stop()
  })

  it('refresh saves what was typed, then adopts the project as the server now has it (a request resolved)', async () => {
    const order: string[] = []
    const locked = { title: { editable: false, reason: 'intake_closed' } } as ProjectView['editability']
    const { c } = setup({
      save: vi.fn(async (p) => {
        order.push('save')
        return ok(saved(Object.keys(p.answers ?? {})))
      }),
      load: vi.fn(async () => {
        order.push('load')
        return ok(view({ editability: locked, answers: { title: 'Fixed' } }))
      }),
    })
    const stop = c.start()
    await settle()
    c.setAnswer('title', 'Fixed')
    await c.refresh()
    expect(order.slice(-2)).toEqual(['save', 'load'])
    expect(c.getSnapshot().view.editability).toEqual(locked)
    expect(c.getSnapshot().answers.title).toBe('Fixed')
    stop()
  })

  it('shows a category choice at once, before the server has confirmed it', async () => {
    let confirm!: (r: ActionResult<ProjectView>) => void
    const { c } = setup({
      setCategories: vi.fn(() => new Promise<ActionResult<ProjectView>>((r) => (confirm = r))),
    })
    const stop = c.start()
    await settle()
    const pending = c.changeCategories(['app', 'ai-solution'])
    expect(c.getSnapshot().pendingCategories).toEqual(['app', 'ai-solution'])
    await settle()
    confirm(ok(view({ categories: ['app', 'ai-solution'] })))
    await pending
    expect(c.getSnapshot().pendingCategories).toBeNull()
    expect(c.getSnapshot().view.categories).toEqual(['app', 'ai-solution'])
    stop()
  })

  it('surfaces a refused category change without losing the lock', async () => {
    const { c } = setup({
      setCategories: vi.fn(async () =>
        fail({ code: 'selection_invalid', message: 'one tier only' }),
      ),
    })
    const stop = c.start()
    await settle()
    await c.changeCategories(['company-website-small', 'company-website-large'])
    expect(c.getSnapshot().categoryError?.message).toBe('one tier only')
    expect(c.getSnapshot().pendingCategories).toBeNull() // the choice is shown reverted
    expect(c.getSnapshot().lockState.kind).toBe('held')
    stop()
  })

  it('shows a billing choice at once and settles on what the server returns', async () => {
    let confirm!: (r: ActionResult<ProjectView>) => void
    const { c, actions } = setup({
      setBilling: vi.fn(() => new Promise<ActionResult<ProjectView>>((r) => (confirm = r))),
    })
    const stop = c.start()
    await settle()
    const pending = c.changeBilling('b1')
    expect(c.getSnapshot().pendingBilling).toEqual({ id: 'b1' })
    await settle()
    confirm(ok(view({ billing: { id: 'b1', companyName: 'Acme', kennitala: '7106697169' } })))
    await pending
    expect(actions.setBilling).toHaveBeenCalledWith('b1')
    expect(c.getSnapshot().pendingBilling).toBeNull()
    expect(c.getSnapshot().view.billing?.id).toBe('b1')
    stop()
  })

  it('reverts the billing choice and says why when the server refuses it', async () => {
    const { c } = setup({
      setBilling: vi.fn(async () =>
        fail({ code: 'not_found', message: 'Billing profile not found.' }),
      ),
    })
    const stop = c.start()
    await settle()
    await c.changeBilling('someone-elses')
    expect(c.getSnapshot().billingError?.message).toBe('Billing profile not found.')
    expect(c.getSnapshot().pendingBilling).toBeNull()
    expect(c.getSnapshot().lockState.kind).toBe('held')
    stop()
  })

  it('retries a category change once when the lock had lapsed between clicks', async () => {
    const setCategories = vi
      .fn()
      .mockResolvedValueOnce(fail({ code: 'lock_required', message: 'lock' }))
      .mockResolvedValueOnce(ok(view({ categories: ['app', 'ai-solution'] })))
    const { c } = setup({ setCategories })
    const stop = c.start()
    await settle()
    await c.changeCategories(['app', 'ai-solution'])
    expect(setCategories).toHaveBeenCalledTimes(2)
    expect(c.getSnapshot().view.categories).toEqual(['app', 'ai-solution'])
    stop()
  })

  it('sends quick successive billing choices one after another, in order', async () => {
    const calls: (string | null)[] = []
    const { c } = setup({
      setBilling: vi.fn(async (id) => {
        calls.push(id)
        await new Promise((r) => setTimeout(r, 50))
        return ok(view({ billing: id ? { id, companyName: 'x', kennitala: '7106697169' } : null }))
      }),
    })
    const stop = c.start()
    await settle()
    const a = c.changeBilling('b1')
    const b = c.changeBilling('b2')
    expect(c.getSnapshot().pendingBilling).toEqual({ id: 'b2' })
    await vi.advanceTimersByTimeAsync(200)
    await Promise.all([a, b])
    expect(calls).toEqual(['b1', 'b2'])
    expect(c.getSnapshot().view.billing?.id).toBe('b2')
    expect(c.getSnapshot().pendingBilling).toBeNull()
    stop()
  })

  it('saves what was typed before submitting, then shows the outcome and the refreshed project', async () => {
    const order: string[] = []
    const after = view({ entries: [{ id: 'en1', category: 'app', status: 'submitted', answers: {}, price: { regular: 1, discountPercent: 0, amount: 1 } }] })
    const { c } = setup({
      save: vi.fn(async (p) => {
        order.push('save')
        return ok(saved(Object.keys(p.answers ?? {})))
      }),
      submit: vi.fn(async () => {
        order.push('submit')
        return ok({ result: submitted, view: after })
      }),
    })
    const stop = c.start()
    await settle()
    c.setAnswer('title', 'Typed')
    expect(await c.submit({ acceptTerms: true })).toBe(true)
    expect(order).toEqual(['save', 'submit'])
    expect(c.getSnapshot().view.entries[0].status).toBe('submitted')
    expect(c.getSnapshot().submitOutcome).toEqual({ result: submitted })
    expect(c.getSnapshot().submitting).toBe(false)
    stop()
  })

  it('saves what was typed before withdrawing, refreshes the project, and passes a refusal back', async () => {
    const order: string[] = []
    const after = view({ entries: [{ id: 'en1', category: 'app', status: 'withdrawn', answers: {}, price: null }] })
    const { c } = setup({
      save: vi.fn(async (p) => {
        order.push('save')
        return ok(saved(Object.keys(p.answers ?? {})))
      }),
      withdraw: vi.fn(async (entryId: string) => {
        order.push('withdraw')
        return ok({ result: { entryId, category: 'app', clearedPrice: null }, view: after })
      }),
    })
    const stop = c.start()
    await settle()
    c.setAnswer('title', 'Typed')
    const r = await c.withdraw('en1')
    expect(r.ok).toBe(true)
    expect(order).toEqual(['save', 'withdraw'])
    expect(c.getSnapshot().view.entries[0].status).toBe('withdrawn')
    stop()

    const refused = setup({
      withdraw: vi.fn(async () => fail({ code: 'not_withdrawable', message: 'No.' })),
    })
    const stop2 = refused.c.start()
    await settle()
    const r2 = await refused.c.withdraw('en1')
    expect(r2.ok).toBe(false)
    stop2()
  })

  it('ignores a second press while a submit is in flight, and reports a refusal', async () => {
    let release!: () => void
    const submit = vi.fn(
      () =>
        new Promise<ActionResult<{ result: SubmitResult; view: ProjectView }>>((resolve) => {
          release = () => resolve(fail({ code: 'terms_required', message: 'Accept the terms to submit.' }))
        }),
    )
    const { c } = setup({ submit })
    const stop = c.start()
    await settle()
    const first = c.submit({ acceptTerms: false })
    expect(await c.submit({ acceptTerms: false })).toBe(false)
    await settle()
    release()
    expect(await first).toBe(false)
    expect(submit).toHaveBeenCalledTimes(1)
    expect(c.getSnapshot().submitOutcome).toMatchObject({ error: { code: 'terms_required' } })
    stop()
  })
})
