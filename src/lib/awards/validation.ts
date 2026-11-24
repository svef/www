import { z } from 'zod'
import {
  ENTRY_FIELDS,
  FIELD_DEFINITIONS,
  PROJECT_FIELDS,
  type FieldDefinition,
} from './fields'
import { formatError } from './messages'
import type { Localized } from './types'
import { forcedValue, resolveAnswers } from './visibility'

export type ValidationMode = 'draft' | 'submit'

export type FieldError = {
  fieldKey: string
  /** Path inside the answers, e.g. ['owners', 0, 'email']. */
  path: (string | number)[]
  code: string
  message: Localized
}

export type ValidationResult =
  { ok: true; data: Record<string, unknown> } | { ok: false; errors: FieldError[] }

const URL_MAX = 2048

function blankToUndefined(v: unknown): unknown {
  if (v === null || v === undefined) return undefined
  if (typeof v === 'string' && v.trim() === '') return undefined
  if (Array.isArray(v) && v.length === 0) return undefined
  return v
}

const base = (iss: { input?: unknown }) =>
  iss.input === undefined ? 'required' : 'invalidType'

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value)
    return (u.protocol === 'http:' || u.protocol === 'https:') && u.hostname.includes('.')
  } catch {
    return false
  }
}

const isoDate = z.string({ error: base }).refine(
  (s) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
    const d = new Date(`${s}T00:00:00Z`)
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
  },
  { error: 'invalidDate' },
)

const text = (max: number | undefined) => {
  let s = z.string({ error: base }).trim()
  if (max !== undefined) s = s.max(max, { error: 'tooLong' })
  return s
}
const urlSchema = z
  .string({ error: base })
  .trim()
  .max(URL_MAX, { error: 'tooLong' })
  .refine(isHttpUrl, { error: 'invalidUrl' })
const emailSchema = z
  .string({ error: base })
  .trim()
  .max(254, { error: 'tooLong' })
  .pipe(z.email({ error: 'invalidEmail' }))

function personSchema(field: FieldDefinition, strict: boolean) {
  const shape: Record<string, z.ZodType> = {}
  for (const [name, item] of Object.entries(field.item ?? {})) {
    const inner = item.type === 'email' ? emailSchema : text(item.maxLength)
    // Collaborator email is optional in the JSON; canEdit makes it required (checked below).
    shape[name] = z.preprocess(
      blankToUndefined,
      strict && item.required ? inner : inner.optional(),
    )
  }
  shape.canEdit = z.boolean({ error: 'invalidType' }).optional()
  return z.object(shape).superRefine((person, ctx) => {
    const p = person as Record<string, unknown>
    if (p.canEdit === true && !p.email && field.item?.email) {
      ctx.addIssue({ code: 'custom', path: ['email'], message: 'emailRequiredForEditor' })
    }
  })
}

function valueSchema(field: FieldDefinition, strict: boolean): z.ZodType {
  switch (field.type) {
    case 'short_text':
    case 'long_text':
      return text(field.maxLength)
    case 'url':
      return urlSchema
    case 'url_list': {
      let a = z.array(urlSchema, { error: base })
      if (strict && field.minItems) a = a.min(field.minItems, { error: 'tooFewItems' })
      return a
    }
    case 'boolean': {
      const b = z.boolean({ error: base })
      return b
    }
    case 'waiver':
      return z.literal(true, {
        error: (iss) => (iss.input === undefined ? 'required' : 'mustAccept'),
      })
    case 'date_range':
      return z
        .object({ start: isoDate, end: isoDate }, { error: base })
        .refine((r) => r.start <= r.end, { path: ['end'], error: 'invalidDateRange' })
    case 'image':
      return z.object(
        { fileId: z.string({ error: base }).min(1, { error: 'required' }) },
        { error: base },
      )
    case 'access_credentials':
      // A list of credentials: a free-text value (account or instructions), optional label and notes.
      return z
        .array(
          z.object(
            {
              label: z.preprocess(blankToUndefined, text(120).optional()),
              value: text(2000).min(1, { error: 'required' }),
              notes: z.preprocess(blankToUndefined, text(2000).optional()),
            },
            { error: base },
          ),
          { error: base },
        )
        .min(strict ? 1 : 0, { error: 'required' })
    case 'person_list': {
      let a = z.array(personSchema(field, strict), { error: base })
      if (strict && field.minItems) a = a.min(field.minItems, { error: 'tooFewItems' })
      return a
    }
  }
}

function fieldSchema(
  field: FieldDefinition,
  mode: ValidationMode,
  forced: unknown,
  isForced: boolean,
): z.ZodType {
  const strict = mode === 'submit'
  let inner = valueSchema(field, strict)
  if (isForced) {
    const f = inner
    inner = f.refine((v) => v === forced, { error: 'forcedValue' })
  }
  // Blank = unset: required in submit mode, otherwise optional. Waivers and booleans are never "blank".
  const required = strict && field.required
  return z.preprocess(blankToUndefined, required ? inner : inner.optional())
}

