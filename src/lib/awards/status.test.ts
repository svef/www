import { describe, expect, it } from 'vitest'
import {
  allowedTransitions,
  can,
  resolveClarification,
  rolesAllowed,
  transition,
  type Action,
  type Actor,
  type EntryState,
  type Role,
} from './status'
import { ENTRY_STATUSES, type EntryStatus } from './types'

const OPENS = '2026-12-01T00:00:00Z'
const CLOSES = '2027-02-02T00:00:00Z'
const ctx = (now: string, valid = true) => ({
  now,
  intakeOpensAt: OPENS,
  intakeClosesBefore: CLOSES,
  valid,
})
const open = ctx('2027-01-10T12:00:00Z')
const after = ctx('2027-02-02T00:00:00Z')
const st = (
  status: EntryStatus,
  previousStatus: EntryStatus | null = null,
): EntryState => ({ status, previousStatus })

describe('draft / withdrawn -> submitted', () => {
  it.each(['creator', 'editor'] as const)(
    '%s can submit a valid draft, which locks the price',
    (actor) => {
      expect(transition(st('draft'), 'submitted', actor, open)).toEqual({
        ok: true,
        state: st('submitted'),
        priceAction: 'lock',
      })
    },
  )

  it('staff cannot submit', () => {
    expect(transition(st('draft'), 'submitted', 'staff', open)).toEqual({
      ok: false,
      reason: 'actor_not_allowed',
    })
  })

  it('refuses an invalid entry', () => {
    expect(
      transition(st('draft'), 'submitted', 'editor', ctx('2027-01-10T00:00:00Z', false)),
    ).toEqual({
      ok: false,
      reason: 'invalid',
    })
  })

  it('is bounded by intake: allowed from the opening instant, not before', () => {
    expect(
      transition(st('draft'), 'submitted', 'editor', ctx('2026-11-30T23:59:59.999Z')).ok,
    ).toBe(false)
    expect(
      transition(st('draft'), 'submitted', 'editor', ctx('2026-11-30T23:59:59.999Z')),
    ).toMatchObject({ reason: 'not_open' })
    expect(
      transition(st('draft'), 'submitted', 'editor', ctx('2026-12-01T00:00:00.000Z')).ok,
    ).toBe(true)
  })

  it('closes exactly at intakeClosesBefore (exclusive)', () => {
    expect(
      transition(st('draft'), 'submitted', 'editor', ctx('2027-02-01T23:59:59.999Z')).ok,
    ).toBe(true)
    expect(
      transition(st('draft'), 'submitted', 'editor', ctx('2027-02-02T00:00:00.000Z')),
    ).toEqual({
      ok: false,
      reason: 'closed',
    })
  })

  it('withdrawn -> submitted re-prices (lock) before close and is refused after', () => {
    expect(transition(st('withdrawn'), 'submitted', 'creator', open)).toMatchObject({
      ok: true,
      priceAction: 'lock',
    })
    expect(transition(st('withdrawn'), 'submitted', 'editor', open).ok).toBe(true)
    expect(transition(st('withdrawn'), 'submitted', 'creator', after)).toEqual({
      ok: false,
      reason: 'closed',
    })
  })
})

describe('withdraw', () => {
  it('only the creator can withdraw, which clears the price lock', () => {
    expect(transition(st('submitted'), 'withdrawn', 'creator', open)).toEqual({
      ok: true,
      state: st('withdrawn'),
      priceAction: 'clear',
    })
    expect(transition(st('submitted'), 'withdrawn', 'editor', open)).toEqual({
      ok: false,
      reason: 'actor_not_allowed',
    })
    expect(transition(st('submitted'), 'withdrawn', 'staff', open)).toEqual({
      ok: false,
      reason: 'actor_not_allowed',
    })
  })

  it('is not possible after close, nor from other statuses', () => {
    expect(transition(st('submitted'), 'withdrawn', 'creator', after)).toEqual({
      ok: false,
      reason: 'closed',
    })
    for (const from of [
      'draft',
      'eligible',
      'ineligible',
      'eligibility_pending',
      'needs_clarification',
    ] as const) {
      expect(transition(st(from), 'withdrawn', 'creator', open)).toEqual({
        ok: false,
        reason: 'not_allowed',
      })
    }
  })
})

