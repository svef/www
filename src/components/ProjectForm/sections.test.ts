import { describe, expect, it } from 'vitest'
import { fieldErrorsByKey, sectionStatuses, SECTIONS, UNPLACED_FIELDS } from './sections'

describe('sections', () => {
  it('places every field definition in a section', () => {
    expect(UNPLACED_FIELDS).toEqual([])
  })

  it('has the seven sections in order', () => {
    expect(SECTIONS.map((s) => s.id)).toEqual([
      'categories', 'project', 'questions', 'people', 'image', 'billing', 'review',
    ])
  })

  it('starts incomplete, and ticks sections as their fields pass', () => {
    expect(sectionStatuses([], {}).categories).toBe('incomplete')
    const s = sectionStatuses(['marketing-website'], {
      title: 'T',
      description: 'D',
      links: ['https://example.is'],
      campaignPeriod: { start: '2026-01-01', end: '2026-02-01' },
    })
    expect(s.categories).toBe('complete')
    expect(s.project).toBe('complete')
    expect(s.questions).toBe('complete')
    expect(s.people).toBe('incomplete')
  })

  it('marks the unbuilt sections as later, with no check', () => {
    const s = sectionStatuses(['app'], {})
    expect([s.image, s.billing, s.review]).toEqual(['later', 'later', 'later'])
  })

  it('counts a section with no visible questions as complete once a category is chosen', () => {
    expect(sectionStatuses(['app'], {}).questions).toBe('complete')
  })

  it('needs the login details once requires-login is on', () => {
    const base = { title: 'T', description: 'D', appLinks: ['https://example.is'], requiresLogin: true }
    expect(sectionStatuses(['app'], base).project).toBe('incomplete')
    expect(
      sectionStatuses(['app'], { ...base, loginInformation: [{ value: 'demo' }] }).project,
    ).toBe('complete')
  })

  it('reports submit-mode errors by field', () => {
    expect(fieldErrorsByKey(['app'], {}).title?.[0].code).toBe('required')
  })
})
