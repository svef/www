import { describe, expect, it } from 'vitest'
import { wireValue } from './wire'

describe('wireValue', () => {
  it('drops blank rows from lists and clears a list with nothing left', () => {
    expect(wireValue(['https://a.is', '', '  '])).toEqual(['https://a.is'])
    expect(wireValue([''])).toBeNull()
    expect(wireValue([{ name: '', email: '' }, { name: 'A' }])).toEqual([{ name: 'A' }])
    expect(wireValue([{ canEdit: false, name: '' }])).toBeNull()
  })

  it('leaves scalars alone, including false', () => {
    expect(wireValue(false)).toBe(false)
    expect(wireValue('text')).toBe('text')
    expect(wireValue(undefined)).toBeNull()
  })
})
