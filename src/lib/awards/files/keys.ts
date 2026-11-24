import { randomUUID } from 'node:crypto'

const EXTENSIONS: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg' }

/** The file extension stored for a content type, or null when the type is not accepted. */
export function extensionFor(contentType: string): string | null {
  return EXTENSIONS[contentType] ?? null
}

/**
 * The object key for a new upload: `awards/<edition year>/<project id>/<uuid>.<ext>`. The name
 * the entrant chose never reaches the bucket (it is kept in `entry_file.file_name`), so the key
 * is unguessable, collision-free and free of anything user-controlled.
 */
export function newObjectKey(args: {
  editionYear: number
  projectId: string
  contentType: string
  uuid?: string
}): string {
  const ext = extensionFor(args.contentType)
  if (!ext) throw new Error(`No extension for ${args.contentType}`)
  return `awards/${args.editionYear}/${args.projectId}/${args.uuid ?? randomUUID()}.${ext}`
}

/** A file name safe to store and show: no path, no control characters, at most 200 characters. */
export function cleanFileName(raw: string): string {
  const base = raw.split(/[\\/]/).pop() ?? ''
  const cleaned = base.replace(/[\u0000-\u001f\u007f]/g, '').trim()
  const name = cleaned.length > 200 ? cleaned.slice(-200) : cleaned
  return name || 'image'
}
