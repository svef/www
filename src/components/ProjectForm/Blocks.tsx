'use client'

import { Fields, Step } from '@/components/FormParts/FormParts'
import { getField } from '@/lib/awards/fields'
import type { getProjectFormCopy } from './copy'
import styles from './ProjectForm.module.scss'
import { blockNum, type BlockDef } from './sections'

export type RenderField = (
  key: string,
  titled?: { controlId: string; titleId: string },
) => React.ReactNode

/**
 * The fields in a block, with consecutive short text fields paired in the FormParts two-column
 * grid (school and programme, say). `render` returns null for a field that isn't shown.
 */
export function BlockFields({
  keys,
  render,
}: {
  keys: readonly string[]
  render: (key: string) => React.ReactNode
}) {
  const runs: string[][] = []
  for (const k of keys) {
    const short = getField(k).type === 'short_text'
    const last = runs.at(-1)
    if (short && last && getField(last[0]).type === 'short_text') last.push(k)
    else runs.push([k])
  }
  return (
    <>
      {runs.map((run) =>
        run.length > 1 ? <Fields key={run[0]}>{run.map((k) => render(k))}</Fields> : render(run[0]),
      )}
    </>
  )
}

/** A generic step's numbered blocks; a block whose fields are all hidden is left out. */
export function Blocks({
  blocks,
  copy,
  renderProjectField,
}: {
  blocks: readonly BlockDef[]
  copy: ReturnType<typeof getProjectFormCopy>
  renderProjectField: RenderField
}) {
  const shown = blocks.filter((b) => b.fields.some((k) => renderProjectField(k) !== null))
  return (
    <>
      {shown.map((b, i) => {
        const titled = b.titled
          ? { controlId: `block-${b.id}-control`, titleId: `block-${b.id}-title` }
          : undefined
        // A group (a list of people, say) is named by the title; a single control is labelled by it.
        const group =
          b.titled &&
          ['person_list', 'url_list', 'access_credentials', 'date_range'].includes(
            getField(b.fields[0]).type,
          )
        return (
          <div key={b.id} data-block={b.id}>
            <Step
              num={blockNum(i + 1)}
              title={copy.blocks[b.id]}
              titleId={titled?.titleId}
              labelFor={titled && !group ? titled.controlId : undefined}
              optionalText={b.optional ? copy.optionalStep : undefined}
            >
              <div className={styles.blockBody}>
                <BlockFields
                  keys={b.fields}
                  render={(k) => renderProjectField(k, titled)}
                />
              </div>
            </Step>
          </div>
        )
      })}
    </>
  )
}
