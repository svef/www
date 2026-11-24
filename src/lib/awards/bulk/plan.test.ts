import { describe, expect, it } from 'vitest'
import { planBilling, planSubmit, planWithdraw, type PlanContext, type PlanEntry, type PlanProject } from './plan'

/** The bulk planners are pure: states in, what would be done and what is skipped (with reasons) out. */
const CTX: PlanContext = {
  now: new Date('2026-12-15T12:00:00Z'),
  intakeOpensAt: new Date('2026-12-01T00:00:00Z'),
  intakeClosesBefore: new Date('2027-02-02T00:00:00Z'),
  earlyBird: { endsBefore: new Date('2027-01-05T00:00:00Z'), discountPercent: 30 },
}
const LATE: PlanContext = { ...CTX, now: new Date('2027-01-10T12:00:00Z') }

const complete = {
  title: 'Fjallavefurinn',
  description: 'A site about mountains.',
  owners: [{ name: 'Anna', email: 'anna@example.is' }],
  publicCredit: 'Made by Anna',
  links: ['https://fjall.is'],
  appLinks: ['https://apps.apple.com/is/app/x/id1'],
  campaignPeriod: { start: '2026-05-01', end: '2026-06-01' },
}

let n = 0
const entry = (over: Partial<PlanEntry> = {}): PlanEntry => ({
  id: `e${n++}`,
  category: 'app',
  status: 'draft',
  answers: {},
  regular: 26900,
  price: null,
  ...over,
})
const project = (over: Partial<PlanProject> & { entries: PlanEntry[] }): PlanProject => ({
  id: `p${n++}`,
  title: 'Verkefni',
  role: 'creator',
  lockedBy: null,
  emailVerified: true,
  billingProfileId: 'b1',
  termsAccepted: true,
  answers: complete,
  selected: over.entries.map((e) => e.id),
  ...over,
})
const reasons = (s: { reason: string }[]) => s.map((x) => x.reason)

describe('planSubmit', () => {
  it('lists what will be submitted with the price locked now and a total', () => {
    const a = entry()
    const b = entry({ category: 'marketing-website', regular: 14900 })
    const plan = planSubmit([project({ entries: [a, b] })], CTX)
    expect(plan.skipped).toEqual([])
    expect(plan.items.map((i) => [i.category, i.amount, i.early])).toEqual([
      ['app', 18900, true],
      ['marketing-website', 10900, true],
    ])
    expect(plan.total).toBe(29800)
  })

  it('prices by the date of the plan: after the early bird it is the regular price', () => {
    const plan = planSubmit([project({ entries: [entry()] })], LATE)
    expect(plan.items[0]).toMatchObject({ amount: 26900, early: false })
    expect(plan.total).toBe(26900)
  })

  it('a withdrawn entry is planned as a re-submit, priced now (not by its old lock)', () => {
    const w = entry({ status: 'withdrawn' })
    const plan = planSubmit([project({ entries: [w] })], LATE)
    expect(plan.items[0]).toMatchObject({ resubmit: true, amount: 26900 })
  })

  it('skips with a reason: incomplete project, incomplete entry, not a draft', () => {
    const incomplete = project({ answers: { title: 'x' }, entries: [entry()] })
    const submitted = project({ entries: [entry({ status: 'submitted' })] })
    const plan = planSubmit([incomplete, submitted], CTX)
    expect(plan.items).toEqual([])
    expect(reasons(plan.skipped)).toEqual(['project_incomplete', 'not_submittable'])
    expect(plan.total).toBe(0)
  })

  it('skips a project someone else is editing, naming who, and never forces it', () => {
    const locked = project({ lockedBy: 'Bjarni', entries: [entry()] })
    const free = project({ entries: [entry()] })
    const plan = planSubmit([locked, free], CTX)
    expect(plan.items.map((i) => i.projectId)).toEqual([free.id])
    expect(plan.skipped).toMatchObject([{ projectId: locked.id, reason: 'locked', detail: 'Bjarni' }])
  })

  it('skips for each project-level blocker: unverified email, closed, not open, no billing, terms', () => {
    const cases: [Partial<PlanProject>, PlanContext, string][] = [
      [{ emailVerified: false }, CTX, 'email_unverified'],
      [{}, { ...CTX, now: new Date('2027-02-02T00:00:00Z') }, 'closed'],
      [{}, { ...CTX, now: new Date('2026-11-30T23:59:59Z') }, 'not_open'],
      [{ billingProfileId: null }, CTX, 'no_billing'],
      [{ termsAccepted: false }, CTX, 'terms_not_accepted'],
      [{ role: null }, CTX, 'no_access'],
    ]
    for (const [over, ctx, reason] of cases) {
      const plan = planSubmit([project({ ...over, entries: [entry()] })], ctx)
      expect(plan.items, reason).toEqual([])
      expect(reasons(plan.skipped), reason).toEqual([reason])
    }
  })

  it('a project with a missing field skips every selected entry in it, others still go', () => {
    const bad = project({ answers: { ...complete, links: [] }, entries: [entry({ category: 'marketing-website' })] })
    const good = project({ entries: [entry()] })
    const plan = planSubmit([bad, good], CTX)
    expect(plan.items.length).toBe(1)
    expect(plan.skipped[0]).toMatchObject({ projectId: bad.id, reason: 'project_incomplete' })
  })

  it('only the selected entries of a project are considered', () => {
    const a = entry()
    const b = entry({ category: 'marketing-website' })
    const plan = planSubmit([project({ entries: [a, b], selected: [a.id] })], CTX)
    expect(plan.items.map((i) => i.entryId)).toEqual([a.id])
  })

  it('does not bring a withdrawn tier back beside another tier of a select-one group', () => {
    const small = entry({ category: 'company-website-small', status: 'withdrawn' })
    const large = entry({ category: 'company-website-large', status: 'submitted' })
    const plan = planSubmit([project({ entries: [small, large], selected: [small.id] })], CTX)
    expect(reasons(plan.skipped)).toEqual(['category_conflict'])
  })
})