describe('needs_clarification', () => {
  it.each(['submitted', 'eligibility_pending', 'eligible', 'ineligible'] as const)(
    'staff can open a request on a %s entry, remembering the status, before or after close',
    (from) => {
      for (const c of [open, after]) {
        expect(transition(st(from), 'needs_clarification', 'staff', c)).toEqual({
          ok: true,
          state: st('needs_clarification', from),
          priceAction: 'keep',
        })
      }
    },
  )

  it('entrants cannot open requests; drafts and withdrawn entries cannot have one', () => {
    expect(transition(st('submitted'), 'needs_clarification', 'creator', open)).toEqual({
      ok: false,
      reason: 'actor_not_allowed',
    })
    expect(transition(st('draft'), 'needs_clarification', 'staff', open)).toEqual({
      ok: false,
      reason: 'not_allowed',
    })
    expect(transition(st('withdrawn'), 'needs_clarification', 'staff', open)).toEqual({
      ok: false,
      reason: 'not_allowed',
    })
    expect(
      transition(
        st('needs_clarification', 'submitted'),
        'needs_clarification',
        'staff',
        open,
      ).ok,
    ).toBe(false)
  })

  it('resolving the last request restores the previous status, for any actor', () => {
    for (const actor of ['creator', 'editor', 'staff'] as Actor[]) {
      expect(
        resolveClarification(st('needs_clarification', 'eligible'), actor, 0),
      ).toEqual({
        ok: true,
        state: st('eligible'),
        priceAction: 'keep',
      })
    }
  })

  it('stays in needs_clarification while other requests are open', () => {
    const s = st('needs_clarification', 'submitted')
    expect(resolveClarification(s, 'editor', 2)).toEqual({
      ok: true,
      state: s,
      priceAction: 'keep',
    })
  })

  it('refuses to resolve an entry that is not awaiting clarification, or has no memory', () => {
    expect(resolveClarification(st('submitted'), 'staff', 0)).toEqual({
      ok: false,
      reason: 'not_allowed',
    })
    expect(resolveClarification(st('needs_clarification'), 'staff', 0)).toEqual({
      ok: false,
      reason: 'not_allowed',
    })
  })

  it('does not offer a generic way out of needs_clarification', () => {
    expect(allowedTransitions('needs_clarification')).toEqual([])
    expect(
      transition(st('needs_clarification', 'submitted'), 'submitted', 'staff', after),
    ).toEqual({
      ok: false,
      reason: 'not_allowed',
    })
  })
})

describe('eligibility (staff, after close)', () => {
  it('is only possible from the close instant on', () => {
    expect(
      transition(
        st('submitted'),
        'eligibility_pending',
        'staff',
        ctx('2027-02-01T23:59:59.999Z'),
      ),
    ).toEqual({
      ok: false,
      reason: 'before_close',
    })
    expect(
      transition(st('submitted'), 'eligibility_pending', 'staff', after),
    ).toMatchObject({ ok: true })
  })

  it('walks pending -> eligible / ineligible and allows corrections', () => {
    expect(transition(st('eligibility_pending'), 'eligible', 'staff', after).ok).toBe(
      true,
    )
    expect(transition(st('eligibility_pending'), 'ineligible', 'staff', after).ok).toBe(
      true,
    )
    expect(transition(st('eligible'), 'ineligible', 'staff', after).ok).toBe(true)
    expect(transition(st('ineligible'), 'eligible', 'staff', after).ok).toBe(true)
    expect(transition(st('eligible'), 'eligibility_pending', 'staff', after).ok).toBe(
      true,
    )
  })

  it('is staff only and does not skip the review', () => {
    expect(transition(st('eligibility_pending'), 'eligible', 'creator', after)).toEqual({
      ok: false,
      reason: 'actor_not_allowed',
    })
    expect(transition(st('submitted'), 'eligible', 'staff', after)).toEqual({
      ok: false,
      reason: 'not_allowed',
    })
  })
})

describe('transition table', () => {
  it('only ever produces keep/lock/clear in the expected places', () => {
    const results: string[] = []
    for (const from of ENTRY_STATUSES) {
      for (const to of ENTRY_STATUSES) {
        for (const actor of ['creator', 'editor', 'staff'] as Actor[]) {
          for (const c of [open, after]) {
            const r = transition(st(from), to, actor, c)
            if (r.ok && r.priceAction !== 'keep')
              results.push(`${from}>${to}:${r.priceAction}`)
          }
        }
      }
    }
    expect([...new Set(results)].sort()).toEqual([
      'draft>submitted:lock',
      'submitted>withdrawn:clear',
      'withdrawn>submitted:lock',
    ])
  })

  it('never lets a status transition to itself', () => {
    for (const s of ENTRY_STATUSES)
      expect(transition(st(s), s, 'staff', open).ok).toBe(false)
  })
})

describe('permission table', () => {
  const table: Record<Action, Role[]> = {
    view_project: ['creator', 'editor', 'staff'],
    edit_project: ['creator', 'editor'],
    submit: ['creator', 'editor'],
    answer_request: ['creator', 'editor'],
    invite_editors: ['creator', 'editor'],
    withdraw: ['creator'],
    open_request: ['staff'],
    set_eligibility: ['staff'],
    export: ['staff'],
    transfer_project: ['staff'],
  }
  const roles: Role[] = ['creator', 'editor', 'collaborator', 'staff']

  for (const [action, allowed] of Object.entries(table) as [Action, Role[]][]) {
    it(`${action}: ${allowed.join(', ')}`, () => {
      for (const role of roles) expect(can(action, [role])).toBe(allowed.includes(role))
      expect([...rolesAllowed(action)].sort()).toEqual([...allowed].sort())
    })
  }

  it('checks several roles together; no roles can do nothing; collaborators cannot view', () => {
    expect(can('withdraw', ['editor', 'creator'])).toBe(true)
    expect(can('withdraw', ['editor', 'staff'])).toBe(false)
    expect(can('view_project', [])).toBe(false)
    expect(can('view_project', ['collaborator'])).toBe(false)
  })
})
