// @vitest-environment node
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { gif, jpeg, png } from './fixtures'
import { inspectImage, sniffType } from './inspect'

describe('inspectImage', () => {
  it('reads a PNG and a JPEG from their bytes', async () => {
    expect(await inspectImage(await png(1080, 1080))).toEqual({
      ok: true,
      type: 'image/png',
      width: 1080,
      height: 1080,
    })
    expect(await inspectImage(await jpeg(1200, 800))).toEqual({
      ok: true,
      type: 'image/jpeg',
      width: 1200,
      height: 800,
    })
  })

  it('goes by the magic bytes, not by any name or declared type', async () => {
    expect(sniffType(await gif(10, 10))).toBeNull()
    expect(await inspectImage(await gif(10, 10))).toEqual({ ok: false, reason: 'not_an_image' })
    expect(await inspectImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toEqual({
      ok: false,
      reason: 'not_an_image',
    })
    expect(await inspectImage(Buffer.from('MZ plainly not a picture'))).toEqual({
      ok: false,
      reason: 'not_an_image',
    })
  })

  it('refuses a truncated file even though its header is fine', async () => {
    const whole = await png(300, 300)
    const cut = whole.subarray(0, Math.floor(whole.length / 2))
    const r = await inspectImage(cut)
    expect(r.ok).toBe(false)
  })

  it('refuses a PNG signature with garbage after it', async () => {
    const r = await inspectImage(
      Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(40)]),
    )
    expect(r).toEqual({ ok: false, reason: 'unreadable' })
  })

  it('reports dimensions the way an EXIF-rotated photo is shown', async () => {
    const rotated = await sharp({
      create: { width: 1200, height: 800, channels: 3, background: '#888' },
    })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer()
    expect(await inspectImage(rotated)).toMatchObject({ width: 800, height: 1200 })
  })
})
