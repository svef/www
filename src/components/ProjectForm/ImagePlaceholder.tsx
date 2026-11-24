import type { FieldDefinition } from '@/lib/awards/fields'
import type { ProjectFormCopy } from './copy'
import styles from './ProjectForm.module.scss'

const TYPE_NAMES: Record<string, string> = { 'image/png': 'PNG', 'image/jpeg': 'JPG' }

/**
 * The image section until the upload exists (it needs the private bucket): the
 * requirements from the field definition and a disabled control marked as coming.
 * Replace the body with the uploader; the section and field stay.
 */
export function ImagePlaceholder({
  field,
  idBase,
  copy,
  describedBy,
}: {
  field: FieldDefinition
  idBase: string
  copy: ProjectFormCopy
  describedBy?: string
}) {
  const rule = field.validation
  const note = `${idBase}-note`
  return (
    <div className={styles.imagePlaceholder} data-state="coming">
      {rule && (
        <p className={styles.hint}>
          {copy.imageRequirements(
            rule.width,
            rule.height,
            rule.types.map((t) => TYPE_NAMES[t] ?? t).join(' / '),
            Math.round(rule.maxBytes / 1_048_576),
          )}
        </p>
      )}
      <div className={styles.imageDrop}>
        <input
          id={idBase}
          type="file"
          disabled
          aria-describedby={[describedBy, note].filter(Boolean).join(' ')}
        />
        <span className={styles.badge}>{copy.imageComing}</span>
      </div>
      <p id={note} className={styles.hint}>
        {copy.imageNote}
      </p>
    </div>
  )
}
