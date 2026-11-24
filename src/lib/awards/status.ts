import { isSubmittedLike, toMs, type DateInput, type EntryStatus } from './types'

export type Actor = 'creator' | 'editor' | 'staff'
/** A project member's relationship to a project; a person can hold several (creator is also an editor). */
export type Role = 'creator' | 'editor' | 'collaborator' | 'staff'

export type EntryState = {
  status: EntryStatus
  /** Set while status is needs_clarification: where to go back to. */
  previousStatus: EntryStatus | null
}

export type TransitionContext = {
  /** Server clock. */
  now: DateInput
  intakeOpensAt: DateInput
  intakeClosesBefore: DateInput
  /** Whether the entry passes validation (needed to submit). */
  valid?: boolean
}

export type PriceAction = 'lock' | 'clear' | 'keep'

export type TransitionDenied =
  'not_allowed' | 'actor_not_allowed' | 'not_open' | 'closed' | 'before_close' | 'invalid'

export type TransitionResult =
  | {
      ok: true
      state: EntryState
      /**
       * lock: (re)price by the current date and set submitted_at = now; clear: wipe the price lock
       * (withdraw); keep: leave the snapshot untouched.
       */
      priceAction: PriceAction
    }
  | { ok: false; reason: TransitionDenied }

const SUBMITTED_STAFF_FROM: EntryStatus[] = [
  'submitted',
  'eligibility_pending',
  'eligible',
  'ineligible',
]

type Rule = {
  from: EntryStatus
  to: EntryStatus
  actors: Actor[]
  /** open: before close (and after opening); after: only from close on. */
  window: 'open' | 'after' | 'any'
  priceAction: PriceAction
  needsValid?: boolean
}

const EDITORS: Actor[] = ['creator', 'editor']

const RULES: Rule[] = [
  {
    from: 'draft',
    to: 'submitted',
    actors: EDITORS,
    window: 'open',
    priceAction: 'lock',
    needsValid: true,
  },
  {
    from: 'withdrawn',
    to: 'submitted',
    actors: EDITORS,
    window: 'open',
    priceAction: 'lock',
    needsValid: true,
  },
  {
    from: 'submitted',
    to: 'withdrawn',
    actors: ['creator'],
    window: 'open',
    priceAction: 'clear',
  },
  // Eligibility is set by staff after close.
  {
    from: 'submitted',
    to: 'eligibility_pending',
    actors: ['staff'],
    window: 'after',
    priceAction: 'keep',
  },
  {
    from: 'eligibility_pending',
    to: 'eligible',
    actors: ['staff'],
    window: 'after',
    priceAction: 'keep',
  },
  {
    from: 'eligibility_pending',
    to: 'ineligible',
    actors: ['staff'],
    window: 'after',
    priceAction: 'keep',
  },
  {
    from: 'eligible',
    to: 'ineligible',
    actors: ['staff'],
    window: 'after',
    priceAction: 'keep',
  },
  {
    from: 'ineligible',
    to: 'eligible',
    actors: ['staff'],
    window: 'after',
    priceAction: 'keep',
  },
  {
    from: 'eligible',
    to: 'eligibility_pending',
    actors: ['staff'],
    window: 'after',
    priceAction: 'keep',
  },
  {
    from: 'ineligible',
    to: 'eligibility_pending',
    actors: ['staff'],
    window: 'after',
    priceAction: 'keep',
  },
  // A request is opened by staff on a submitted entry, at any time.
  ...SUBMITTED_STAFF_FROM.map((from): Rule => ({
    from,
    to: 'needs_clarification',
    actors: ['staff'],
    window: 'any',
    priceAction: 'keep',
  })),
]

/** Which actor may perform `from -> to` at all (ignoring dates), for UI affordances. */
export function allowedTransitions(
  from: EntryStatus,
): { to: EntryStatus; actors: Actor[] }[] {
  // needs_clarification -> previous status is handled by resolveClarification, not listed here.
  return RULES.filter((r) => r.from === from).map((r) => ({ to: r.to, actors: r.actors }))
}

function windowOk(
  window: Rule['window'],
  ctx: TransitionContext,
): TransitionDenied | null {
  const now = toMs(ctx.now)
  if (window === 'open') {
    if (now < toMs(ctx.intakeOpensAt)) return 'not_open'
    if (now >= toMs(ctx.intakeClosesBefore)) return 'closed'
  }
  if (window === 'after' && now < toMs(ctx.intakeClosesBefore)) return 'before_close'
  return null
}

/**
 * Applies a status change. `needs_clarification -> previous status` is not a transition here:
 * use resolveClarification when the last open request is resolved.
 */
export function transition(
  state: EntryState,
  to: EntryStatus,
  actor: Actor,
  ctx: TransitionContext,
): TransitionResult {
  const rule = RULES.find((r) => r.from === state.status && r.to === to)
  if (!rule) return { ok: false, reason: 'not_allowed' }
  if (!rule.actors.includes(actor)) return { ok: false, reason: 'actor_not_allowed' }
  const denied = windowOk(rule.window, ctx)
  if (denied) return { ok: false, reason: denied }
  if (rule.needsValid && !ctx.valid) return { ok: false, reason: 'invalid' }
  return {
    ok: true,
    priceAction: rule.priceAction,
    state: {
      status: to,
      previousStatus: to === 'needs_clarification' ? state.status : null,
    },
  }
}

/**
 * Leaves needs_clarification. With other requests still open the entry stays put; otherwise it
 * returns to the status it had before. Entrants (creator/editor, "Mark as done") and staff may resolve.
 */
export function resolveClarification(
  state: EntryState,
  actor: Actor,
  openRequestsRemaining: number,
): TransitionResult {
  if (state.status !== 'needs_clarification') return { ok: false, reason: 'not_allowed' }
  if (openRequestsRemaining > 0) return { ok: true, state, priceAction: 'keep' }
  const back = state.previousStatus
  if (!back || !isSubmittedLike(back) || back === 'needs_clarification')
    return { ok: false, reason: 'not_allowed' }
  void actor // all three actors may resolve; kept in the signature for the event log
  return { ok: true, state: { status: back, previousStatus: null }, priceAction: 'keep' }
}

// ---------------------------------------------------------------- Permissions

export type Action =
  | 'view_project'
  | 'edit_project'
  | 'submit'
  | 'answer_request'
  | 'invite_editors'
  | 'withdraw'
  | 'open_request'
  | 'set_eligibility'
  | 'export'
  | 'transfer_project'

const PERMISSIONS: Record<Action, readonly Role[]> = {
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

/** The spec §5 permission table. A person's roles are checked together. */
export function can(action: Action, roles: readonly Role[]): boolean {
  return roles.some((r) => PERMISSIONS[action].includes(r))
}

export function rolesAllowed(action: Action): readonly Role[] {
  return PERMISSIONS[action]
}
