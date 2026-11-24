import { describe, expect, it } from 'vitest'
import { entry, lockedEntry, proj } from './fixtures'
import { filterProjects, fold, NO_FILTER } from './filter'

const projects = [
  proj({ id: 'a', title: 'Sól og Sæla', entries: [entry({ id: 'a1' }), lockedEntry(18900, { id: 'a2', categorySlug: 'app' })] }),
  proj({ id: 'b', title: 'Bolti', entries: [lockedEntry(6900, { id: 'b1', status: 'eligible' })] }),
  proj({ id: 'c', title: '', entries: [] }),
]

describe('filterProjects', () => {
  it('returns everything for no filter', () => {
    expect(filterProjects(projects, NO_FILTER)).toHaveLength(3)
  })
  it('searches the title, ignoring case and accents', () => {
    expect(filterProjects(projects, { ...NO_FILTER, query: 'sol' }).map((p) => p.id)).toEqual(['a'])
    expect(filterProjects(projects, { ...NO_FILTER, query: ' BOLT ' }).map((p) => p.id)).toEqual(['b'])
    expect(filterProjects(projects, { ...NO_FILTER, query: 'zzz' })).toEqual([])
  })
  it('narrows by status and keeps only matching entries', () => {
    const out = filterProjects(projects, { ...NO_FILTER, status: 'draft' })
    expect(out.map((p) => [p.id, p.entries.map((e) => e.id)])).toEqual([['a', ['a1']]])
  })
  it('narrows by category, and combines filters', () => {
    expect(filterProjects(projects, { ...NO_FILTER, category: 'app' }).map((p) => p.entries.map((e) => e.id))).toEqual([['a2']])
    expect(filterProjects(projects, { query: 'bolti', status: 'draft', category: '' })).toEqual([])
  })
  it('folds accents but keeps Icelandic letters', () => {
    expect(fold('Sól')).toBe('sol')
    expect(fold('Þór')).toBe('þor')
  })
})