function toErrors(error: z.ZodError, fields: readonly FieldDefinition[]): FieldError[] {
  return error.issues.map((issue) => {
    const path = issue.path.filter((p): p is string | number => typeof p !== 'symbol')
    const fieldKey = String(path[0] ?? '')
    const def = fields.find((f) => f.key === fieldKey)
    const params: Record<string, string | number> = {}
    if (def?.maxLength !== undefined)
      params.max =
        issue.code === 'too_big' && 'maximum' in issue
          ? Number(issue.maximum)
          : def.maxLength
    if (def?.minItems !== undefined) params.min = def.minItems
    const itemDef = def?.item?.[String(path[2] ?? '')]
    if (itemDef?.maxLength !== undefined) params.max = itemDef.maxLength
    const code = issue.message in KNOWN ? issue.message : 'invalid'
    return { fieldKey, path, code, message: formatError(code, params) }
  })
}

const KNOWN = {
  required: 1,
  invalid: 1,
  invalidType: 1,
  tooLong: 1,
  tooFewItems: 1,
  invalidUrl: 1,
  invalidEmail: 1,
  invalidDate: 1,
  invalidDateRange: 1,
  mustAccept: 1,
  forcedValue: 1,
  emailRequiredForEditor: 1,
}

function validate(
  fields: readonly FieldDefinition[],
  categories: readonly string[],
  answers: Readonly<Record<string, unknown>>,
  mode: ValidationMode,
  context: Readonly<Record<string, unknown>>,
): ValidationResult {
  // Visibility of `field` rules reads project answers; entry-scoped validation passes them as context.
  const resolved = resolveAnswers(fields, categories, { ...context, ...answers })
  const shape: Record<string, z.ZodType> = {}
  for (const field of resolved.visible) {
    // Forced is judged against the raw input: an explicit conflicting value is an error, not coerced.
    const f = forcedValue(field, { categories, answers: resolved.answers })
    shape[field.key] = fieldSchema(field, mode, f.forced ? f.value : undefined, f.forced)
  }
  const input: Record<string, unknown> = {}
  for (const field of resolved.visible) {
    // Absent forced/default values are filled by resolveAnswers; explicit input is kept for the check.
    const given = answers[field.key]
    input[field.key] = given === undefined ? resolved.answers[field.key] : given
  }
  const parsed = z.object(shape).safeParse(input)
  if (parsed.success) {
    const data: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(parsed.data)) if (v !== undefined) data[k] = v
    return { ok: true, data }
  }
  return { ok: false, errors: toErrors(parsed.error, fields) }
}

/**
 * Validates the project-level answers for a project entered in `categories`. Only visible fields
 * are validated or required; answers to hidden fields are dropped from `data`. `forced` values
 * (requiresLogin for Logged-In Platform) are applied when absent and rejected when contradicted.
 * mode 'draft' (autosave) checks formats and limits only; 'submit' also enforces required, minItems
 * and the person rules.
 */
export function validateProjectAnswers(
  categories: readonly string[],
  answers: Readonly<Record<string, unknown>>,
  mode: ValidationMode = 'submit',
): ValidationResult {
  return validate(PROJECT_FIELDS, categories, answers, mode, {})
}

/** Validates one entry's own answers (currently only the optional categoryPitch). */
export function validateEntryAnswers(
  categories: readonly string[],
  entryAnswers: Readonly<Record<string, unknown>>,
  mode: ValidationMode = 'submit',
): ValidationResult {
  return validate(ENTRY_FIELDS, categories, entryAnswers, mode, {})
}

// -------------------------------------------------------------------- Image

export type ImageMeta = { width: number; height: number; type: string; bytes: number }

/** Server-side check of an uploaded image against the `image` field's constraints. */
export function validateImageMeta(meta: ImageMeta): FieldError[] {
  const rule = FIELD_DEFINITIONS.find((f) => f.key === 'image')?.validation
  if (!rule) return []
  const mk = (code: string, params: Record<string, string | number>): FieldError => ({
    fieldKey: 'image',
    path: ['image'],
    code,
    message: formatError(code, params),
  })
  const errors: FieldError[] = []
  if (!rule.types.includes(meta.type)) errors.push(mk('imageType', {}))
  if (meta.width !== rule.width || meta.height !== rule.height) {
    errors.push(
      mk('imageDimensions', {
        actual: `${meta.width} × ${meta.height}`,
        expected: `${rule.width} × ${rule.height}`,
      }),
    )
  }
  if (meta.bytes > rule.maxBytes)
    errors.push(mk('imageSize', { max: Math.round(rule.maxBytes / 1_048_576) }))
  return errors
}
