'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ImageOutcome, UploadSlot } from '@/lib/awards/files/images'
import type { ProjectImage } from '@/lib/awards/files/types'
import type { ActionResult } from '@/lib/awards/projects/errors'
import type { FieldDefinition } from '@/lib/awards/fields'
import type { Locale } from '@/lib/i18n'
import type { ProjectFormCopy } from './copy'
import { checkImageFile, formatBytes, putFile, readImageSize } from './image-check'
import styles from './ProjectForm.module.scss'

/** The server calls the image section makes; bound to the project by the page. */
export type ImageActions = {
  request(file: { fileName: string; contentType: string; sizeBytes: number }): Promise<ActionResult<UploadSlot>>
  finalize(fileId: string): Promise<ActionResult<ImageOutcome>>
  remove(): Promise<ActionResult<null>>
  /** A signed URL for the current image (valid for a few minutes), or null. */
  preview(): Promise<ActionResult<string | null>>
}

export type ImageBinding = {
  actions: ImageActions
  image: ProjectImage | null
  onChange: (image: ProjectImage | null) => void
}

type Phase = 'idle' | 'checking' | 'uploading' | 'processing' | 'removing'

/**
 * The image section: the requirements, a drop zone and file picker, an instant check in the
 * browser, then upload straight to the private bucket with progress, and a server check of the
 * real file. The current image is shown through a short-lived signed URL (the bucket is private)
 * with replace and remove. Read-only (`disabled`) it only shows the image.
 */
export function ImageUpload({
  field,
  idBase,
  copy,
  locale,
  describedBy,
  disabled,
  binding,
}: {
  field: FieldDefinition
  idBase: string
  copy: ProjectFormCopy
  locale: Locale
  describedBy?: string
  disabled: boolean
  binding: ImageBinding
}) {
  const { actions, image, onChange } = binding
  const rule = field.validation
  const inputRef = useRef<HTMLInputElement>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [percent, setPercent] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [dragging, setDragging] = useState(false)
  const [url, setUrl] = useState<string | null>(null)
  const retried = useRef(false)
  const errorId = `${idBase}-error`
  const busy = phase !== 'idle'

  const imageId = image?.id
  const loadPreview = useCallback(async () => {
    if (!imageId) return setUrl(null)
    try {
      const r = await actions.preview()
      setUrl(r.ok ? r.value : null)
    } catch {
      setUrl(null)
    }
  }, [actions, imageId])
  useEffect(() => {
    retried.current = false
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetching an external signed URL
    void loadPreview()
  }, [loadPreview])

  const fail = (message: string) => {
    setError(message)
    setNotice('')
    setPhase('idle')
  }
  const messageOf = (e: Extract<ActionResult<unknown>, { ok: false }>['error']) =>
    e.fieldErrors?.[0]?.message[locale] ??
    (e.code === 'lock_required' || e.code === 'intake_closed' ? e.message : copy.imageFailed)

  async function handleFile(file: File) {
    setError(null)
    setNotice('')
    setPhase('checking')
    setNotice(copy.imageChecking)
    // Instant feedback: type, size and dimensions are checked here before a byte is uploaded.
    const size = await readImageSize(file)
    const problems = checkImageFile(file, size)
    if (problems.length) return fail(problems.map((p) => p.message[locale]).join(' '))

    const slot = await actions.request({
      fileName: file.name,
      contentType: file.type,
      sizeBytes: file.size,
    })
    if (!slot.ok) return fail(messageOf(slot.error))

    setPhase('uploading')
    setPercent(0)
    setNotice(copy.imageUploading(0))
    const sent = await putFile(slot.value.url, slot.value.headers, file, (p) => {
      setPercent(p)
      setNotice(copy.imageUploading(p))
    })
    if (!sent) return fail(copy.imageFailed)

    setPhase('processing')
    setNotice(copy.imageProcessing)
    const done = await actions.finalize(slot.value.fileId)
    if (!done.ok) return fail(messageOf(done.error))
    if (done.value.status === 'rejected')
      return fail(done.value.errors.map((e) => e.message[locale]).join(' '))
    onChange(done.value.image)
    setPhase('idle')
    setNotice(copy.imageAdded)
  }

  async function handleRemove() {
    setError(null)
    setPhase('removing')
    const r = await actions.remove()
    if (!r.ok) return fail(messageOf(r.error))
    onChange(null)
    setUrl(null)
    setPhase('idle')
    setNotice(copy.imageRemoved)
  }

  const pick = (files: FileList | null) => {
    const file = files?.[0]
    if (file) void handleFile(file)
    if (inputRef.current) inputRef.current.value = ''
  }

  const described = [describedBy, error ? errorId : null].filter(Boolean).join(' ') || undefined

  return (
    <div className={styles.imageField} data-phase={phase} data-has-image={image ? '' : undefined}>
      {image ? (
        <figure className={styles.imagePreview} data-testid="image-preview">
          <div className={styles.imageFrame}>
            {url ? (
              // The bucket is private and the URL signed, so next/image's optimiser cannot fetch it.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={url}
                alt={copy.imageAlt}
                width={rule?.width}
                height={rule?.height}
                onError={() => {
                  // A signed URL lapses after a few minutes: fetch a fresh one once.
                  if (!retried.current) {
                    retried.current = true
                    void loadPreview()
                  }
                }}
              />
            ) : (
              <span className={styles.imageSkeleton} aria-hidden="true" />
            )}
          </div>
          <figcaption className={styles.hint}>
            {copy.imageFile(image.fileName, formatBytes(image.sizeBytes, locale))}
          </figcaption>
        </figure>
      ) : (
        disabled && <p className={styles.hint}>{copy.imageNone}</p>
      )}

      <div
        className={styles.imageDrop}
        data-dragging={dragging ? '' : undefined}
        data-disabled={disabled ? '' : undefined}
        onDragOver={(e) => {
          if (disabled || busy) return
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          setDragging(false)
          if (disabled || busy) return
          e.preventDefault()
          pick(e.dataTransfer.files)
        }}
      >
        {!image && !disabled && <span>{copy.imageDrop}</span>}
        <input
          ref={inputRef}
          type="file"
          hidden
          accept={rule?.types.join(',')}
          data-testid="image-input"
          onChange={(e) => pick(e.target.files)}
        />
        <button
          id={idBase}
          type="button"
          className={styles.small}
          disabled={disabled || busy}
          // The field's <label for> would otherwise replace the button's own text as its name.
          aria-label={image ? copy.imageReplace : copy.imageChoose}
          aria-describedby={described}
          onClick={() => inputRef.current?.click()}
        >
          {image ? copy.imageReplace : copy.imageChoose}
        </button>
        {image && !disabled && (
          <button
            type="button"
            className={styles.small}
            disabled={busy}
            onClick={() => void handleRemove()}
          >
            {copy.imageRemove}
          </button>
        )}
      </div>

      {phase === 'uploading' && (
        <progress
          className={styles.imageProgress}
          max={100}
          value={percent}
          aria-label={copy.imageUploading(percent)}
        />
      )}
      <p className={styles.hint} role="status" aria-live="polite" data-testid="image-status">
        {notice}
      </p>
      {error && (
        <p id={errorId} className={styles.error} role="alert" data-testid="image-error">
          {error}
        </p>
      )}
    </div>
  )
}