describe('planWithdraw', () => {
  const locked = (discountPercent: number, amount: number, regular = 26900) => ({
    regular,
    discountPercent,
    amount,
  })

  it('plans submitted entries of projects the person created, and says which give up the early bird', () => {
    const early = entry({ status: 'submitted', price: locked(30, 18900) })
    const reg = entry({ category: 'marketing-website', status: 'submitted', price: locked(0, 14900, 14900) })
    const plan = planWithdraw([project({ entries: [early, reg] })], CTX)
    expect(plan.items.map((i) => [i.hadEarlyBird, i.lockedAmount, i.regular])).toEqual([
      [true, 18900, 26900],
      [false, 14900, 14900],
    ])
    expect(plan.givesUpEarlyBird).toBe(true)
  })

  it('lists projects the person did not create as skipped (editors cannot withdraw)', () => {
    const mine = project({ entries: [entry({ status: 'submitted', price: locked(30, 18900) })] })
    const theirs = project({ role: 'editor', entries: [entry({ status: 'submitted', price: locked(30, 18900) })] })
    const plan = planWithdraw([mine, theirs], CTX)
    expect(plan.items.map((i) => i.projectId)).toEqual([mine.id])
    expect(plan.skipped).toMatchObject([{ projectId: theirs.id, reason: 'not_creator' }])
  })

  it('skips entries that are not submitted, after close, and in a project being edited', () => {
    const draft = project({ entries: [entry()] })
    const closed = project({ entries: [entry({ status: 'submitted', price: locked(30, 18900) })] })
    const busy = project({ lockedBy: 'Bjarni', entries: [entry({ status: 'submitted', price: locked(30, 18900) })] })
    expect(reasons(planWithdraw([draft], CTX).skipped)).toEqual(['not_submitted'])
    expect(reasons(planWithdraw([closed], { ...CTX, now: CTX.intakeClosesBefore }).skipped)).toEqual(['closed'])
    expect(planWithdraw([busy], CTX).skipped).toMatchObject([{ reason: 'locked', detail: 'Bjarni' }])
  })

  it('gives up nothing when only regular-price entries are withdrawn', () => {
    const plan = planWithdraw([project({ entries: [entry({ status: 'submitted', price: locked(0, 26900) })] })], LATE)
    expect(plan.givesUpEarlyBird).toBe(false)
  })
})

describe('planBilling', () => {
  const target = { profileId: 'b2', profileFound: true }

  it('plans one item per project, however many of its entries are selected', () => {
    const p = project({ entries: [entry(), entry({ category: 'marketing-website' })] })
    const plan = planBilling([p], CTX, target)
    expect(plan.items).toEqual([{ projectId: p.id, projectTitle: 'Verkefni' }])
  })

  it('skips locked projects, ones already on that profile, closed intake and a profile that is not the person’s', () => {
    const busy = project({ lockedBy: 'Bjarni', entries: [entry()] })
    const same = project({ billingProfileId: 'b2', entries: [entry()] })
    const free = project({ entries: [entry()] })
    const plan = planBilling([busy, same, free], CTX, target)
    expect(plan.items.map((i) => i.projectId)).toEqual([free.id])
    expect(reasons(plan.skipped)).toEqual(['locked', 'unchanged'])
    expect(reasons(planBilling([free], { ...CTX, now: CTX.intakeClosesBefore }, target).skipped)).toEqual(['closed'])
    expect(reasons(planBilling([free], CTX, { ...target, profileFound: false }).skipped)).toEqual([
      'profile_not_found',
    ])
  })

  it('an editor may change the billing profile (it needs edit rights, not creation)', () => {
    const plan = planBilling([project({ role: 'editor', entries: [entry()] })], CTX, target)
    expect(plan.items.length).toBe(1)
  })
})
