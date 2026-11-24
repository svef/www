import { describe, expect, it } from 'vitest'
import {
  fieldEditability,
  hasOpenRequestFor,
  isFieldEditable,
  type EditabilityContext,
} from './editability'
import { getField } from './fields'
import type { EntryStatus } from './types'

const CLOSES = '2027-02-02T00:00:00Z'
const mk = (
  entries: [string, EntryStatus][],
  extra: Partial<EditabilityContext> = {},
): EditabilityContext => ({
  now: '2027-01-10T00:00:00Z',
  intakeClosesBefore: CLOSES,
  entries: entries.map(([category, status]) => ({ category, status })),
  ...extra,
})

describe('before anything is submitted', () => {
  it('everything is editable', () => {
    const ctx = mk([['app', 'draft']])
    for (const key of [
      'title',
      'description',
      'owners',
      'links',
      'publicCredit',
      'termsAccepted',
    ]) {
      expect(fieldEditability(getField(key), ctx)).toEqual({
        editable: true,
        reason:
          key === 'links' || key === 'publicCredit'
            ? 'editable_after_submit'
            : 'not_submitted',
      })
    }
  })
})

describe('after submitting', () => {
  const ctx = mk([['ecommerce-website', 'submitted']])

  it.each([
    'links',
    'appLinks',
    'requiresLogin',
    'loginInformation',
    'campaignArchive',
    'image',
    'collaborators',
    'publicCredit',
  ])('%s stays editable', (key) => {
    expect(fieldEditability(getField(key), ctx)).toEqual({
      editable: true,
      reason: 'editable_after_submit',
    })
  })

  it.each(['title', 'description', 'owners', 'termsAccepted'])('%s is locked', (key) => {
    expect(fieldEditability(getField(key), ctx)).toEqual({
      editable: false,
      reason: 'locked_after_submit',
    })
  })

  it.each([
    ['technicalAchievement', 'technical-achievement'],
    ['aiRole', 'ai-solution'],
    ['school', 'student-project'],
    ['programme', 'student-project'],
    ['campaignPeriod', 'marketing-website'],
  ])('%s is locked once its own category entry is submitted', (key, category) => {
    expect(fieldEditability(getField(key), mk([[category, 'submitted']]))).toEqual({
      editable: false,
      reason: 'locked_after_submit',
    })
  })

  it('the pitch is locked on a submitted entry and open on a draft one', () => {
    const c = mk([
      ['app', 'submitted'],
      ['ai-solution', 'draft'],
    ])
    expect(
      isFieldEditable(getField('categoryPitch'), { ...c, entryCategory: 'app' }),
    ).toBe(false)
    expect(
      isFieldEditable(getField('categoryPitch'), { ...c, entryCategory: 'ai-solution' }),
    ).toBe(true)
  })

  it.each([
    'submitted',
    'eligibility_pending',
    'eligible',
    'ineligible',
    'needs_clarification',
  ] as const)('a %s entry counts as submitted', (status) => {
    expect(isFieldEditable(getField('title'), mk([['app', status]]))).toBe(false)
  })

  it('a withdrawn project can change locked fields again (that is the point of withdrawing)', () => {
    expect(isFieldEditable(getField('title'), mk([['app', 'withdrawn']]))).toBe(true)
  })
})

describe('a category added after submitting', () => {
  it('its category-specific fields stay editable until that entry is submitted', () => {
    const c = mk([
      ['app', 'submitted'],
      ['student-project', 'draft'],
    ])
    expect(fieldEditability(getField('school'), c)).toEqual({
      editable: true,
      reason: 'new_category',
    })
    expect(isFieldEditable(getField('programme'), c)).toBe(true)
    // ...but project-wide locked fields stay locked
    expect(isFieldEditable(getField('title'), c)).toBe(false)
    expect(isFieldEditable(getField('description'), c)).toBe(false)
  })

  it('locks once that entry is submitted', () => {
    const c = mk([
      ['app', 'submitted'],
      ['student-project', 'submitted'],
    ])
    expect(isFieldEditable(getField('school'), c)).toBe(false)
  })

  it('stays locked if another entry in the same category-specific field is submitted', () => {
    // technicalAchievement belongs to technical-achievement only
    const c = mk([
      ['technical-achievement', 'submitted'],
      ['app', 'draft'],
    ])
    expect(isFieldEditable(getField('technicalAchievement'), c)).toBe(false)
  })
})

describe('intake close (exclusive bound)', () => {
  it('is editable until the last millisecond before the close', () => {
    const c = mk([['app', 'draft']], { now: '2027-02-01T23:59:59.999Z' })
    expect(isFieldEditable(getField('title'), c)).toBe(true)
    expect(isFieldEditable(getField('links'), c)).toBe(true)
  })

  it('is read-only exactly at the close instant, even for editableAfterSubmit fields and drafts', () => {
    const c = mk([['app', 'draft']], { now: CLOSES })
    expect(fieldEditability(getField('title'), c)).toEqual({
      editable: false,
      reason: 'intake_closed',
    })
    expect(fieldEditability(getField('links'), c)).toEqual({
      editable: false,
      reason: 'intake_closed',
    })
    expect(
      isFieldEditable(getField('title'), { ...c, now: new Date('2027-03-01T00:00:00Z') }),
    ).toBe(false)
  })
})

