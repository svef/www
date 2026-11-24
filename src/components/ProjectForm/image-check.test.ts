import { describe, expect, it } from 'vitest'
import { checkImageFile, formatBytes } from './image-check'

const MB = 1024 * 1024

describe('checkImageFile', () => {
  it('accepts a 1080 × 1080 PNG or JPEG under the limit', () => {
    expect(checkImageFile({ type: 'image/png', size: 2 * MB }, { width: 1080, height: 1080 })).toEqual([])
    expect(checkImageFile({ type: 'image/jpeg', size: 1 }, { width: 1080, height: 1080 })).toEqual([])
  })

  it('gives the exact dimensions message', () => {
    const [p] = checkImageFile({ type: 'image/png', size: MB }, { width: 1200, height: 800 })
    expect(p.code).toBe('imageDimensions')
    expect(p.message.en).toBe('This image is 1200 × 800, it needs to be 1080 × 1080.')
    expect(p.message.is).toBe('Myndin er 1200 × 800 en þarf að vera 1080 × 1080.')
  })

  it('refuses other types and oversize files', () => {
    expect(checkImageFile({ type: 'image/gif', size: MB }, { width: 1080, height: 1080 }).map((e) => e.code)).toEqual(['imageType'])
    expect(checkImageFile({ type: 'image/png', size: 11 * MB }, { width: 1080, height: 1080 }).map((e) => e.code)).toEqual(['imageSize'])
  })

  it('says "not an image" for a file the browser cannot decode', () => {
    expect(checkImageFile({ type: 'image/png', size: MB }, null).map((e) => e.code)).toEqual(['imageType'])
    expect(checkImageFile({ type: 'application/pdf', size: 11 * MB }, null).map((e) => e.code)).toEqual(['imageType', 'imageSize'])
  })
})

describe('formatBytes', () => {
  it('writes KB and MB', () => {
    expect(formatBytes(2.5 * MB, 'en')).toBe('2.5 MB')
    expect(formatBytes(2048, 'en')).toBe('2 KB')
  })
})
