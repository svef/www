import { getField } from '@/lib/awards/fields'
import { formatError } from '@/lib/awards/messages'
import { validateImageMeta } from '@/lib/awards/validation'

export type ImageProblem = { code: string; message: { is: string; en: string } }

/**
 * The instant, in-browser check of a chosen file, before anything is uploaded. It applies the
 * same rules as the server (`validateImageMeta`), so the message is the one the server would
 * give; the server still checks the real bytes. `size` is null when the browser could not
 * decode the file as an image at all.
 */
export function checkImageFile(
  file: { type: string; size: number },
  size: { width: number; height: number } | null,
): ImageProblem[] {
  const rule = getField('image').validation!
  if (size)
    return validateImageMeta({ ...size, type: file.type, bytes: file.size }).map(
      ({ code, message }) => ({ code, message }),
    )
  // Not decodable as an image: its dimensions are unknowable, so only the type (and size) can be said.
  const problems: ImageProblem[] = [{ code: 'imageType', message: formatError('imageType') }]
  if (file.size > rule.maxBytes)
    problems.push({
      code: 'imageSize',
      message: formatError('imageSize', { max: Math.round(rule.maxBytes / 1_048_576) }),
    })
  return problems
}

/** `2.4 MB`, `640 KB`. */
export function formatBytes(bytes: number, locale: 'is' | 'en'): string {
  const nf = new Intl.NumberFormat(locale === 'is' ? 'is-IS' : 'en-GB', { maximumFractionDigits: 1 })
  return bytes >= 1_048_576
    ? `${nf.format(bytes / 1_048_576)} MB`
    : `${nf.format(Math.max(1, bytes / 1024))} KB`
}

/** The image's dimensions as the browser shows it (EXIF rotation applied), or null if it cannot be decoded. */
export function readImageSize(file: Blob): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    const done = (v: { width: number; height: number } | null) => {
      URL.revokeObjectURL(url)
      resolve(v)
    }
    img.onload = () =>
      done(img.naturalWidth && img.naturalHeight ? { width: img.naturalWidth, height: img.naturalHeight } : null)
    img.onerror = () => done(null)
    img.src = url
  })
}

/** PUTs the file to the presigned URL, reporting progress (0-100). Resolves true on a 2xx. */
export function putFile(
  url: string,
  headers: Record<string, string>,
  file: Blob,
  onProgress: (percent: number) => void,
): Promise<boolean> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300)
    xhr.onerror = () => resolve(false)
    xhr.onabort = () => resolve(false)
    xhr.send(file)
  })
}
