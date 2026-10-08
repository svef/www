import { describe, expect, it } from 'vitest'
import { formatFileSize } from './filesize'

const NBSP = ' '

describe('formatFileSize', () => {
  it('leaves whole bytes alone', () => {
    expect(formatFileSize(512, 'en')).toBe(`512${NBSP}B`)
  })

  it('uses decimal units, not binary ones', () => {
    // 2048 bytes is 2 kB, not 2 KiB — the figure a file browser would show.
    expect(formatFileSize(2048, 'en')).toBe(`2${NBSP}kB`)
    expect(formatFileSize(1_500_000, 'en')).toBe(`1.5${NBSP}MB`)
  })

  it('follows the locale decimal separator', () => {
    expect(formatFileSize(1_500_000, 'is')).toBe(`1,5${NBSP}MB`)
  })

  it('drops the decimal once the number is large enough not to need it', () => {
    expect(formatFileSize(340_000, 'en')).toBe(`340${NBSP}kB`)
  })

  it('returns null rather than printing a size it does not have', () => {
    expect(formatFileSize(null, 'is')).toBeNull()
    expect(formatFileSize(0, 'is')).toBeNull()
    expect(formatFileSize(-1, 'is')).toBeNull()
    expect(formatFileSize(Number.NaN, 'is')).toBeNull()
  })
})
