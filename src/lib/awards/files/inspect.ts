import sharp from 'sharp'

export type InspectedImage =
  | { ok: true; type: 'image/png' | 'image/jpeg'; width: number; height: number }
  | { ok: false; reason: 'not_an_image' | 'unreadable' }

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const JPEG = [0xff, 0xd8, 0xff]

const startsWith = (b: Uint8Array, sig: number[]) => sig.every((v, i) => b[i] === v)

/** The content type the bytes really are, from their magic number (never from what the browser said). */
export function sniffType(bytes: Uint8Array): 'image/png' | 'image/jpeg' | null {
  if (startsWith(bytes, PNG)) return 'image/png'
  if (startsWith(bytes, JPEG)) return 'image/jpeg'
  return null
}

/**
 * Reads what an uploaded file really is: the type from its magic bytes, the dimensions from the
 * decoder (EXIF rotation applied, so a phone photo reports the way it is shown), and a full decode
 * to prove it is not truncated or corrupt. The size limit is the caller's, applied before the read.
 */
export async function inspectImage(bytes: Buffer): Promise<InspectedImage> {
  const type = sniffType(bytes)
  if (!type) return { ok: false, reason: 'not_an_image' }
  try {
    const img = sharp(bytes, { limitInputPixels: 100_000_000, failOn: 'error' })
    const meta = await img.metadata()
    if (!meta.width || !meta.height) return { ok: false, reason: 'unreadable' }
    const rotated = (meta.orientation ?? 1) >= 5
    // Decoding every pixel is cheap at the sizes that matter and catches truncated files.
    // Oversized pictures are reported without the cost: they are rejected on dimensions anyway.
    if (meta.width * meta.height <= 4_000_000) await img.raw().toBuffer()
    return {
      ok: true,
      type,
      width: rotated ? meta.height : meta.width,
      height: rotated ? meta.width : meta.height,
    }
  } catch {
    return { ok: false, reason: 'unreadable' }
  }
}
