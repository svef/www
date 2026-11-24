import { describe, expect, it } from 'vitest'
import { pageWindow } from './paging'

describe('pageWindow', () => {
  it('shows every page when there are few', () => {
    expect(pageWindow(1, 1)).toEqual([1])
    expect(pageWindow(2, 5)).toEqual([1, 2, 3, 4, 5])
  })

  it('keeps the ends and the pages around the current one', () => {
    expect(pageWindow(6, 20)).toEqual([1, null, 4, 5, 6, 7, 8, null, 20])
    expect(pageWindow(1, 20)).toEqual([1, 2, 3, null, 20])
    expect(pageWindow(20, 20)).toEqual([1, null, 18, 19, 20])
  })

  it('fills a gap of one page instead of writing “…”', () => {
    expect(pageWindow(5, 10)).toEqual([1, 2, 3, 4, 5, 6, 7, null, 10])
  })
})