describe('open requests', () => {
  const req = { fieldKeys: ['title', 'image'], deadlineAt: '2027-02-10T00:00:00Z' }

  it('unlock locked fields, even after intake closes', () => {
    const c = mk([['app', 'submitted']], { now: '2027-02-05T00:00:00Z', requests: [req] })
    expect(fieldEditability(getField('title'), c)).toEqual({
      editable: true,
      reason: 'open_request',
    })
    expect(fieldEditability(getField('image'), c)).toEqual({
      editable: true,
      reason: 'open_request',
    })
    expect(isFieldEditable(getField('description'), c)).toBe(false) // not named by the request
    expect(isFieldEditable(getField('links'), c)).toBe(false) // closed, not unlocked
  })

  it('unlock until the deadline (exclusive)', () => {
    const base = mk([['app', 'submitted']], { requests: [req] })
    expect(
      isFieldEditable(getField('title'), { ...base, now: '2027-02-09T23:59:59.999Z' }),
    ).toBe(true)
    expect(
      isFieldEditable(getField('title'), { ...base, now: '2027-02-10T00:00:00.000Z' }),
    ).toBe(false)
  })

  it('stop unlocking once resolved', () => {
    const c = mk([['app', 'submitted']], {
      now: '2027-02-05T00:00:00Z',
      requests: [{ ...req, resolvedAt: '2027-02-04T00:00:00Z' }],
    })
    expect(isFieldEditable(getField('title'), c)).toBe(false)
  })

  it('any of several requests can unlock', () => {
    const c = mk([['app', 'submitted']], {
      now: '2027-02-05T00:00:00Z',
      requests: [
        { fieldKeys: ['owners'], deadlineAt: '2027-02-01T00:00:00Z' },
        { fieldKeys: ['owners'], deadlineAt: '2027-02-06T00:00:00Z' },
      ],
    })
    expect(isFieldEditable(getField('owners'), c)).toBe(true)
    expect(hasOpenRequestFor('owners', c.requests, c.now)).toBe(true)
    expect(hasOpenRequestFor('owners', undefined, c.now)).toBe(false)
  })
})

describe('requests are scoped to their entry for entry-scope fields', () => {
  const entries: [string, EntryStatus][] = [
    ['app', 'submitted'],
    ['marketing-website', 'submitted'],
  ]
  const open = (entryCategory: string, fieldKeys: string[]) => ({
    fieldKeys,
    deadlineAt: '2027-02-10T00:00:00Z',
    entryCategory,
  })
  const closed = { now: '2027-02-05T00:00:00Z' }

  it('categoryPitch unlocked on one entry stays locked on the other', () => {
    const c = mk(entries, { ...closed, requests: [open('app', ['categoryPitch'])] })
    const pitch = getField('categoryPitch')
    expect(fieldEditability(pitch, { ...c, entryCategory: 'app' })).toEqual({
      editable: true,
      reason: 'open_request',
    })
    expect(fieldEditability(pitch, { ...c, entryCategory: 'marketing-website' })).toEqual({
      editable: false,
      reason: 'intake_closed',
    })
  })

  it('an entry-scope key on a request without a known entry unlocks nothing', () => {
    const c = mk(entries, {
      ...closed,
      entryCategory: 'app',
      requests: [{ fieldKeys: ['categoryPitch'], deadlineAt: '2027-02-10T00:00:00Z' }],
    })
    expect(isFieldEditable(getField('categoryPitch'), c)).toBe(false)
  })

  it('project-scope fields are unlocked for the whole project by a request on either entry', () => {
    const c = mk(entries, { ...closed, requests: [open('app', ['title', 'image'])] })
    for (const key of ['title', 'image']) {
      expect(isFieldEditable(getField(key), c)).toBe(true)
      expect(isFieldEditable(getField(key), { ...c, entryCategory: 'marketing-website' })).toBe(true)
    }
  })

  it('the image upload asks the same question: unlocked by a request after close, locked again once it is resolved', () => {
    const image = getField('image')
    const c = mk(entries, { ...closed, requests: [open('marketing-website', ['image'])] })
    expect(fieldEditability(image, c)).toEqual({ editable: true, reason: 'open_request' })
    const done = { ...c, requests: [{ ...open('marketing-website', ['image']), resolvedAt: '2027-02-04T00:00:00Z' }] }
    expect(fieldEditability(image, done)).toEqual({ editable: false, reason: 'intake_closed' })
  })
})
